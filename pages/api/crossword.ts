import { NextApiRequest, NextApiResponse } from "next";

interface CrosswordWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: "across" | "down";
  number: number;
}

interface PlacedWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: "across" | "down";
  number: number;
}

const GRID_SIZE = 20;

function createEmptyGrid(): string[][] {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(""));
}

function canPlace(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  direction: "across" | "down"
): boolean {
  if (direction === "across") {
    if (col + word.length > GRID_SIZE) return false;
    if (col > 0 && grid[row][col - 1] !== "") return false;
    if (col + word.length < GRID_SIZE && grid[row][col + word.length] !== "") return false;
    for (let i = 0; i < word.length; i++) {
      const cell = grid[row][col + i];
      if (cell !== "" && cell !== word[i]) return false;
      if (cell === "") {
        if (row > 0 && grid[row - 1][col + i] !== "" && 
            (i === 0 || grid[row][col + i - 1] === "") && 
            (i === word.length - 1 || grid[row][col + i + 1] === "")) {
          return false;
        }
        if (row < GRID_SIZE - 1 && grid[row + 1][col + i] !== "" &&
            (i === 0 || grid[row][col + i - 1] === "") && 
            (i === word.length - 1 || grid[row][col + i + 1] === "")) {
          return false;
        }
      }
    }
  } else {
    if (row + word.length > GRID_SIZE) return false;
    if (row > 0 && grid[row - 1][col] !== "") return false;
    if (row + word.length < GRID_SIZE && grid[row + word.length][col] !== "") return false;
    for (let i = 0; i < word.length; i++) {
      const cell = grid[row + i][col];
      if (cell !== "" && cell !== word[i]) return false;
      if (cell === "") {
        if (col > 0 && grid[row + i][col - 1] !== "" &&
            (i === 0 || grid[row + i - 1][col] === "") && 
            (i === word.length - 1 || grid[row + i + 1][col] === "")) {
          return false;
        }
        if (col < GRID_SIZE - 1 && grid[row + i][col + 1] !== "" &&
            (i === 0 || grid[row + i - 1][col] === "") && 
            (i === word.length - 1 || grid[row + i + 1][col] === "")) {
          return false;
        }
      }
    }
  }
  return true;
}

function placeWord(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  direction: "across" | "down"
): string[][] {
  const newGrid = grid.map((r) => [...r]);
  for (let i = 0; i < word.length; i++) {
    if (direction === "across") newGrid[row][col + i] = word[i];
    else newGrid[row + i][col] = word[i];
  }
  return newGrid;
}

function buildCrossword(words: { word: string; clue: string }[]): PlacedWord[] {
  const clean = words
    .map((w) => ({ ...w, word: w.word.toUpperCase().replace(/[^A-Z0-9]/g, "") }))
    .filter((w) => w.word.length >= 2 && w.word.length <= 15)
    .slice(0, 15);

  let grid = createEmptyGrid();
  const placed: PlacedWord[] = [];
  let wordNumber = 1;

  // Place first word in center
  const first = clean[0];
  if (!first) return [];
  
  const startRow = Math.floor(GRID_SIZE / 2);
  const startCol = Math.floor((GRID_SIZE - first.word.length) / 2);
  grid = placeWord(grid, first.word, startRow, startCol, "across");
  placed.push({ ...first, row: startRow, col: startCol, direction: "across", number: wordNumber++ });

  for (let wi = 1; wi < clean.length; wi++) {
    const { word, clue } = clean[wi];
    let bestRow = -1,
      bestCol = -1,
      bestDir: "across" | "down" = "across";
    let placed_flag = false;

    // Try to intersect with already-placed words
    for (const pw of placed) {
      for (let pi = 0; pi < pw.word.length && !placed_flag; pi++) {
        const ch = pw.word[pi];
        for (let wi2 = 0; wi2 < word.length && !placed_flag; wi2++) {
          if (word[wi2] !== ch) continue;
          const dir: "across" | "down" = pw.direction === "across" ? "down" : "across";
          let row, col;
          if (pw.direction === "across") {
            col = pw.col + pi;
            row = pw.row - wi2;
          } else {
            row = pw.row + pi;
            col = pw.col - wi2;
          }
          if (row < 0 || col < 0) continue;
          if (canPlace(grid, word, row, col, dir)) {
            bestRow = row;
            bestCol = col;
            bestDir = dir;
            placed_flag = true;
            break;
          }
        }
      }
    }

    if (placed_flag) {
      grid = placeWord(grid, word, bestRow, bestCol, bestDir);
      placed.push({ word, clue, row: bestRow, col: bestCol, direction: bestDir, number: wordNumber++ });
    }
  }

  return placed;
}

