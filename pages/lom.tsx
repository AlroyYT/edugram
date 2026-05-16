import { useState, useRef, useEffect } from "react";
import "../styles/lom.css";

interface Message {
  role: "user" | "model";
  text: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseMarkdown(text: string): string {
  let html = text;

  // Code blocks
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
    const langLabel = lang ? `<span class="code-lang">${lang}</span>` : "";
    return `<div class="code-block"><div class="code-header">${langLabel}<button class="copy-btn" onclick="navigator.clipboard.writeText(this.closest('.code-block').querySelector('code').innerText)">Copy</button></div><pre><code>${escapeHtml(code.trimEnd())}</code></pre></div>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code class='inline-code'>$1</code>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Headings
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Lists
  html = html.replace(/^[-*] (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);

  // Blockquote
  html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

  // HR
  html = html.replace(/^---$/gm, "<hr/>");

  // Paragraphs
  html = html
    .split(/\n{2,}/)
    .map((para) => {
      const trimmed = para.trim();
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<li") ||
        trimmed.startsWith("<pre") ||
        trimmed.startsWith("<div") ||
        trimmed.startsWith("<blockquote") ||
        trimmed.startsWith("<hr")
      )
        return trimmed;
      return `<p>${trimmed.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");

  return html;
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedText]);

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
        <svg className="gem-icon" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gemGrad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4285f4" />
              <stop offset="50%" stopColor="#8ab4f8" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <path d="M20 4L36 14V26L20 36L4 26V14L20 4Z" fill="url(#gemGrad)" opacity="0.9" />
          <path d="M20 4L28 14H12L20 4Z" fill="white" opacity="0.3" />
          <path d="M12 14L4 26L20 36L12 14Z" fill="white" opacity="0.1" />
          <path d="M28 14L36 26L20 36L28 14Z" fill="white" opacity="0.2" />
          <path d="M12 14H28L20 36L12 14Z" fill="white" opacity="0.15" />
        </svg>
        <span className="header-title">Jarvis</span>
        <span className="header-badge">Text</span>
      </header>

      {/* Messages */}
      <div className="messages">
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
                    <div
                      className="md-content"
                      dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }}
                    />
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
                  <div
                    className="md-content"
                    dangerouslySetInnerHTML={{
                      __html:
                        parseMarkdown(streamedText) +
                        '<span class="streaming-dot"></span>',
                    }}
                  />
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