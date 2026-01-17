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

  // HARDCODED API KEY - REPLACE WITH YOUR KEY
  const GEMINI_API_KEY = '';

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
                  text: `Create a step-by-step explanation for: "${topic}" using Mermaid flowchart diagrams with VISUAL EMOJIS.

CRITICAL: Add relevant emojis to EVERY node label to make it visual and engaging!

EMOJI GUIDE (use these or similar):
- 💻 CPU, Processor, Computer
- 🎮 GPU, Graphics Card
- 💾 Memory, RAM, Storage
- 🗄️ Database, Data Store
- 🌐 Network, Internet, Web
- 👤 User, Person, Client
- 🖥️ Server, Host, Machine
- ⚙️ Process, Operation, Task
- 📡 Router, Gateway, Connection
- 🔐 Security, Encryption, Lock
- 📤 Upload, Send, Output
- 📥 Download, Receive, Input
- 🔄 Cycle, Loop, Refresh
- ✅ Success, Complete, Done
- ❌ Error, Fail, Stop
- 🚀 Start, Launch, Begin
- 🎯 Target, Goal, Result
- 📊 Data, Information, Stats
- 🔍 Search, Query, Find
- ⚡ Fast, Speed, Performance
- 🧠 Intelligence, AI, Brain
- 📝 Write, Edit, Document
- 📖 Read, View, Display
- 🔗 Link, Connect, Join
- 📦 Package, Bundle, Container
- 🛠️ Tool, Utility, Fix
- 🌍 Global, World, Universal
- 📱 Mobile, Phone, Device
- 🖼️ Image, Picture, Graphics
- 🎵 Audio, Sound, Music
- 🎬 Video, Media, Film
- 📂 Folder, Directory, Files
- 🔑 Key, Access, Auth
- ⏱️ Time, Clock, Duration
- 📈 Growth, Increase, Up
- 📉 Decrease, Down, Fall

Return ONLY this JSON (no markdown, no extra text):

{
  "title": "Understanding ${topic}",
  "description": "A visual guide to ${topic}",
  "steps": [
    {
      "id": 1,
      "title": "Step Title",
      "description": "Clear explanation",
      "mermaidCode": "graph TD
    A[🚀 Start] --> B[⚙️ Process]
    B --> C[✅ Complete]"
    }
  ],
  "conclusion": "Summary"
}

CRITICAL MERMAID SYNTAX RULES:
1. Use "graph TD" or "graph LR" ONLY - no other graph types
2. Node IDs must be simple letters: A, B, C, D, E, F, G (no numbers, no special chars)
3. Node labels in square brackets: A[🎮 GPU Core]
4. Arrows must be simple: --> or ---
5. NO parentheses, NO circles, NO special shapes - ONLY square brackets []
6. NO quotes, NO apostrophes anywhere in the mermaid code
7. Keep labels SHORT: 2-4 words maximum including emoji
8. Each diagram should have 4-6 nodes maximum
9. NO special characters except emojis in labels
10. NO line breaks inside node labels

VALID EXAMPLE:
graph TD
    A[🚀 Start Process] --> B[⚙️ Run Task]
    B --> C[📊 Check Data]
    C --> D[✅ Finish]

INVALID EXAMPLES (DO NOT USE):
- A((Start)) - NO circles
- A(Start) - NO parentheses  
- A[It's working] - NO apostrophes
- A["Text"] - NO quotes
- A1[Start] - NO numbers in IDs
- A --> |label| B - NO edge labels

Create 5-6 progressive steps that build understanding.`,
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to generate animation');
    }

    let animationScript = data.candidates[0].content.parts[0].text;

    console.log('=== RAW RESPONSE ===');
    console.log(animationScript);

    // Clean JSON wrapper
    animationScript = animationScript.trim();
    animationScript = animationScript.replace(/```json/gi, '');
    animationScript = animationScript.replace(/```/g, '');
    
    const firstBrace = animationScript.indexOf('{');
    if (firstBrace > 0) {
      animationScript = animationScript.substring(firstBrace);
    }
    
    const lastBrace = animationScript.lastIndexOf('}');
    if (lastBrace !== -1) {
      animationScript = animationScript.substring(0, lastBrace + 1);
    }
    
    animationScript = animationScript.replace(/,(\s*[}\]])/g, '$1');
    animationScript = animationScript.replace(/[\x00-\x1F\x7F]/g, '');

    console.log('=== CLEANED JSON ===');
    console.log(animationScript);

    let animationData;
    try {
      animationData = JSON.parse(animationScript);
    } catch (parseError: any) {
      const fixedScript = animationScript.replace(/'/g, '');
      try {
        animationData = JSON.parse(fixedScript);
      } catch (secondError) {
        throw new Error(`Invalid JSON: ${parseError.message}`);
      }
    }

    if (!animationData.title || !animationData.steps || !Array.isArray(animationData.steps)) {
      throw new Error('Invalid structure');
    }

    // CRITICAL: Sanitize and validate ALL mermaid code
    animationData.steps = animationData.steps.map((step: any, index: number) => {
      let mermaidCode = step.mermaidCode || '';
      
      console.log(`=== ORIGINAL MERMAID STEP ${index + 1} ===`);
      console.log(mermaidCode);
      
      // Remove all apostrophes and quotes from mermaid code
      mermaidCode = mermaidCode.replace(/['"''""`]/g, '');
      
      // Remove any parentheses-based node definitions and replace with square brackets
      mermaidCode = mermaidCode.replace(/([A-Z])\(([^)]+)\)/g, (match: any, id: any, label: any) => {
        return `${id}[${label}]`;
      });
      
      // Remove any circle definitions
      mermaidCode = mermaidCode.replace(/([A-Z])\(\(([^)]+)\)\)/g, (_match: any, id: any, label: any) => {
        return `${id}[${label}]`;
      });
      
      // Replace complex arrows with simple ones
      mermaidCode = mermaidCode.replace(/--\|[^|]+\|-->/g, '-->');
      mermaidCode = mermaidCode.replace(/==>/g, '-->');
      mermaidCode = mermaidCode.replace(/\.->/g, '-->');
      mermaidCode = mermaidCode.replace(/--->/g, '-->');
      
      // Remove any edge labels
      mermaidCode = mermaidCode.replace(/--\s*\|[^|]+\|\s*-->/g, '-->');
      
      // Ensure it starts with graph TD or graph LR
      if (!mermaidCode.trim().startsWith('graph ')) {
        mermaidCode = 'graph TD\n' + mermaidCode;
      }
      
      // Remove any special Mermaid syntax we don't support
      mermaidCode = mermaidCode.replace(/:::.*$/gm, ''); // Remove classes
      mermaidCode = mermaidCode.replace(/style\s+.*/gi, ''); // Remove style definitions
      mermaidCode = mermaidCode.replace(/classDef\s+.*/gi, ''); // Remove class definitions
      
      // Clean up excessive whitespace but preserve structure
      mermaidCode = mermaidCode.split('\n')
        .map((line: string) => line.trim())
        .filter((line: string | any[]) => line.length > 0)
        .join('\n    ');
      
      console.log(`=== SANITIZED MERMAID STEP ${index + 1} ===`);
      console.log(mermaidCode);
      
      return {
        ...step,
        mermaidCode: mermaidCode
      };
    });

    res.status(200).json({ animationData });
  } catch (error: any) {
    console.error('Error:', error.message);
    res.status(500).json({ 
      error: error.message || 'Failed to generate animation'
    });
  }
}