"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface CrosswordWord {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: "across" | "down";
  number: number;
}

interface CellData {
  letter: string;
  number?: number;
  wordIndices: number[];
  isBlack: boolean;
}

export default function CrosswordPage() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rawGrid, setRawGrid] = useState<string[][]>([]);
  const [words, setWords] = useState<CrosswordWord[]>([]);
  const [userInput, setUserInput] = useState<string[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [selectedDir, setSelectedDir] = useState<"across" | "down">("across");
  const [selectedWordIdx, setSelectedWordIdx] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [solved, setSolved] = useState(false);
  const [activeClueTab, setActiveClueTab] = useState<"across" | "down">("across");
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);
  const clueRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  const buildGrid = (): CellData[][] => {
    if (rawGrid.length === 0) return [];
    
    return rawGrid.map((row, r) =>
      row.map((letter, c) => {
        const isBlack = letter === "";
        const wordIndices: number[] = [];
        words.forEach((w, wi) => {
          if (w.direction === "across") {
            if (w.row === r && c >= w.col && c < w.col + w.word.length) wordIndices.push(wi);
          } else {
            if (w.col === c && r >= w.row && r < w.row + w.word.length) wordIndices.push(wi);
          }
        });
        const numWord = words.find((w) => w.row === r && w.col === c);
        return { letter, number: numWord?.number, wordIndices, isBlack };
      })
    );
  };

  const grid = buildGrid();

  const getWordIdxForCell = useCallback(
    (r: number, c: number, dir: "across" | "down") => {
      if (!grid[r]?.[c]) return null;
      const idx = grid[r][c].wordIndices.find((wi) => words[wi]?.direction === dir);
      return idx ?? null;
    },
    [grid, words]
  );

  useEffect(() => {
    if (!selectedCell) return;
    const idx = getWordIdxForCell(selectedCell.r, selectedCell.c, selectedDir);
    setSelectedWordIdx(idx ?? null);
  }, [selectedCell, selectedDir, getWordIdxForCell]);

  useEffect(() => {
    if (selectedWordIdx !== null && clueRefs.current[selectedWordIdx]) {
      clueRefs.current[selectedWordIdx]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedWordIdx]);

  const generate = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic");
      return;
    }
    
    setLoading(true);
    setError("");
    setRevealed(false);
    setSolved(false);
    setSelectedCell(null);
    setSelectedWordIdx(null);
    
    try {
      const response = await fetch("/api/crossword", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (!data.grid || !data.words) {
        throw new Error("Invalid response format from server");
      }
      
      setRawGrid(data.grid);
      setWords(data.words);
      setUserInput(data.grid.map((row: string[]) => row.map(() => "")));
      inputRefs.current = data.grid.map(() => []);
      
    } catch (err) {
      console.error("Generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate crossword");
    } finally {
      setLoading(false);
    }
  };

  const handleCellClick = (r: number, c: number) => {
    if (!grid[r]?.[c] || grid[r][c].isBlack) return;
    
    if (selectedCell?.r === r && selectedCell?.c === c) {
      const newDir = selectedDir === "across" ? "down" : "across";
      setSelectedDir(newDir);
    } else {
      setSelectedCell({ r, c });
      const cell = grid[r][c];
      const hasAcross = cell.wordIndices.some((wi) => words[wi]?.direction === "across");
      const hasDown = cell.wordIndices.some((wi) => words[wi]?.direction === "down");
      if (!hasAcross && hasDown) setSelectedDir("down");
      else if (hasAcross && !hasDown) setSelectedDir("across");
      else setSelectedDir("across");
    }
  };

  const moveNext = (r: number, c: number, dir: "across" | "down") => {
    const nr = dir === "down" ? r + 1 : r;
    const nc = dir === "across" ? c + 1 : c;
    if (grid[nr]?.[nc] && !grid[nr][nc].isBlack) {
      setSelectedCell({ r: nr, c: nc });
      setTimeout(() => inputRefs.current[nr]?.[nc]?.focus(), 0);
    }
  };

  const movePrev = (r: number, c: number, dir: "across" | "down") => {
    const nr = dir === "down" ? r - 1 : r;
    const nc = dir === "across" ? c - 1 : c;
    if (nr >= 0 && nc >= 0 && grid[nr]?.[nc] && !grid[nr][nc].isBlack) {
      setSelectedCell({ r: nr, c: nc });
      setTimeout(() => inputRefs.current[nr]?.[nc]?.focus(), 0);
    }
  };

  const handleKey = (e: React.KeyboardEvent, r: number, c: number) => {
    const rows = rawGrid.length;
    const cols = rawGrid[0]?.length ?? 0;
    
    if (e.key === "ArrowRight") { 
      e.preventDefault(); 
      setSelectedDir("across"); 
      if (c + 1 < cols && grid[r]?.[c + 1] && !grid[r][c + 1].isBlack) 
        setSelectedCell({ r, c: c + 1 }); 
    }
    if (e.key === "ArrowLeft") { 
      e.preventDefault(); 
      setSelectedDir("across"); 
      if (c - 1 >= 0 && grid[r]?.[c - 1] && !grid[r][c - 1].isBlack) 
        setSelectedCell({ r, c: c - 1 }); 
    }
    if (e.key === "ArrowDown") { 
      e.preventDefault(); 
      setSelectedDir("down"); 
      if (r + 1 < rows && grid[r + 1]?.[c] && !grid[r + 1][c].isBlack) 
        setSelectedCell({ r: r + 1, c }); 
    }
    if (e.key === "ArrowUp") { 
      e.preventDefault(); 
      setSelectedDir("down"); 
      if (r - 1 >= 0 && grid[r - 1]?.[c] && !grid[r - 1][c].isBlack) 
        setSelectedCell({ r: r - 1, c }); 
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      if (userInput[r]?.[c]) {
        const u = userInput.map((row) => [...row]);
        u[r][c] = "";
        setUserInput(u);
      } else {
        movePrev(r, c, selectedDir);
      }
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>, r: number, c: number) => {
    const val = e.target.value.slice(-1).toUpperCase();
    if (val !== "" && !/^[A-Z0-9]$/.test(val)) return;
    
    const u = userInput.map((row) => [...row]);
    u[r][c] = val;
    setUserInput(u);
    
    if (val) moveNext(r, c, selectedDir);
    
    const allCorrect = rawGrid.every((row, ri) =>
      row.every((cell, ci) => cell === "" || u[ri][ci] === cell)
    );
    if (allCorrect && rawGrid.length > 0) setSolved(true);
  };

  const reveal = () => {
    setUserInput(rawGrid.map((row) => [...row]));
    setRevealed(true);
    setSolved(false);
  };

  const reset = () => {
    setUserInput(rawGrid.map((row) => row.map(() => "")));
    setRevealed(false);
    setSolved(false);
    setSelectedCell(null);
  };

  const isCellInSelectedWord = (r: number, c: number) => {
    if (selectedWordIdx === null) return false;
    const w = words[selectedWordIdx];
    if (!w) return false;
    if (w.direction === "across") return w.row === r && c >= w.col && c < w.col + w.word.length;
    return w.col === c && r >= w.row && r < w.row + w.word.length;
  };

  const getCellState = (r: number, c: number) => {
    if (!userInput[r]?.[c] || !rawGrid[r]?.[c]) return "empty";
    return userInput[r][c] === rawGrid[r][c] ? "correct" : "wrong";
  };

  const acrossClues = words.filter((w) => w.direction === "across").sort((a, b) => a.number - b.number);
  const downClues = words.filter((w) => w.direction === "down").sort((a, b) => a.number - b.number);

  const cellSize = 36;

  return (
    <div style={{ fontFamily: "'Courier New', monospace", minHeight: "100vh", background: "#0d0d0d", color: "#e8e0d0" }}>
      {/* Header */}
      <div style={{ borderBottom: "2px solid #2a2a1a", padding: "16px 28px", display: "flex", alignItems: "center", gap: 16 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 4, color: "#c8b560" }}>✦ EDUCROSS</div>
          <div style={{ fontSize: 10, color: "#444", letterSpacing: 3, marginTop: 1 }}>AI-POWERED EDUCATIONAL CROSSWORD</div>
        </div>
        {words.length > 0 && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={reset} style={btn("#1a1a0f", "#c8b560")}>↺ Reset</button>
            <button onClick={reveal} style={btn("#1a1a0f", "#666")}>Show Answers</button>
          </div>
        )}
      </div>

      {/* Topic input */}
      <div style={{ padding: "24px 28px 0" }}>
        <div style={{ display: "flex", gap: 10, maxWidth: 560 }}>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate()}
            placeholder="e.g. Operating Systems, World War II, Photosynthesis..."
            style={{
              flex: 1, background: "#141408", border: "2px solid #2a2a1a", color: "#e8e0d0",
              padding: "11px 14px", fontSize: 14, fontFamily: "inherit", outline: "none",
            }}
          />
          <button
            onClick={generate}
            disabled={loading || !topic.trim()}
            style={{
              background: loading ? "#1a1a0f" : "#c8b560", color: "#0d0d0d", border: "none",
              padding: "11px 22px", fontFamily: "inherit", fontSize: 13, fontWeight: 900,
              letterSpacing: 2, cursor: loading ? "not-allowed" : "pointer", textTransform: "uppercase",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "..." : "Generate →"}
          </button>
        </div>
        {error && <div style={{ color: "#e05555", marginTop: 10, fontSize: 13 }}>⚠ {error}</div>}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: "70px 28px", color: "#c8b560", letterSpacing: 4, fontSize: 15 }}>
          <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
          <span style={{ animation: "blink 1.2s infinite" }}>Generating your crossword...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && words.length === 0 && !error && (
        <div style={{ textAlign: "center", padding: "70px 28px", color: "#282818" }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>✦</div>
          <div style={{ fontSize: 16, letterSpacing: 3, textTransform: "uppercase" }}>Enter a topic to begin</div>
        </div>
      )}

      {/* Game */}
      {!loading && words.length > 0 && (
        <div style={{ display: "flex", gap: 0, padding: "20px 28px", alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Grid column */}
          <div style={{ flex: "0 0 auto", marginRight: 24, marginBottom: 20 }}>
            {solved && (
              <div style={{ background: "#0f1f08", border: "2px solid #4a8a20", padding: "10px 16px", marginBottom: 12, color: "#7ac840", fontWeight: 900, letterSpacing: 2, fontSize: 14 }}>
                ✓ PUZZLE SOLVED! EXCELLENT WORK!
              </div>
            )}
            {revealed && !solved && (
              <div style={{ background: "#141408", border: "1px solid #333", padding: "8px 14px", marginBottom: 12, color: "#555", fontSize: 12 }}>
                Answers revealed.
              </div>
            )}

            {/* Crossword grid */}
            <div style={{ display: "inline-block", border: "2px solid #2a2a1a", background: "#080808" }}>
              {grid.map((row, r) => (
                <div key={r} style={{ display: "flex" }}>
                  {row.map((cell, c) => {
                    if (cell.isBlack) return (
                      <div key={c} style={{ width: cellSize, height: cellSize, background: "#080808", border: "1px solid #111" }} />
                    );
                    const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                    const inWord = isCellInSelectedWord(r, c);
                    const state = getCellState(r, c);
                    const bg = isSelected ? "#c8b560" : inWord ? "#2a2610" : "#161610";
                    const txtColor = isSelected
                      ? "#0d0d0d"
                      : state === "correct" ? "#7ac840"
                      : state === "wrong" ? "#e05555"
                      : "#e8e0d0";
                    return (
                      <div
                        key={c}
                        onClick={() => handleCellClick(r, c)}
                        style={{
                          width: cellSize, height: cellSize, border: "1px solid #222",
                          background: bg, position: "relative", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        {cell.number && (
                          <span style={{ position: "absolute", top: 1, left: 2, fontSize: 7, color: isSelected ? "#0d0d0d" : "#c8b560", fontWeight: 700, lineHeight: 1 }}>
                            {cell.number}
                          </span>
                        )}
                        <input
                          ref={(el) => {
                            if (!inputRefs.current[r]) inputRefs.current[r] = [];
                            inputRefs.current[r][c] = el;
                          }}
                          value={userInput[r]?.[c] || ""}
                          onChange={(e) => handleInput(e, r, c)}
                          onKeyDown={(e) => handleKey(e, r, c)}
                          onClick={() => handleCellClick(r, c)}
                          maxLength={1}
                          style={{
                            width: "100%", height: "100%", background: "transparent",
                            border: "none", textAlign: "center",
                            fontFamily: "'Courier New', monospace",
                            fontSize: 14, fontWeight: 900, color: txtColor,
                            outline: "none", cursor: "pointer",
                            paddingTop: cell.number ? 5 : 0,
                            caretColor: "transparent",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Active clue below grid */}
            {selectedWordIdx !== null && words[selectedWordIdx] && (
              <div style={{ marginTop: 12, maxWidth: grid[0]?.length * cellSize, background: "#141408", border: "1px solid #2a2a1a", padding: "10px 14px" }}>
                <span style={{ color: "#c8b560", fontWeight: 900, fontSize: 11, letterSpacing: 2 }}>
                  {words[selectedWordIdx].number} {words[selectedWordIdx].direction.toUpperCase()}
                </span>
                <div style={{ fontSize: 13, marginTop: 4, color: "#d0c8b0", lineHeight: 1.5 }}>
                  {words[selectedWordIdx].clue}
                </div>
              </div>
            )}
          </div>

          {/* Clues panel */}
          <div style={{ flex: "1 1 240px", minWidth: 200, maxWidth: 300 }}>
            <div style={{ display: "flex", borderBottom: "2px solid #2a2a1a" }}>
              {(["across", "down"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveClueTab(tab)}
                  style={{
                    flex: 1, padding: "9px", background: activeClueTab === tab ? "#141408" : "transparent",
                    border: "none", borderBottom: `2px solid ${activeClueTab === tab ? "#c8b560" : "transparent"}`,
                    color: activeClueTab === tab ? "#c8b560" : "#444", cursor: "pointer",
                    fontFamily: "inherit", fontSize: 11, fontWeight: 900, letterSpacing: 2,
                    textTransform: "uppercase", marginBottom: -2,
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div style={{ maxHeight: 500, overflowY: "auto", border: "1px solid #1a1a0f", borderTop: "none" }}>
              {(activeClueTab === "across" ? acrossClues : downClues).map((w) => {
                const wi = words.indexOf(w);
                const isActive = wi === selectedWordIdx;
                return (
                  <div
                    key={`${w.number}-${w.direction}`}
                    ref={(el) => { clueRefs.current[wi] = el; }}
                    onClick={() => {
                      setSelectedWordIdx(wi);
                      setSelectedDir(w.direction);
                      setSelectedCell({ r: w.row, c: w.col });
                      setActiveClueTab(w.direction);
                      setTimeout(() => inputRefs.current[w.row]?.[w.col]?.focus(), 0);
                    }}
                    style={{
                      padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid #161610",
                      background: isActive ? "#1a1a08" : "transparent",
                      borderLeft: `3px solid ${isActive ? "#c8b560" : "transparent"}`,
                    }}
                  >
                    <span style={{ color: "#c8b560", fontWeight: 700, fontSize: 11, marginRight: 6 }}>{w.number}.</span>
                    <span style={{ fontSize: 12, color: isActive ? "#e0d8c0" : "#666", lineHeight: 1.4 }}>{w.clue}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function btn(bg: string, color: string): React.CSSProperties {
  return {
    background: bg, border: `1px solid ${color}`, color,
    padding: "7px 14px", fontFamily: "'Courier New', monospace",
    fontSize: 11, fontWeight: 700, letterSpacing: 1,
    cursor: "pointer", textTransform: "uppercase" as const,
  };
}