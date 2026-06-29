import React, { useEffect, useState, useRef } from "react";
import { backend_url } from "../components/config";

const SignToText: React.FC = () => {
  const [currentWord, setCurrentWord] = useState("");
  const [sentence, setSentence] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const lastWordRef = useRef("");
  const sentenceRef = useRef("");

  useEffect(() => {
    const ws = new WebSocket(
      backend_url.replace("http", "ws") + "/ws/sign-text/"
    );

    ws.onopen = () => {
      console.log("Arduino WebSocket Connected");
      setIsConnected(true);
    };

    ws.onclose = () => {
      console.log("Arduino WebSocket Disconnected");
      setIsConnected(false);
    };

    ws.onerror = (err) => {
      console.error(err);
      setIsConnected(false);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        const incomingWord = data.word?.trim();

        if (!incomingWord) return;

        // Ignore duplicates
        if (incomingWord === lastWordRef.current) return;

        lastWordRef.current = incomingWord;

        setCurrentWord(incomingWord);

        setSentence((prev) => {
          const updated = prev
            ? `${prev} ${incomingWord}`
            : incomingWord;

          sentenceRef.current = updated;
          return updated;
        });
      } catch (error) {
        console.error(error);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const saveSentence = () => {
    if (!sentence.trim()) return;

    setHistory((prev) => [
      sentence,
      ...prev,
    ]);

    setSentence("");
    sentenceRef.current = "";
    lastWordRef.current = "";
  };

  const clearAll = () => {
    setCurrentWord("");
    setSentence("");
    setHistory([]);
    lastWordRef.current = "";
    sentenceRef.current = "";
  };

  return (
    <>
      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .container {
          min-height: 100vh;
          padding: 2rem;
          background: ${darkMode
            ? "linear-gradient(135deg,#0a0118,#1a0b2e,#16213e,#533483)"
            : "#f5f7fb"};
          color: white;
        }

        .header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .title {
          font-size: 3rem;
          font-weight: 800;
        }

        .subtitle {
          opacity: 0.8;
          margin-top: 10px;
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-top: 15px;
          padding: 10px 20px;
          border-radius: 30px;
          background: rgba(255,255,255,0.1);
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: ${isConnected ? "#10b981" : "#ef4444"};
        }

        .mainGrid {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .card {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(15px);
          border-radius: 24px;
          padding: 2rem;
        }

        .cardTitle {
          font-size: 1.2rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .liveWord {
          font-size: 4rem;
          font-weight: 800;
          text-align: center;
          color: #60a5fa;
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          word-break: break-word;
        }

        .sentenceBox {
          min-height: 160px;
          font-size: 1.8rem;
          line-height: 1.8;
          word-break: break-word;
        }

        .buttonRow {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .btn {
          border: none;
          border-radius: 14px;
          padding: 12px 20px;
          cursor: pointer;
          font-weight: 600;
        }

        .saveBtn {
          background: #10b981;
          color: white;
        }

        .clearBtn {
          background: #ef4444;
          color: white;
        }

        .historyCard {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px;
          padding: 2rem;
        }

        .historyItem {
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1rem;
          line-height: 1.6;
        }

        .historyIndex {
          color: #60a5fa;
          font-weight: bold;
          margin-right: 10px;
        }

        .themeBtn {
          position: fixed;
          right: 20px;
          top: 20px;
          padding: 10px 18px;
          border-radius: 30px;
          border: none;
          cursor: pointer;
        }

        @media(max-width:768px){
          .mainGrid{
            grid-template-columns:1fr;
          }

          .liveWord{
            font-size:2.5rem;
          }

          .sentenceBox{
            font-size:1.3rem;
          }
        }
      `}</style>

      <div className="container">
        <button
          className="themeBtn"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? "☀️ Light" : "🌙 Dark"}
        </button>

        <div className="header">
          <h1 className="title">Sign To Text</h1>

          <p className="subtitle">
            Real-time Sign Language Recognition using Arduino
          </p>

          <div className="status">
            <div className="dot" />
            {isConnected
              ? "Arduino Connected"
              : "Arduino Disconnected"}
          </div>
        </div>

        <div className="mainGrid">
          <div className="card">
            <div className="cardTitle">
              🎯 Live Detection
            </div>

            <div className="liveWord">
              {currentWord || "--"}
            </div>
          </div>

          <div className="card">
            <div className="cardTitle">
              📝 Generated Sentence
            </div>

            <div className="sentenceBox">
              {sentence || "Waiting for signs..."}
            </div>

            <div className="buttonRow">
              <button
                className="btn saveBtn"
                onClick={saveSentence}
              >
                Save Sentence
              </button>

              <button
                className="btn clearBtn"
                onClick={clearAll}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="historyCard">
          <h2 style={{ marginBottom: "20px" }}>
            📚 Conversation History
          </h2>

          {history.length === 0 ? (
            <p>No conversations recorded yet.</p>
          ) : (
            history.map((item, index) => (
              <div
                key={index}
                className="historyItem"
              >
                <span className="historyIndex">
                  {history.length - index}.
                </span>

                {item}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default SignToText;