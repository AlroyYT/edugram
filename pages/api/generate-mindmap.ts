import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { topic } = req.body;

  if (!topic) {
    return res.status(400).json({ error: 'Topic is required' });
  }

  // IMPORTANT: Replace this with your NEW API key (revoke the old one!)
  const GEMINI_API_KEY = 'AIzaSyBGwtThxkgqtAY7jJZmmXTKnrCO4KQ-afE';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Create a Mermaid mindmap diagram for the topic: "${topic}"

CRITICAL INSTRUCTIONS:
1. Return ONLY the Mermaid mindmap code
2. NO markdown code blocks (no \`\`\`mermaid)
3. NO explanations or extra text
4. Start directly with "mindmap"

FORMAT:
mindmap
  root((Central Topic))
    Main Branch 1
      Subtopic 1a
      Subtopic 1b
      Subtopic 1c
    Main Branch 2
      Subtopic 2a
      Subtopic 2b
    Main Branch 3
      Subtopic 3a
      Subtopic 3b
      Subtopic 3c

RULES:
- Use exactly 2 spaces for indentation
- Root node: ((text)) with double parentheses
- 4-6 main branches
- 2-4 subtopics per branch
- Keep text concise (1-4 words)
- No special characters except spaces and parentheses
- Make it comprehensive and educational

Example for "Machine Learning":
mindmap
  root((Machine Learning))
    Supervised Learning
      Classification
      Regression
      Decision Trees
    Unsupervised Learning
      Clustering
      Dimensionality Reduction
    Deep Learning
      Neural Networks
      CNNs
      RNNs
    Applications
      Computer Vision
      NLP
      Recommendation Systems

Now create one for: "${topic}"`,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to generate mindmap');
    }

    let mermaidCode = data.candidates[0].content.parts[0].text;

    // AGGRESSIVE CLEANING
    mermaidCode = mermaidCode.trim();
    
    // Remove markdown code blocks
    mermaidCode = mermaidCode.replace(/```mermaid\n?/gi, '');
    mermaidCode = mermaidCode.replace(/```\n?/g, '');
    
    // Remove any leading/trailing whitespace
    mermaidCode = mermaidCode.trim();
    
    // Ensure it starts with "mindmap"
    if (!mermaidCode.toLowerCase().startsWith('mindmap')) {
      throw new Error('Invalid mindmap format received from AI');
    }

    console.log('Generated Mermaid Code:', mermaidCode);

    res.status(200).json({ mermaidCode });
  } catch (error: any) {
    console.error('Error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to generate mindmap'
    });
  }
}