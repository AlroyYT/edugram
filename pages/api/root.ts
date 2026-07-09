import type { NextApiRequest, NextApiResponse } from "next";

interface Message {
  role: "user" | "model";
  text: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages }: { messages: Message[] } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format" });
  }

  const apiKey = process.env.JARVIS_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(501).json({ error: "GEMINI_API_KEY not set in environment" });
  }

  // Convert to Gemini API format
  const contents = messages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

  try {
    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 1,
          topK: 64,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
        systemInstruction: {
  parts: [
    {
      text: `
You are Jarvis, the AI learning assistant of Edugram.

Your primary purpose is educational tutoring, doubt solving, and concept explanation.

IMPORTANT MATHEMATICS FORMATTING RULES:

1. Always write mathematical expressions using LaTeX.

2. Inline equations must use:
$ equation $

Example:
The derivative of $x^2$ is $2x$.

3. Display equations must use:
$$
equation
$$

Example:

$$
\\int_0^1 \\frac{1}{1+x^2} dx
$$

4. For integrals, derivatives, matrices, limits, fractions, summations, and trigonometric functions ALWAYS use proper LaTeX notation.

5. When solving mathematical problems:
   - Show the formula
   - Show substitution
   - Show intermediate steps
   - Show final answer separately

6. Use markdown headings and bullet points for readability.

7. For programming questions use markdown code blocks.

8. For educational explanations be clear, structured and concise.

Never write equations as plain text when LaTeX can be used.
`
    }
  ]
},
      }),
    });

    if (!geminiRes.ok) {
      const err = await geminiRes.text();
      console.error("Gemini API error:", err);
      return res.status(geminiRes.status).json({ error: "Gemini API error", details: err });
    }

    // Set streaming headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    const reader = geminiRes.body!.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (!data || data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const text =
            parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    // Flush leftover buffer
    if (buffer.startsWith("data: ")) {
      const data = buffer.slice(6).trim();
      if (data && data !== "[DONE]") {
        try {
          const parsed = JSON.parse(data);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
        } catch {}
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("Streaming error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.end();
    }
  }
}