// Fallback crosswords if API fails
const getFallbackCrosswords = (topic: string): { word: string; clue: string }[] => {
  const genericCrosswords = [
    { word: "COMPUTER", clue: "Electronic device for processing data" },
    { word: "INTERNET", clue: "Global network connecting millions of computers" },
    { word: "SOFTWARE", clue: "Programs and operating systems used by computers" },
    { word: "HARDWARE", clue: "Physical components of a computer system" },
    { word: "DATABASE", clue: "Organized collection of structured information" },
    { word: "NETWORK", clue: "Group of interconnected computers" },
    { word: "SECURITY", clue: "Protection from unauthorized access" },
    { word: "CLOUD", clue: "Remote servers for data storage and computing" },
    { word: "ALGORITHM", clue: "Step-by-step procedure for solving a problem" },
    { word: "PROGRAMMING", clue: "Process of writing computer code" }
  ];
  return genericCrosswords;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Topic required" });
    }

    const apiKey = process.env.MY_GEMINI_API_KEY;
    if (!apiKey) {
      console.error("MY_GEMINI_API_KEY not set");
      return res.status(500).json({ error: "API key not configured" });
    }

    const prompt = `Generate exactly 15 crossword clues for the topic: "${topic}".
Rules:
- Mix short words (3-8 letters) and longer ones (9-14 letters)
- Include 2-3 numerical answers (years, numbers, quantities) written as digits e.g. "1969"
- Answers must be single words or numbers only (no spaces)
- Make clues educational and interesting
- Return ONLY valid JSON array, no markdown, no explanation, no extra text:

[
  {"word": "KERNEL", "clue": "Core component that manages system resources"},
  {"word": "1969", "clue": "Year UNIX was first developed"},
  {"word": "PYTHON", "clue": "Popular programming language named after a snake"},
  {"word": "JAVA", "clue": "Programming language with a coffee cup logo"},
  {"word": "LINUX", "clue": "Open source operating system with penguin mascot"}
]

Return ONLY the JSON array. Do not include any other text, markdown formatting, or explanations.`;

    console.log("Calling Gemini API with topic:", topic);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          contents: [{ 
            parts: [{ text: prompt }] 
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
          }
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error response:", errorText);
      throw new Error(`Gemini API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Gemini API response received");
    
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("Raw response from Gemini:", raw.substring(0, 500));
    
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON array found in response. Full response:", raw);
      
      // Try fallback
      console.log("Using fallback crossword data");
      const fallbackWords = getFallbackCrosswords(topic);
      const placed = buildCrossword(fallbackWords);
      
      if (placed.length === 0) {
        throw new Error("Could not build crossword with fallback data");
      }
      
      let grid = createEmptyGrid();
      for (const pw of placed) {
        grid = placeWord(grid, pw.word, pw.row, pw.col, pw.direction);
      }
      
      let minR = GRID_SIZE, maxR = 0, minC = GRID_SIZE, maxC = 0;
      for (const pw of placed) {
        minR = Math.min(minR, pw.row);
        maxR = Math.max(maxR, pw.direction === "down" ? pw.row + pw.word.length - 1 : pw.row);
        minC = Math.min(minC, pw.col);
        maxC = Math.max(maxC, pw.direction === "across" ? pw.col + pw.word.length - 1 : pw.col);
      }
      
      const croppedGrid = grid.slice(minR, maxR + 1).map((r) => r.slice(minC, maxC + 1));
      const adjustedWords = placed.map((pw) => ({
        ...pw,
        row: pw.row - minR,
        col: pw.col - minC,
      }));
      
      return res.status(200).json({ grid: croppedGrid, words: adjustedWords, topic, fallback: true });
    }

    let wordsRaw: { word: string; clue: string }[];
    try {
      wordsRaw = JSON.parse(jsonMatch[0]);
      console.log(`Successfully parsed ${wordsRaw.length} words from Gemini`);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Raw JSON string:", jsonMatch[0]);
      throw new Error("Failed to parse JSON from Gemini response");
    }

    if (!wordsRaw || wordsRaw.length === 0) {
      throw new Error("No words received from Gemini");
    }

    const placed = buildCrossword(wordsRaw);

    if (placed.length === 0) {
      throw new Error("Could not place any words in crossword");
    }

    // Build compact grid for frontend
    let grid = createEmptyGrid();
    for (const pw of placed) {
      grid = placeWord(grid, pw.word, pw.row, pw.col, pw.direction);
    }

    // Find bounding box
    let minR = GRID_SIZE, maxR = 0, minC = GRID_SIZE, maxC = 0;
    for (const pw of placed) {
      minR = Math.min(minR, pw.row);
      maxR = Math.max(maxR, pw.direction === "down" ? pw.row + pw.word.length - 1 : pw.row);
      minC = Math.min(minC, pw.col);
      maxC = Math.max(maxC, pw.direction === "across" ? pw.col + pw.word.length - 1 : pw.col);
    }

    // Crop grid
    const croppedGrid = grid.slice(minR, maxR + 1).map((r) => r.slice(minC, maxC + 1));
    const adjustedWords = placed.map((pw) => ({
      ...pw,
      row: pw.row - minR,
      col: pw.col - minC,
    }));

    return res.status(200).json({ grid: croppedGrid, words: adjustedWords, topic });
  } catch (err) {
    console.error("API Error:", err);
    return res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
  }
}