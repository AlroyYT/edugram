import React, { useEffect, useState, useRef } from "react";
// import { backend_url } from "../components/config";

const backend_url = "http://0.0.0.0:8001";

const SignToText: React.FC = () => {
  const [currentWord, setCurrentWord] = useState("");
  const [sentence, setSentence] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const lastWordRef = useRef("");
  const sentenceRef = useRef("");

  useEffect(() => {

    console.log(
  backend_url.replace("http", "ws") + "/ws/sign-text/"
);

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

        .sttPage {
          --bg: #f6f8fb;
          --bg-soft: #eef3f8;
          --surface: rgba(255, 255, 255, 0.92);
          --surface-strong: #ffffff;
          --border: rgba(15, 23, 42, 0.1);
          --text: #0f172a;
          --muted: #64748b;
          --primary: #2563eb;
          --primary-soft: rgba(37, 99, 235, 0.1);
          --success: #16a34a;
          --danger: #dc2626;
          --shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
          width: 100vw;
          min-height: calc(100vh - 84px);
          margin-left: calc(50% - 50vw);
          margin-right: calc(50% - 50vw);
          padding: 32px;
          background:
            radial-gradient(circle at top left, rgba(37, 99, 235, 0.14), transparent 34rem),
            linear-gradient(135deg, var(--bg) 0%, var(--bg-soft) 100%);
          color: var(--text);
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .sttPage.dark {
          --bg: #08111f;
          --bg-soft: #111827;
          --surface: rgba(15, 23, 42, 0.86);
          --surface-strong: rgba(30, 41, 59, 0.92);
          --border: rgba(148, 163, 184, 0.16);
          --text: #f8fafc;
          --muted: #94a3b8;
          --primary: #60a5fa;
          --primary-soft: rgba(96, 165, 250, 0.13);
          --success: #22c55e;
          --danger: #ef4444;
          --shadow: 0 24px 60px rgba(0, 0, 0, 0.32);
          background:
            radial-gradient(circle at top left, rgba(96, 165, 250, 0.16), transparent 34rem),
            radial-gradient(circle at bottom right, rgba(45, 212, 191, 0.1), transparent 30rem),
            linear-gradient(135deg, var(--bg) 0%, var(--bg-soft) 100%);
        }

        .sttShell {
          width: min(1320px, 100%);
          margin: 0 auto;
        }

        .topBar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }

        .eyebrow {
          color: var(--primary);
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.14em;
          margin-bottom: 8px;
          text-transform: uppercase;
        }

        .title {
          margin: 0;
          font-size: clamp(2rem, 4vw, 3.35rem);
          font-weight: 850;
          letter-spacing: 0;
          line-height: 1;
        }

        .subtitle {
          max-width: 620px;
          margin: 14px 0 0;
          color: var(--muted);
          font-size: 1rem;
          line-height: 1.6;
        }

        .controls {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .status {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-height: 42px;
          padding: 0 16px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--surface);
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
          color: var(--text);
          font-size: 0.92rem;
          font-weight: 750;
          white-space: nowrap;
        }

        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: ${isConnected ? "var(--success)" : "var(--danger)"};
          box-shadow: 0 0 0 5px ${isConnected ? "rgba(34, 197, 94, 0.14)" : "rgba(239, 68, 68, 0.14)"};
        }

        .themeBtn {
          min-height: 42px;
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 0 16px;
          background: var(--surface);
          color: var(--text);
          cursor: pointer;
          font-size: 0.92rem;
          font-weight: 750;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .themeBtn:hover {
          transform: translateY(-1px);
          border-color: rgba(96, 165, 250, 0.45);
        }

        .dashboard {
          display: grid;
          grid-template-columns: minmax(240px, 0.85fr) minmax(360px, 1.35fr) minmax(260px, 0.9fr);
          gap: 18px;
          align-items: stretch;
        }

        .card {
          min-width: 0;
          border: 1px solid var(--border);
          border-radius: 8px;
          background: var(--surface);
          box-shadow: var(--shadow);
          overflow: hidden;
        }

        .cardHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 20px 22px;
          border-bottom: 1px solid var(--border);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent);
        }

        .cardTitle {
          margin: 0;
          color: var(--text);
          font-size: 1rem;
          font-weight: 800;
        }

        .cardLabel {
          color: var(--muted);
          font-size: 0.82rem;
          font-weight: 700;
        }

        .livePanel {
          display: flex;
          min-height: 315px;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background:
            linear-gradient(135deg, var(--primary-soft), transparent),
            var(--surface-strong);
        }

        .liveWord {
          width: 100%;
          min-height: 186px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px dashed rgba(96, 165, 250, 0.38);
          border-radius: 8px;
          color: var(--primary);
          font-size: clamp(2.6rem, 6vw, 4.8rem);
          font-weight: 900;
          line-height: 1;
          text-align: center;
          word-break: break-word;
          padding: 18px;
        }

        .placeholder {
          color: var(--muted);
          font-size: 1.25rem;
          font-weight: 800;
        }

        .sentenceContent {
          display: flex;
          flex-direction: column;
          min-height: 315px;
          padding: 24px;
          background: var(--surface-strong);
        }

        .sentenceBox {
          flex: 1;
          min-height: 190px;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 22px;
          background: var(--bg);
          color: var(--text);
          font-size: clamp(1.35rem, 2.4vw, 2rem);
          font-weight: 650;
          line-height: 1.55;
          word-break: break-word;
        }

        .sentenceBox.empty {
          display: flex;
          align-items: center;
          color: var(--muted);
          font-size: 1rem;
          font-weight: 650;
        }

        .buttonRow {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 18px;
        }

        .btn {
          min-height: 44px;
          border: 0;
          border-radius: 8px;
          padding: 0 18px;
          color: #ffffff;
          cursor: pointer;
          font-size: 0.92rem;
          font-weight: 800;
          transition: transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .btn:disabled {
          cursor: not-allowed;
          opacity: 0.48;
        }

        .saveBtn {
          background: var(--success);
          box-shadow: 0 12px 24px rgba(34, 197, 94, 0.22);
        }

        .clearBtn {
          background: var(--danger);
          box-shadow: 0 12px 24px rgba(239, 68, 68, 0.2);
        }

        .historyList {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 315px;
          overflow: auto;
          padding: 20px;
          background: var(--surface-strong);
        }

        .emptyHistory {
          min-height: 190px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px dashed var(--border);
          border-radius: 8px;
          color: var(--muted);
          line-height: 1.5;
          padding: 20px;
          text-align: center;
        }

        .historyItem {
          display: grid;
          grid-template-columns: 34px 1fr;
          gap: 12px;
          align-items: start;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 14px;
          background: var(--bg);
        }

        .historyIndex {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: var(--primary);
          color: #ffffff;
          font-size: 0.82rem;
          font-weight: 850;
        }

        .historyText {
          color: var(--text);
          font-size: 0.95rem;
          line-height: 1.55;
          word-break: break-word;
        }

        @media (max-width: 1100px) {
          .dashboard {
            grid-template-columns: 1fr 1fr;
          }

          .historyCard {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 760px) {
          .sttPage {
            padding: 22px;
          }

          .topBar {
            align-items: flex-start;
            flex-direction: column;
          }

          .controls {
            width: 100%;
            flex-wrap: wrap;
          }

          .status,
          .themeBtn {
            flex: 1;
            justify-content: center;
          }

          .dashboard {
            grid-template-columns: 1fr;
          }

          .livePanel,
          .sentenceContent {
            min-height: auto;
          }

          .buttonRow {
            flex-direction: column;
          }
        }

        @media (max-width: 480px) {
          .sttPage {
            padding: 16px;
          }

          .cardHeader,
          .sentenceContent,
          .livePanel,
          .historyList {
            padding: 16px;
          }

          .status,
          .themeBtn,
          .btn {
            width: 100%;
          }
        }
      `}</style>

      <div className={`sttPage ${darkMode ? "dark" : "light"}`}>
        <main className="sttShell">
          <div className="topBar">
            <header>
              <div className="eyebrow">Arduino sign recognition</div>
              <h1 className="title">Sign To Text</h1>
              <p className="subtitle">
                Real-time detected signs are converted into a readable sentence and can be saved for review.
              </p>
            </header>

            <div className="controls">
              <div className="status">
                <span className="dot" />
                {isConnected ? "Arduino Connected" : "Arduino Disconnected"}
              </div>
              <button
                className="themeBtn"
                onClick={() => setDarkMode(!darkMode)}
              >
                {darkMode ? "Light Mode" : "Dark Mode"}
              </button>
            </div>
          </div>

          <section className="dashboard" aria-label="Sign to text workspace">
            <article className="card">
              <div className="cardHeader">
                <h2 className="cardTitle">Live Detection</h2>
                <span className="cardLabel">Current sign</span>
              </div>
              <div className="livePanel">
                <div className={currentWord ? "liveWord" : "liveWord placeholder"}>
                  {currentWord || "--"}
                </div>
              </div>
            </article>

            <article className="card">
              <div className="cardHeader">
                <h2 className="cardTitle">Generated Sentence</h2>
                <span className="cardLabel">{sentence.trim() ? `${sentence.trim().split(/\s+/).length} words` : "Waiting"}</span>
              </div>
              <div className="sentenceContent">
                <div className={sentence ? "sentenceBox" : "sentenceBox empty"}>
                  {sentence || "Waiting for signs..."}
                </div>

                <div className="buttonRow">
                  <button
                    className="btn saveBtn"
                    onClick={saveSentence}
                    disabled={!sentence.trim()}
                  >
                    Save Sentence
                  </button>

                  <button
                    className="btn clearBtn"
                    onClick={clearAll}
                    disabled={!sentence.trim() && !currentWord && history.length === 0}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </article>

            <aside className="card historyCard">
              <div className="cardHeader">
                <h2 className="cardTitle">Conversation History</h2>
                <span className="cardLabel">{history.length} saved</span>
              </div>

              <div className="historyList">
                {history.length === 0 ? (
                  <div className="emptyHistory">No conversations recorded yet.</div>
                ) : (
                  history.map((item, index) => (
                    <div
                      key={index}
                      className="historyItem"
                    >
                      <span className="historyIndex">
                        {history.length - index}
                      </span>
                      <span className="historyText">{item}</span>
                    </div>
                  ))
                )}
              </div>
            </aside>
          </section>
        </main>
      </div>
    </>
  );
};

export default SignToText;
