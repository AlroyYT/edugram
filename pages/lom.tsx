import { useState, useRef, useEffect } from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import AnimationView from "../components/sign2";

import "katex/dist/katex.min.css";

interface Message {
  role: "user" | "model";
  text: string;
}


const SUGGESTIONS = [
  "Explain quantum entanglement simply",
  "Write a Python web scraper",
  "What are black holes made of?",
  "Give me a 7-day workout plan",
];

export default function Lom() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamedText, setStreamedText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [signMode, setSignMode] = useState(false);

  const [currentGesture, setCurrentGesture] = useState("");

  const [gestureSentence, setGestureSentence] = useState("");

  const [animationText, setAnimationText] = useState("");

  const [arduinoConnected, setArduinoConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const lastWordRef = useRef("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText]);

  useEffect(() => {

    if (!signMode) {

        wsRef.current?.close();
        setArduinoConnected(false);

        return;
    }

    const ws = new WebSocket("ws://127.0.0.1:8001/ws/sign-text/");

    wsRef.current = ws;

    ws.onopen = () => {

        console.log("Arduino Connected");

        setArduinoConnected(true);

    };

    ws.onmessage = (event) => {

    const data = JSON.parse(event.data);

    const word = data.word?.trim();

    if (!word) return;

    // Ignore consecutive duplicates
    if (word === lastWordRef.current)
        return;

    lastWordRef.current = word;

    // Show current live gesture
    setCurrentGesture(word);

    // Build sentence
    setGestureSentence((prev) =>
        prev ? prev + " " + word : word
    );

    // Reset timer
    if (timerRef.current) {
        clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {

        setGestureSentence((sentence) => {

            if (!sentence.trim())
                return "";

            console.log("AUTO SEND:", sentence);

            send(sentence);

            return "";

        });

    }, 4000);

};

    ws.onclose = () => {

        console.log("Arduino Disconnected");

        setArduinoConnected(false);

    };

    ws.onerror = () => {

        console.log("WebSocket Error");

        setArduinoConnected(false);

    };

    return () => {

        ws.close();

    };

}, [signMode]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setStreamedText("");

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch("/api/root", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulated += parsed.text;
                setStreamedText(accumulated);
              }
            } catch {}
          }
        }
      }

      setMessages([...newMessages, { role: "model", text: accumulated }]);
      if (signMode) {
    setAnimationText(accumulated);
}
      setStreamedText("");
    } catch {
      setMessages([
        ...newMessages,
        { role: "model", text: "Something went wrong. Please try again." },
      ]);
      setStreamedText("");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className="shell">
      {/* Header */}
      <header className="header">

  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",
    }}
  >

    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >

      {/* Paste your ORIGINAL SVG here */}

      <svg className="gem-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Your existing SVG */}
      </svg>

      <span className="header-title">Jarvis</span>

      <span className="header-badge">Text</span>

    </div>

    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        fontWeight: 600,
      }}
    >

      <input
        type="checkbox"
        checked={signMode}
        onChange={(e) => {
            console.log("Sign Mode:", e.target.checked);
            setSignMode(e.target.checked);
        }}
    />

       {signMode ? "Sign Language ON" : "Sign Language OFF"}

    </label>

  </div>

</header>
{signMode && (

<div
    style={{
        padding: 12,
        background: "#222",
        color: "white",
        margin: 10,
        borderRadius: 8,
    }}
>

    <div>
        <strong>Current Gesture:</strong> {currentGesture}
    </div>

    <div style={{ marginTop: 10 }}>
        <strong>Sentence:</strong> {gestureSentence}
    </div>

</div>

)}
      {/* Messages */}
      {/* <div className="messages" style={{ display: "flex", gap: 20, overflow: "hidden", }} >  */}
      <div
        className="messages"
        style={{
          display: signMode ? "flex" : undefined,
          gap: signMode ? 20 : undefined,
          alignItems: signMode ? "stretch" : undefined,
        }}
      >
        <div style={{ flex: 1, overflowY: "auto", paddingRight: signMode ? 12 : 0, }} >
        {isEmpty ? (
          <div className="welcome">
            <svg className="welcome-gem" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="wGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#4285f4" />
                  <stop offset="50%" stopColor="#8ab4f8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>
              <path d="M32 6L58 21V43L32 58L6 43V21L32 6Z" fill="url(#wGrad)" opacity="0.85" />
              <path d="M32 6L44 21H20L32 6Z" fill="white" opacity="0.4" />
              <path d="M20 21L6 43L32 58L20 21Z" fill="white" opacity="0.12" />
              <path d="M44 21L58 43L32 58L44 21Z" fill="white" opacity="0.22" />
              <path d="M20 21H44L32 58L20 21Z" fill="white" opacity="0.18" />
            </svg>
            <div className="welcome-title">Hello, there</div>
            <p className="welcome-sub">
              Ask me anything — code, ideas, analysis, writing, or just a conversation.
            </p>
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="suggestion-card" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`msg-row ${msg.role}`}>
                {msg.role === "model" && (
                  <div className="avatar model-av">
                    <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
                      <path d="M20 4L36 14V26L20 36L4 26V14L20 4Z" fill="white" opacity="0.9" />
                    </svg>
                  </div>
                )}
                {msg.role === "user" && <div className="avatar user-av">U</div>}
                <div className={`bubble ${msg.role}-bubble`}>
                  {msg.role === "model" ? (
                    <div className="md-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}

            {/* Streaming */}
            {loading && streamedText && (
              <div className="msg-row model">
                <div className="avatar model-av">
                  <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
                    <path d="M20 4L36 14V26L20 36L4 26V14L20 4Z" fill="white" opacity="0.9" />
                  </svg>
                </div>
                <div className="bubble model-bubble">
                  <div className="md-content">
  <ReactMarkdown
    remarkPlugins={[remarkGfm, remarkMath]}
    rehypePlugins={[rehypeKatex]}
  >
    {streamedText}
  </ReactMarkdown>

  <span className="streaming-dot" />
</div>
                </div>
              </div>
            )}

            {/* Thinking dots */}
            {loading && !streamedText && (
              <div className="thinking-row">
                <div className="avatar model-av">
                  <svg width="16" height="16" viewBox="0 0 40 40" fill="none">
                    <path d="M20 4L36 14V26L20 36L4 26V14L20 4Z" fill="white" opacity="0.9" />
                  </svg>
                </div>
                <div className="thinking-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>
      {signMode && animationText && (
        <div
          style={{
            width: 380,
            minWidth: 320,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <AnimationView
            key={animationText}
            externalText={animationText}
            hideInput
            animationOnly
          />
        </div>
      )}
      </div>

      {/* Input */}
      <div className="input-area">
        <div className="input-box">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKey}
            placeholder="Ask Jarvis"
            rows={1}
            disabled={loading}
          />
          <button
            className={`send-btn ${input.trim() ? "active" : ""}`}
            onClick={() => send()}
            disabled={loading || !input.trim()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M2 12L22 2L12 22L10 14L2 12Z" fill="white" />
            </svg>
          </button>
        </div>
        <div className="input-footer">Jarvis can make mistakes. Check important info.</div>
      </div>
    </div>
  );
}
