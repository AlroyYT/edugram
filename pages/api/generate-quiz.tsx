// pages/api/generate-quiz.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NextApiRequest, NextApiResponse } from 'next';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      You are an expert educational psychologist. Generate 10 unique, scenario-based multiple-choice questions to determine a person's learning style based on the VARK model (Visual, Auditory, Kinesthetic, Reading/Writing).
      
      The scenarios should be everyday life situations (e.g., assembling furniture, asking for directions, learning a new game, planning a trip). Dont follow these examples always make your own questions as well 
      
      IMPORTANT: Return ONLY a raw JSON array. Do not use Markdown formatting like \`\`\`json. Do not include any intro text.
      
      The JSON structure must strictly follow this TypeScript interface:
      [
        {
          "id": number,
          "question": "string",
          "options": [
            { "text": "string", "style": "visual" | "auditory" | "kinesthetic" | "readingWriting" }
          ]
        }
      ]
      
      Ensure every question has exactly 4 options, one for each style. Randomize the order of the options.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up if the AI accidentally adds markdown code blocks
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    const quizData = JSON.parse(text);

    res.status(200).json(quizData);
  } catch (error) {
    console.error('Gemini API Error:', error);
    // Fallback static data in case API fails or quota exceeded
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
}