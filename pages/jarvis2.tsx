'use client'

import { useState, useEffect, useRef } from 'react'

// ── KaTeX + Marked loaded via CDN in the style injection ──────────────────────
const JARVIS_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap');
  @import url('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css');

  body.jarvis-active {
    background: #010a0f !important;
    color: #c8f0ff !important;
    font-family: 'Rajdhani', sans-serif !important;
    cursor: none !important;
    overflow: hidden !important;
  }
  body.jarvis-active .cursor {
    position: fixed; width: 20px; height: 20px;
    border: 2px solid #00d4ff; border-radius: 50%;
    pointer-events: none; transform: translate(-50%, -50%);
    transition: transform 0.1s ease, width 0.2s, height 0.2s;
    z-index: 9999; mix-blend-mode: screen;
  }
  body.jarvis-active .cursor-dot {
    position: fixed; width: 4px; height: 4px;
    background: #00d4ff; border-radius: 50%;
    pointer-events: none; transform: translate(-50%, -50%);
    z-index: 9999;
  }
  body.jarvis-active .grid-bg {
    position: fixed; inset: 0;
    background-image:
      linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px);
    background-size: 50px 50px; pointer-events: none;
  }
  body.jarvis-active .panel {
    background: rgba(0,20,35,0.85);
    border: 1px solid rgba(0,212,255,0.2);
    backdrop-filter: blur(10px); position: relative;
  }
  body.jarvis-active .panel::before,
  body.jarvis-active .panel::after {
    content: ''; position: absolute; width: 20px; height: 20px;
  }
  body.jarvis-active .panel::before {
    top: -1px; left: -1px;
    border-top: 2px solid #00d4ff; border-left: 2px solid #00d4ff;
  }
  body.jarvis-active .panel::after {
    bottom: -1px; right: -1px;
    border-bottom: 2px solid #00d4ff; border-right: 2px solid #00d4ff;
  }
  body.jarvis-active .orbitron { font-family: 'Orbitron', monospace; }
  body.jarvis-active .mono     { font-family: 'Share Tech Mono', monospace; }
  body.jarvis-active .glow-text { text-shadow: 0 0 10px #00d4ff, 0 0 20px #00d4ff; }
  body.jarvis-active .scrollable {
    overflow-y: auto; scrollbar-width: thin;
    scrollbar-color: #0088aa transparent;
  }
  body.jarvis-active .scrollable::-webkit-scrollbar { width: 4px; }
  body.jarvis-active .scrollable::-webkit-scrollbar-track { background: transparent; }
  body.jarvis-active .scrollable::-webkit-scrollbar-thumb { background: #0088aa; border-radius: 2px; }
  body.jarvis-active .btn-arc {
    background: transparent; border: 1px solid #00d4ff;
    color: #00d4ff; font-family: 'Orbitron', monospace;
    font-size: 11px; letter-spacing: 2px; padding: 8px 20px;
    cursor: none; position: relative; transition: all 0.3s;
    text-transform: uppercase; overflow: hidden;
  }
  body.jarvis-active .btn-arc::before {
    content: ''; position: absolute; inset: 0;
    background: #00d4ff; transform: translateX(-100%);
    transition: transform 0.3s ease; z-index: -1;
  }
  body.jarvis-active .btn-arc:hover::before { transform: translateX(0); }
  body.jarvis-active .btn-arc:hover { color: #000; }
  body.jarvis-active .status-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #00d4ff; box-shadow: 0 0 8px #00d4ff;
    animation: jarvisArcPulse 1.5s ease-in-out infinite;
  }
  body.jarvis-active .status-dot.offline { background: #ff3030; box-shadow: 0 0 8px #ff3030; }
  body.jarvis-active .status-dot.idle    { background: #ffa500; box-shadow: 0 0 8px #ffa500; }
  body.jarvis-active .msg-user   { animation: jarvisFadeInUp 0.3s ease forwards; }
  body.jarvis-active .msg-jarvis { animation: jarvisFadeInUp 0.3s ease forwards; }
  body.jarvis-active .animate-arc-pulse    { animation: jarvisArcPulse 2s ease-in-out infinite; }
  body.jarvis-active .animate-ring-rotate  { animation: jarvisRingRotate 8s linear infinite; }
  body.jarvis-active .animate-ring-reverse { animation: jarvisRingReverse 6s linear infinite; }

  /* ── RICH CONTENT STYLES ──────────────────────────────────────────────── */

  /* Code blocks */
  body.jarvis-active .jarvis-code-block {
    position: relative;
    margin: 10px 0;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid rgba(0,212,255,0.25);
    background: rgba(0,5,15,0.95);
  }
  body.jarvis-active .jarvis-code-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 12px;
    background: rgba(0,212,255,0.08);
    border-bottom: 1px solid rgba(0,212,255,0.15);
  }
  body.jarvis-active .jarvis-code-lang {
    font-family: 'Orbitron', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    color: #00d4ff;
    text-transform: uppercase;
  }
  body.jarvis-active .jarvis-copy-btn {
    font-family: 'Share Tech Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    color: rgba(0,212,255,0.5);
    background: none;
    border: 1px solid rgba(0,212,255,0.2);
    padding: 2px 8px;
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.2s;
  }
  body.jarvis-active .jarvis-copy-btn:hover { color: #00d4ff; border-color: #00d4ff; }
  body.jarvis-active .jarvis-code-content {
    padding: 12px 14px;
    overflow-x: auto;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12.5px;
    line-height: 1.7;
    color: #a8e6ff;
    white-space: pre;
    scrollbar-width: thin;
    scrollbar-color: #0088aa transparent;
  }
  body.jarvis-active .jarvis-code-content::-webkit-scrollbar { height: 3px; }
  body.jarvis-active .jarvis-code-content::-webkit-scrollbar-thumb { background: #0088aa; border-radius: 2px; }

  /* Inline code */
  body.jarvis-active .jarvis-inline-code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    background: rgba(0,212,255,0.1);
    border: 1px solid rgba(0,212,255,0.2);
    border-radius: 3px;
    padding: 1px 5px;
    color: #7dd8f0;
  }

  /* KaTeX math blocks */
  body.jarvis-active .jarvis-math-block {
    margin: 12px 0;
    padding: 14px 18px;
    background: rgba(0,212,255,0.04);
    border: 1px solid rgba(0,212,255,0.2);
    border-left: 3px solid #00d4ff;
    border-radius: 0 6px 6px 0;
    overflow-x: auto;
    text-align: center;
  }
  body.jarvis-active .jarvis-math-block .katex { font-size: 1.15em; color: #c8f0ff; }
  body.jarvis-active .jarvis-math-inline .katex { font-size: 1em; color: #a8e6ff; }
  body.jarvis-active .katex-error { color: #ff6b6b !important; font-size: 11px; }

  /* Tables */
  body.jarvis-active .jarvis-table-wrap {
    margin: 10px 0;
    overflow-x: auto;
    border-radius: 6px;
    border: 1px solid rgba(0,212,255,0.2);
  }
  body.jarvis-active .jarvis-table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'Share Tech Mono', monospace;
    font-size: 12px;
  }
  body.jarvis-active .jarvis-table th {
    background: rgba(0,212,255,0.1);
    color: #00d4ff;
    font-family: 'Orbitron', monospace;
    font-size: 9px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    padding: 8px 12px;
    text-align: left;
    border-bottom: 1px solid rgba(0,212,255,0.25);
    white-space: nowrap;
  }
  body.jarvis-active .jarvis-table td {
    padding: 7px 12px;
    color: #c8f0ff;
    border-bottom: 1px solid rgba(0,212,255,0.08);
    line-height: 1.5;
  }
  body.jarvis-active .jarvis-table tr:last-child td { border-bottom: none; }
  body.jarvis-active .jarvis-table tr:hover td { background: rgba(0,212,255,0.04); }

  /* Headers in response */
  body.jarvis-active .jarvis-h1 {
    font-family: 'Orbitron', monospace;
    font-size: 16px;
    letter-spacing: 3px;
    color: #00d4ff;
    text-shadow: 0 0 8px rgba(0,212,255,0.4);
    margin: 14px 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(0,212,255,0.2);
  }
  body.jarvis-active .jarvis-h2 {
    font-family: 'Orbitron', monospace;
    font-size: 13px;
    letter-spacing: 2px;
    color: #00b8d9;
    margin: 12px 0 6px;
  }
  body.jarvis-active .jarvis-h3 {
    font-family: 'Rajdhani', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #7dd8f0;
    margin: 10px 0 4px;
  }

  /* Lists */
  body.jarvis-active .jarvis-ul, body.jarvis-active .jarvis-ol {
    margin: 6px 0 6px 4px;
    padding-left: 0;
    list-style: none;
  }
  body.jarvis-active .jarvis-ul li, body.jarvis-active .jarvis-ol li {
    position: relative;
    padding-left: 18px;
    margin-bottom: 4px;
    color: #c8f0ff;
    font-family: 'Rajdhani', sans-serif;
    font-size: 14px;
    line-height: 1.6;
  }
  body.jarvis-active .jarvis-ul li::before {
    content: '▸';
    position: absolute;
    left: 0;
    color: #00d4ff;
    font-size: 11px;
    top: 2px;
  }
  body.jarvis-active .jarvis-ol { counter-reset: item; }
  body.jarvis-active .jarvis-ol li { counter-increment: item; }
  body.jarvis-active .jarvis-ol li::before {
    content: counter(item, decimal-leading-zero) '.';
    position: absolute;
    left: 0;
    color: #00d4ff;
    font-family: 'Orbitron', monospace;
    font-size: 9px;
    top: 3px;
    letter-spacing: 0.5px;
  }

  /* Blockquote / callouts */
  body.jarvis-active .jarvis-blockquote {
    margin: 8px 0;
    padding: 10px 14px;
    border-left: 3px solid rgba(255,165,0,0.6);
    background: rgba(255,165,0,0.05);
    border-radius: 0 4px 4px 0;
    font-style: italic;
    color: #ffe0a0;
    font-family: 'Rajdhani', sans-serif;
    font-size: 13.5px;
  }

  /* Bold / emphasis */
  body.jarvis-active .jarvis-bold { color: #ffffff; font-weight: 600; }
  body.jarvis-active .jarvis-em { color: #a8e6ff; font-style: italic; }

  /* Horizontal rule */
  body.jarvis-active .jarvis-hr {
    border: none;
    border-top: 1px solid rgba(0,212,255,0.2);
    margin: 12px 0;
  }

  /* Step / definition list style */
  body.jarvis-active .jarvis-step {
    display: flex;
    gap: 10px;
    margin: 6px 0;
    align-items: flex-start;
  }
  body.jarvis-active .jarvis-step-num {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    border: 1px solid #00d4ff;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Orbitron', monospace;
    font-size: 9px;
    color: #00d4ff;
  }

  /* Warning / note callouts */
  body.jarvis-active .jarvis-note {
    margin: 8px 0;
    padding: 8px 12px;
    border-radius: 4px;
    font-family: 'Share Tech Mono', monospace;
    font-size: 11px;
  }
  body.jarvis-active .jarvis-note-info { background: rgba(0,212,255,0.07); border: 1px solid rgba(0,212,255,0.2); color: #7dd8f0; }
  body.jarvis-active .jarvis-note-warn { background: rgba(255,165,0,0.07); border: 1px solid rgba(255,165,0,0.3); color: #ffd080; }

  /* ── ANIMATIONS ───────────────────────────────────────────────────────── */
  @keyframes jarvisArcPulse {
    0%,100% { box-shadow: 0 0 20px rgba(0,212,255,0.4), 0 0 40px rgba(0,212,255,0.4), inset 0 0 20px rgba(0,212,255,0.4); }
    50%     { box-shadow: 0 0 40px rgba(0,212,255,0.4), 0 0 80px rgba(0,212,255,0.4), 0 0 120px rgba(0,212,255,0.2), inset 0 0 30px rgba(0,212,255,0.4); }
  }
  @keyframes jarvisRingRotate  { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
  @keyframes jarvisRingReverse { from { transform: rotate(360deg); } to { transform: rotate(0deg);    } }
  @keyframes jarvisFadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
  @keyframes jarvisWaveform {
    0%,100% { transform: scaleY(0.2); }
    50%     { transform: scaleY(1);   }
  }
  @keyframes arcPulse {
    0%,100% { box-shadow: 0 0 20px rgba(0,212,255,0.4), 0 0 40px rgba(0,212,255,0.4); }
    50%     { box-shadow: 0 0 40px rgba(0,212,255,0.4), 0 0 80px rgba(0,212,255,0.4); }
  }
  @keyframes jarvisRevealCode {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .jarvis-code-block { animation: jarvisRevealCode 0.25s ease forwards; }
`

// ── Load KaTeX and marked via CDN script tags ──────────────────────────────
function loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return }
    const s = document.createElement('script')
    s.src = src; s.onload = () => res(); s.onerror = rej
    document.head.appendChild(s)
  })
}

// ── Rich text renderer: markdown + KaTeX ──────────────────────────────────
function renderRichText(text: string): string {
  const katex = (window as any).katex
  const escapeHtml = (s: string) =>
    s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')

  const renderMath = (src: string, display: boolean): string => {
    if (!katex) return display ? `<div class="jarvis-math-block"><code>${escapeHtml(src)}</code></div>` : `<code class="jarvis-inline-code">${escapeHtml(src)}</code>`
    try {
      return display
        ? `<div class="jarvis-math-block">${katex.renderToString(src, { displayMode: true, throwOnError: false })}</div>`
        : `<span class="jarvis-math-inline">${katex.renderToString(src, { displayMode: false, throwOnError: false })}</span>`
    } catch { return display ? `<div class="jarvis-math-block"><code>${escapeHtml(src)}</code></div>` : `<code class="jarvis-inline-code">${escapeHtml(src)}</code>` }
  }

  // ── Pass 1: extract fenced code blocks & display math to protect them ────
  const blocks: string[] = []
  const placeholder = (i: number) => `\x00BLOCK${i}\x00`

  let processed = text

  // Display math: $$...$$
  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => {
    const i = blocks.length; blocks.push(renderMath(m.trim(), true)); return placeholder(i)
  })

  // Fenced code blocks: ```lang\n...\n```
  processed = processed.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const i = blocks.length
    const langLabel = lang || 'code'
    const id = `copy-${Date.now()}-${i}`
    const escaped = escapeHtml(code.trim())
    blocks.push(`<div class="jarvis-code-block">
      <div class="jarvis-code-header">
        <span class="jarvis-code-lang">${escapeHtml(langLabel)}</span>
        <button class="jarvis-copy-btn" data-code="${escaped.replace(/"/g,'&quot;')}" id="${id}" onclick="(function(el){navigator.clipboard.writeText(el.getAttribute('data-code')).then(()=>{el.textContent='COPIED';setTimeout(()=>el.textContent='COPY',1500)});})(this)">COPY</button>
      </div>
      <div class="jarvis-code-content">${escaped}</div>
    </div>`)
    return placeholder(i)
  })

  // Inline code: `...`
  processed = processed.replace(/`([^`]+)`/g, (_, c) => {
    const i = blocks.length; blocks.push(`<code class="jarvis-inline-code">${escapeHtml(c)}</code>`); return placeholder(i)
  })

  // ── Pass 2: markdown rendering line by line ───────────────────────────────
  const lines = processed.split('\n')
  const out: string[] = []
  let inTable = false
  let tableRows: string[] = []

  const flushTable = () => {
    if (!tableRows.length) return
    const [header, sep, ...body] = tableRows
    if (!sep) { out.push(...tableRows.map(r => `<p>${r}</p>`)); tableRows = []; inTable = false; return }
    const ths = header.split('|').filter((_,i,a) => i>0 && i<a.length-1).map(h => `<th>${h.trim()}</th>`).join('')
    const trs = body.map(r => '<tr>' + r.split('|').filter((_,i,a) => i>0 && i<a.length-1).map(c => `<td>${inlinePass(c.trim())}</td>`).join('') + '</tr>').join('')
    out.push(`<div class="jarvis-table-wrap"><table class="jarvis-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table></div>`)
    tableRows = []; inTable = false
  }

  // Inline pass: bold, italic, inline math
  const inlinePass = (s: string): string => {
    // Inline math: $...$
    s = s.replace(/\$([^$\n]+?)\$/g, (_, m) => renderMath(m, false))
    s = s.replace(/\*\*([^*]+)\*\*/g, '<span class="jarvis-bold">$1</span>')
    s = s.replace(/\*([^*]+)\*/g, '<span class="jarvis-em">$1</span>')
    s = s.replace(/__([^_]+)__/g, '<span class="jarvis-bold">$1</span>')
    s = s.replace(/_([^_]+)_/g, '<span class="jarvis-em">$1</span>')
    return s
  }

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Table detection
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (!inTable) inTable = true
      tableRows.push(line.trim()); i++; continue
    } else if (inTable) { flushTable() }

    // Headers
    if (/^### /.test(line)) { out.push(`<div class="jarvis-h3">${inlinePass(line.slice(4))}</div>`); i++; continue }
    if (/^## /.test(line))  { out.push(`<div class="jarvis-h2">${inlinePass(line.slice(3))}</div>`); i++; continue }
    if (/^# /.test(line))   { out.push(`<div class="jarvis-h1">${inlinePass(line.slice(2))}</div>`); i++; continue }

    // Blockquote
    if (/^> /.test(line)) { out.push(`<div class="jarvis-blockquote">${inlinePass(line.slice(2))}</div>`); i++; continue }

    // HR
    if (/^---+$/.test(line.trim())) { out.push('<hr class="jarvis-hr" />'); i++; continue }

    // Unordered list items
    if (/^[-*+] /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*+] /.test(lines[i])) {
        items.push(`<li>${inlinePass(lines[i].slice(2))}</li>`); i++
      }
      out.push(`<ul class="jarvis-ul">${items.join('')}</ul>`)
      continue
    }

    // Ordered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(`<li>${inlinePass(lines[i].replace(/^\d+\. /, ''))}</li>`); i++
      }
      out.push(`<ol class="jarvis-ol">${items.join('')}</ol>`)
      continue
    }

    // Empty line
    if (!line.trim()) { out.push('<br/>'); i++; continue }

    // Paragraph
    out.push(`<p style="margin:4px 0;line-height:1.65;font-family:'Rajdhani',sans-serif;font-size:14px;color:#c8f0ff;">${inlinePass(line)}</p>`)
    i++
  }

  if (inTable) flushTable()

  // ── Pass 3: restore protected blocks ─────────────────────────────────────
  let html = out.join('\n')
  blocks.forEach((b, i) => { html = html.replace(placeholder(i), b) })
  return html
}

// ── Rich message component ────────────────────────────────────────────────
function JarvisMessage({ text, role }: { text: string; role: 'user' | 'jarvis' }) {
  const [html, setHtml] = useState('')
  const [libsReady, setLibsReady] = useState(false)
  const divRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js'),
    ]).then(() => setLibsReady(true)).catch(() => setLibsReady(true))
  }, [])

  useEffect(() => {
    if (role === 'user') { setHtml(text); return }
    setHtml(renderRichText(text))
  }, [text, role, libsReady])

  if (role === 'user') {
    return <span style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 14, lineHeight: 1.6, color: '#ffe0a0' }}>{text}</span>
  }

  return (
    <div
      ref={divRef}
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: 14, lineHeight: 1.65, color: '#c8f0ff' }}
    />
  )
}

type Message  = { id: string; role: 'user' | 'jarvis'; text: string; time: string }
type Status   = 'offline' | 'idle' | 'listening' | 'thinking' | 'speaking'
type Language = { code: string; label: string; speechLang: string; gttsLang: string; gttsTld: string; wakeWords: string[]; listeningMsg: string; activatedMsg: string }

const LANGUAGES: Language[] = [
  { code:'en', label:'🇬🇧 English',   speechLang:'en-US', gttsLang:'en', gttsTld:'co.uk', wakeWords:['jarvis','jarvi','jarve','jarvey','harvey','harris','service','jarv'], listeningMsg:"Yes sir, I'm listening...", activatedMsg:'ACTIVATED' },
  { code:'hi', label:'🇮🇳 Hindi',     speechLang:'hi-IN', gttsLang:'hi', gttsTld:'co.in', wakeWords:['जार्विस','jarvis','jarvi','jarve','jarvey','harvey','harris','service','jarv'], listeningMsg:'जी सर, मैं सुन रहा हूँ...', activatedMsg:'सक्रिय' },
  { code:'kn', label:'🇮🇳 Kannada',   speechLang:'kn-IN', gttsLang:'kn', gttsTld:'co.in', wakeWords:['ಜಾರ್ವಿಸ್','jarvis','jarvi','jarve','jarvey','harvey','harris','service','jarv'], listeningMsg:'ಹೌದು ಸರ್, ನಾನು ಕೇಳುತ್ತಿದ್ದೇನೆ...', activatedMsg:'ಸಕ್ರಿಯ' },
  { code:'ta', label:'🇮🇳 Tamil',     speechLang:'ta-IN', gttsLang:'ta', gttsTld:'co.in', wakeWords:['ஜார்விஸ்','jarvis','jarvi','jarve','jarvey','harvey','harris','service','jarv'], listeningMsg:'ஆம் சார், நான் கேட்கிறேன்...', activatedMsg:'செயலில்' },
  { code:'te', label:'🇮🇳 Telugu',    speechLang:'te-IN', gttsLang:'te', gttsTld:'co.in', wakeWords:['జార్విస్','jarvis','jarvi','jarve','jarvey','harvey','harris','service','jarv'], listeningMsg:'అవును సార్, నేను వింటున్నాను...', activatedMsg:'సక్రియం' },
  { code:'ml', label:'🇮🇳 Malayalam', speechLang:'ml-IN', gttsLang:'ml', gttsTld:'co.in', wakeWords:['ജാർവിസ്','jarvis','jarvi','jarve','jarvey','harvey','harris','service','jarv'], listeningMsg:'അതെ സർ, ഞാൻ കേൾക്കുന്നു...', activatedMsg:'സജീവം' },
  { code:'mr', label:'🇮🇳 Marathi',   speechLang:'mr-IN', gttsLang:'mr', gttsTld:'co.in', wakeWords:['जार्विस','jarvis','jarvi','jarve','jarvey','harvey','harris','service','jarv'], listeningMsg:'होय सर, मी ऐकतोय...', activatedMsg:'सक्रिय' },
]

const UI_TEXT: Record<string, { dropdownHint:string; emptyState:string; emptyCmd:string; statusHint:string[]; howTo:{s:string;t:string}[]; clearMemory:string; ttsLabel:string; speechLabel:string }> = {
  en: { dropdownHint:'Say "JARVIS" then speak your command', emptyState:'Say "JARVIS" to begin', emptyCmd:"Didn't catch that, sir. Say JARVIS then your command.", statusHint:['Say "JARVIS" clearly','then speak your command.'], howTo:[{s:'01',t:'Allow mic access in Chrome'},{s:'02',t:'Wait for ONLINE status'},{s:'03',t:'Say "JARVIS" out loud'},{s:'04',t:'Speak your command (7s)'},{s:'05',t:'JARVIS replies with voice'}], clearMemory:'Memory cleared, sir.', ttsLabel:'EDGE TTS EN-GB', speechLabel:'en-US' },
  hi: { dropdownHint:'"JARVIS" बोलें फिर हिंदी में कमांड दें', emptyState:'"JARVIS" बोलकर शुरू करें', emptyCmd:'सर, मैं समझ नहीं पाया। JARVIS बोलकर फिर से कमांड दें।', statusHint:['JARVIS बोलें','फिर हिंदी में बात करें'], howTo:[{s:'01',t:'Chrome में mic allow करें'},{s:'02',t:'ONLINE status का इंतज़ार करें'},{s:'03',t:'"JARVIS" ज़ोर से बोलें'},{s:'04',t:'हिंदी में कमांड दें (7s)'},{s:'05',t:'JARVIS हिंदी में जवाब देगा'}], clearMemory:'मेमोरी साफ कर दी गई, सर।', ttsLabel:'EDGE TTS HI-IN', speechLabel:'hi-IN' },
  kn: { dropdownHint:'"JARVIS" ಎಂದು ಹೇಳಿ ನಂತರ ಕನ್ನಡದಲ್ಲಿ ಮಾತಾಡಿ', emptyState:'"JARVIS" ಎಂದು ಹೇಳಿ ಪ್ರಾರಂಭಿಸಿ', emptyCmd:'ಸರ್, ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ.', statusHint:['JARVIS ಎಂದು ಹೇಳಿ','ನಂತರ ಕನ್ನಡದಲ್ಲಿ ಮಾತಾಡಿ'], howTo:[{s:'01',t:'Chrome ನಲ್ಲಿ mic ಅನುಮತಿಸಿ'},{s:'02',t:'ONLINE ಸ್ಥಿತಿಗಾಗಿ ಕಾಯಿರಿ'},{s:'03',t:'"JARVIS" ಜೋರಾಗಿ ಹೇಳಿ'},{s:'04',t:'ಕನ್ನಡದಲ್ಲಿ ಮಾತಾಡಿ (7s)'},{s:'05',t:'JARVIS ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸುತ್ತಾನೆ'}], clearMemory:'ಮೆಮೊರಿ ತೆರವುಗೊಳಿಸಲಾಗಿದೆ, ಸರ್.', ttsLabel:'EDGE TTS KN-IN', speechLabel:'kn-IN' },
  ta: { dropdownHint:'"JARVIS" சொல்லி பிறகு தமிழில் கட்டளை கொடுங்கள்', emptyState:'"JARVIS" சொல்லி தொடங்குங்கள்', emptyCmd:'சார், புரியவில்லை.', statusHint:['"JARVIS" சொல்லுங்கள்','தமிழில் கட்டளை கொடுங்கள்'], howTo:[{s:'01',t:'Chrome-ல் mic அனுமதி கொடுங்கள்'},{s:'02',t:'ONLINE நிலைக்காக காத்திருங்கள்'},{s:'03',t:'"JARVIS" சத்தமாக சொல்லுங்கள்'},{s:'04',t:'தமிழில் கட்டளை கொடுங்கள் (7s)'},{s:'05',t:'JARVIS தமிழில் பதில் சொல்வான்'}], clearMemory:'நினைவகம் அழிக்கப்பட்டது, சார்.', ttsLabel:'EDGE TTS TA-IN', speechLabel:'ta-IN' },
  te: { dropdownHint:'"JARVIS" అని చెప్పి తెలుగులో ఆదేశించండి', emptyState:'"JARVIS" అని చెప్పి ప్రారంభించండి', emptyCmd:'సార్, అర్థం కాలేదు.', statusHint:['"JARVIS" అని చెప్పండి','తెలుగులో మాట్లాడండి'], howTo:[{s:'01',t:'Chrome లో mic అనుమతించండి'},{s:'02',t:'ONLINE స్థితి కోసం వేచి ఉండండి'},{s:'03',t:'"JARVIS" గట్టిగా చెప్పండి'},{s:'04',t:'తెలుగులో ఆదేశించండి (7s)'},{s:'05',t:'JARVIS తెలుగులో జవాబిస్తాడు'}], clearMemory:'మెమరీ క్లియర్ చేయబడింది, సార్.', ttsLabel:'EDGE TTS TE-IN', speechLabel:'te-IN' },
  ml: { dropdownHint:'"JARVIS" പറഞ്ഞ് മലയാളത്തിൽ കമാൻഡ് നൽകൂ', emptyState:'"JARVIS" പറഞ്ഞ് തുടങ്ങൂ', emptyCmd:'സർ, മനസ്സിലായില്ല.', statusHint:['"JARVIS" പറഞ്ഞ്','മലയാളത്തിൽ കമാൻഡ് നൽകൂ'], howTo:[{s:'01',t:'Chrome-ൽ mic അനുവദിക്കൂ'},{s:'02',t:'ONLINE സ്ഥിതിക്കായി കാത്തിരിക്കൂ'},{s:'03',t:'"JARVIS" ഉറക്കെ പറഞ്ഞൂ'},{s:'04',t:'മലയാളത്തിൽ കമാൻഡ് നൽകൂ (7s)'},{s:'05',t:'JARVIS മലയാളത്തിൽ മറുപടി നൽകും'}], clearMemory:'മെമ്മറി ക്ലിയർ ചെയ്തു, സർ.', ttsLabel:'EDGE TTS ML-IN', speechLabel:'ml-IN' },
  mr: { dropdownHint:'"JARVIS" म्हणा मग मराठीत कमांड द्या', emptyState:'"JARVIS" म्हणून सुरू करा', emptyCmd:'सर, समजलं नाही.', statusHint:['"JARVIS" स्पष्टपणे म्हणा','मग मराठीत बोला'], howTo:[{s:'01',t:'Chrome मध्ये mic परवानगी द्या'},{s:'02',t:'ONLINE स्थितीची प्रतीक्षा करा'},{s:'03',t:'"JARVIS" मोठ्याने म्हणा'},{s:'04',t:'मराठीत कमांड द्या (7s)'},{s:'05',t:'JARVIS मराठीत उत्तर देईल'}], clearMemory:'मेमरी साफ केली, सर.', ttsLabel:'EDGE TTS MR-IN', speechLabel:'mr-IN' },
}

const BACKEND = 'https://edugram-608857399645.asia-south1.run.app/api'
// const BACKEND = "http://0.0.0.0:8000/api"

export default function JarvisPage() {
  const [messages, setMessages]     = useState<Message[]>([])
  const [status, setStatus]         = useState<Status>('offline')
  const [isReady, setIsReady]       = useState(false)
  const [currentTime, setTime]      = useState('')
  const [transcript, setTranscript] = useState('')
  const [debugLog, setDebugLog]     = useState<string[]>([])
  const [showDebug, setShowDebug]   = useState(false)
  const [cursorPos, setCursorPos]   = useState({ x: -100, y: -100 })
  const [langCode, setLangCode]     = useState('en')

  const readyRef        = useRef(false)
  const capturingRef    = useRef(false)
  const speakingRef     = useRef(false)
  const cmdTextRef      = useRef('')
  const cmdTimerRef     = useRef<any>(null)
  const wakeRef         = useRef<any>(null)
  const cmdRef          = useRef<any>(null)
  const messagesEnd     = useRef<HTMLDivElement>(null)
  const wakeMatchedRef  = useRef(false)
  const wakeStartingRef = useRef(false)
  const initRanRef      = useRef(false)
  const audioCtxRef     = useRef<AudioContext | null>(null)
  const langRef         = useRef<Language>(LANGUAGES[0])

  useEffect(() => {
    const tag = document.createElement('style')
    tag.id = 'jarvis-styles'
    tag.textContent = JARVIS_STYLES
    document.head.appendChild(tag)
    document.body.classList.add('jarvis-active')
    // Preload KaTeX
    loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js').catch(() => {})
    return () => { tag.remove(); document.body.classList.remove('jarvis-active') }
  }, [])

  useEffect(() => {
    langRef.current = LANGUAGES.find(l => l.code === langCode) ?? LANGUAGES[0]
  }, [langCode])

  const dbg = (m: string) => {
    console.log('[J]', m)
    setDebugLog(p => [`${new Date().toLocaleTimeString()} ${m}`, ...p.slice(0, 49)])
  }

  const addMsg = (role: 'user' | 'jarvis', text: string) =>
    setMessages(p => [...p, { id: `${Date.now()}-${Math.random()}`, role, text, time: new Date().toLocaleTimeString('en-US', { hour12: false }) }])

  const beep = (f: number, v: number, d: number) => {
    try {
      const c = audioCtxRef.current || new AudioContext()
      const o = c.createOscillator(), g = c.createGain()
      o.connect(g); g.connect(c.destination)
      o.frequency.value = f; o.type = 'sine'
      g.gain.setValueAtTime(v, c.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d)
      o.start(); o.stop(c.currentTime + d)
    } catch {}
  }

  const unlockAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
      dbg("AudioContext created")
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume().then(() => dbg("AudioContext unlocked ✓"))
    }
    try {
      const ctx = audioCtxRef.current
      const buf = ctx.createBuffer(1, 1, 22050)
      const src = ctx.createBufferSource()
      src.buffer = buf; src.connect(ctx.destination); src.start(0)
    } catch {}
  }

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-US', { hour12: false }))
    tick(); const i = setInterval(tick, 1000); return () => clearInterval(i)
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => setCursorPos({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', h); return () => window.removeEventListener('mousemove', h)
  }, [])

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    if (initRanRef.current) return
    initRanRef.current = true
    init()
  }, [])

  async function init() {
    dbg('Connecting to backend...')
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SR) { addMsg('jarvis', '⚠️ Speech recognition not supported. Please use Google Chrome.'); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop())
      dbg('Microphone permission: ✓')
    } catch {
      addMsg('jarvis', '⚠️ Microphone access denied. Allow it in Chrome and refresh.')
      return
    }
    try {
      const r = await fetch(`${BACKEND}/health/`)
      const d = await r.json()
      if (d.status === 'online') {
        readyRef.current = true; setIsReady(true); setStatus('idle')
        addMsg('jarvis', "Systems online. I'm JARVIS. Say my name to activate, sir.")
        dbg('Backend OK — starting wake loop')
        startWake()
      }
    } catch {
      dbg('Backend unreachable, retrying in 3s...')
      addMsg('jarvis', 'Cannot reach backend. Make sure Django is running on port 8000.')
      setTimeout(init, 3000)
    }
  }

  function startWake() {
    if (wakeStartingRef.current || !readyRef.current || capturingRef.current || speakingRef.current) return
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SR) return
    wakeMatchedRef.current = false; wakeStartingRef.current = true
    if (wakeRef.current) { try { wakeRef.current.abort() } catch {} wakeRef.current = null }
    setTimeout(() => {
      wakeStartingRef.current = false
      if (!readyRef.current || capturingRef.current || speakingRef.current) return
      const lang = langRef.current
      const r = new SR()
      r.continuous = false; r.interimResults = false; r.lang = lang.speechLang; r.maxAlternatives = 5
      wakeRef.current = r
      r.onstart = () => dbg(`🎙️ Wake mic open [${lang.speechLang}] — say JARVIS`)
      r.onerror = (e: any) => {
        dbg('Wake error: ' + e.error); wakeRef.current = null
        if (e.error === 'not-allowed') { addMsg('jarvis', '⚠️ Mic denied. Please allow microphone and refresh.'); return }
        if (e.error === 'aborted') return
        if (!capturingRef.current && !speakingRef.current && readyRef.current) setTimeout(startWake, 800)
      }
      r.onend = () => {
        dbg('Wake closed — matched=' + wakeMatchedRef.current); wakeRef.current = null
        if (!wakeMatchedRef.current && !capturingRef.current && !speakingRef.current && readyRef.current)
          setTimeout(startWake, 300)
      }
      r.onresult = (e: any) => {
        for (let i = 0; i < e.results.length; i++) {
          for (let a = 0; a < e.results[i].length; a++) {
            const t = e.results[i][a].transcript.toLowerCase().trim()
            dbg(`Wake heard [alt ${a}]: "${t}"`)
            if (langRef.current.wakeWords.some(w => t.includes(w))) {
              wakeMatchedRef.current = true; capturingRef.current = true
              dbg('✅ WAKE WORD MATCHED')
              beep(880, 0.2, 0.12); setTimeout(() => beep(1200, 0.15, 0.1), 140)
              setStatus('listening'); addMsg('jarvis', lang.listeningMsg)
              try { wakeRef.current?.abort() } catch {}
              setTimeout(startCapture, 500); return
            }
          }
        }
        dbg('Wake: no match in result')
      }
      try { r.start(); dbg('Wake recognition started') }
      catch (e: any) { dbg('Wake start threw: ' + e); wakeRef.current = null; wakeStartingRef.current = false; setTimeout(startWake, 1000) }
    }, 350)
  }

  function startCapture() {
    dbg('Command capture start — 7s window')
    cmdTextRef.current = ''; setTranscript('')
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    if (!SR) return
    const lang = langRef.current
    const r = new SR()
    r.continuous = true; r.interimResults = true; r.lang = lang.speechLang; r.maxAlternatives = 1
    cmdRef.current = r
    r.onstart  = () => dbg(`🎙️ Command mic open [${lang.speechLang}]`)
    r.onerror  = (e: any) => {
      dbg('Cmd error: ' + e.error)
      if (cmdTimerRef.current) { clearTimeout(cmdTimerRef.current); cmdTimerRef.current = null }
      processCmd(cmdTextRef.current)
    }
    r.onresult = (e: any) => {
      let full = ''
      for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript + ' '
      cmdTextRef.current = full.trim(); setTranscript(cmdTextRef.current)
    }
    r.start()
    cmdTimerRef.current = setTimeout(() => {
      dbg('7s up — processing: "' + cmdTextRef.current + '"')
      try { r.stop() } catch {}
      processCmd(cmdTextRef.current)
    }, 7000)
  }

  async function processCmd(raw: string) {
    capturingRef.current = false; wakeMatchedRef.current = false; setTranscript('')
    if (cmdTimerRef.current) { clearTimeout(cmdTimerRef.current); cmdTimerRef.current = null }
    const text = raw.replace(/^(jarvis[,.]?\s*|जार्विस[,.]?\s*)/gi, '').trim()
    dbg('Processing: "' + text + '"')
    if (!text) {
      setStatus('idle'); addMsg('jarvis', (UI_TEXT[langRef.current.code] ?? UI_TEXT['en']).emptyCmd)
      setTimeout(startWake, 500); return
    }
    addMsg('user', text); setStatus('thinking')
    try {
      const res  = await fetch(`${BACKEND}/chat/`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ text, language: langRef.current.code }) })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      addMsg('jarvis', data.reply); setStatus('speaking'); speakingRef.current = true
      const done = () => { speakingRef.current = false; setStatus('idle'); beep(440,0.06,0.1); dbg('TTS done — restarting wake'); setTimeout(startWake, 600) }
      try {
        const binary = atob(data.audio); const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
        const ctx = audioCtxRef.current
        if (ctx.state === 'suspended') await ctx.resume()
        const audioBuffer = await ctx.decodeAudioData(bytes.buffer)
        const source = ctx.createBufferSource()
        source.buffer = audioBuffer; source.connect(ctx.destination); source.onended = done; source.start()
        dbg('AudioContext playback started')
      } catch (audioErr: any) {
        dbg('AudioContext failed, fallback: ' + audioErr.message)
        const audio = new Audio(`data:audio/${data.audio_format};base64,${data.audio}`)
        audio.onended = done; audio.onerror = done; audio.play().catch(done)
      }
    } catch (e: any) {
      dbg('Chat error: ' + e.message); setStatus('idle'); speakingRef.current = false
      addMsg('jarvis', 'Error: ' + e.message); setTimeout(startWake, 500)
    }
  }

  const STATUS_LABEL: Record<Status,string> = { offline:'OFFLINE', idle:'STANDBY', listening:'LISTENING', thinking:'PROCESSING', speaking:'RESPONDING' }
  const STATUS_COLOR: Record<Status,string> = { offline:'#ff3030', idle:'#ffa500', listening:'#00ff88', thinking:'#00d4ff', speaking:'#aa88ff' }
  const bars = Array.from({ length: 24 })
  const active = status === 'listening' || status === 'thinking' || status === 'speaking'
  const currentLang = LANGUAGES.find(l => l.code === langCode) ?? LANGUAGES[0]
  const ui = UI_TEXT[langCode] ?? UI_TEXT['en']

  return (
    <div style={{ minHeight:'100vh', background:'#010a0f' }} onClick={unlockAudio}>
      <div className="cursor"     style={{ left:cursorPos.x, top:cursorPos.y }} />
      <div className="cursor-dot" style={{ left:cursorPos.x, top:cursorPos.y }} />
      <div className="grid-bg" />

      {[{t:20,l:20,bt:'borderTop',bl:'borderLeft'},{t:20,r:20,bt:'borderTop',bl:'borderRight'},{b:20,l:20,bt:'borderBottom',bl:'borderLeft'},{b:20,r:20,bt:'borderBottom',bl:'borderRight'}].map((c,i)=>(
        <div key={i} style={{ position:'fixed', ...(c.t?{top:c.t}:{}), ...(c.b?{bottom:c.b}:{}), ...(c.l?{left:c.l}:{}), ...(c.r?{right:c.r}:{}), width:60, height:60, [c.bt]:'2px solid rgba(0,212,255,0.4)', [c.bl]:'2px solid rgba(0,212,255,0.4)', pointerEvents:'none' }} />
      ))}

      <div onClick={e=>{e.stopPropagation();setShowDebug(p=>!p)}} style={{ position:'fixed', bottom:28, left:'50%', transform:'translateX(-50%)', zIndex:200, cursor:'none', fontSize:9, fontFamily:'Share Tech Mono', color:'rgba(0,212,255,0.3)', letterSpacing:2, userSelect:'none' }}>
        {showDebug?'▲ HIDE DEBUG':'▼ DEBUG LOG'}
      </div>
      {showDebug && (
        <div style={{ position:'fixed', bottom:48, left:'50%', transform:'translateX(-50%)', width:560, maxHeight:220, overflowY:'auto', background:'rgba(0,5,10,0.97)', border:'1px solid rgba(0,212,255,0.25)', padding:12, zIndex:199, borderRadius:4 }}>
          {debugLog.map((l,i)=><div key={i} className="mono" style={{ fontSize:10, color:l.includes('✅')||l.includes('✓')?'#00ff88':l.includes('ERROR')||l.includes('error')?'#ff6060':'rgba(0,212,255,0.7)', lineHeight:1.6 }}>{l}</div>)}
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', height:'100vh', padding:20, gap:12 }}>

        {/* HEADER */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 8px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <h1 className="orbitron glow-text" style={{ fontSize:28, fontWeight:900, letterSpacing:8, color:'#00d4ff' }}>J.A.R.V.I.S</h1>
            <span className="mono" style={{ fontSize:11, color:'#4a8fa8', letterSpacing:2 }}>v4.2.1 // ALROY INDUSTRIES</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:24 }}>
            <div style={{ textAlign:'right' }}>
              <div className="mono" style={{ fontSize:22, color:'#00d4ff', letterSpacing:3 }}>{currentTime}</div>
              <div className="mono" style={{ fontSize:10, color:'#4a8fa8', letterSpacing:2 }}>{new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}).toUpperCase()}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div className={`status-dot${status==='offline'?' offline':status==='idle'?' idle':''}`} style={status!=='offline'&&status!=='idle'?{background:STATUS_COLOR[status],boxShadow:`0 0 8px ${STATUS_COLOR[status]}`}:{}} />
              <span className="orbitron" style={{ fontSize:11, color:STATUS_COLOR[status], letterSpacing:2 }}>{STATUS_LABEL[status]}</span>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div style={{ display:'flex', flex:1, gap:12, minHeight:0 }}>

          {/* LEFT */}
          <div style={{ width:220, display:'flex', flexDirection:'column', gap:12 }}>
            <div className="panel" style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:20, gap:16 }}>
              <div className="mono" style={{ fontSize:10, color:'#4a8fa8', letterSpacing:3 }}>ARC REACTOR</div>
              <div style={{ position:'relative', width:140, height:140 }}>
                <div className="animate-ring-rotate"  style={{ position:'absolute', inset:0,  border:'2px solid transparent', borderTop:'2px solid #00d4ff', borderRight:'2px solid rgba(0,212,255,0.3)', borderRadius:'50%' }} />
                <div className="animate-ring-reverse" style={{ position:'absolute', inset:12, border:'1px solid transparent', borderBottom:'1px solid #00d4ff', borderLeft:'1px solid rgba(0,212,255,0.5)', borderRadius:'50%' }} />
                <div className="animate-ring-rotate"  style={{ position:'absolute', inset:24, border:'2px dashed rgba(0,212,255,0.3)', borderRadius:'50%', animationDuration:'4s' }} />
                <div className="animate-arc-pulse"    style={{ position:'absolute', inset:36, background:'radial-gradient(circle, rgba(0,212,255,0.9) 0%, rgba(0,180,220,0.6) 40%, rgba(0,100,150,0.2) 70%, transparent 100%)', borderRadius:'50%', border:'1px solid #00d4ff' }} />
                <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:16, height:16, background:'#00d4ff', borderRadius:'50%', boxShadow:'0 0 20px #00d4ff,0 0 40px #00d4ff' }} />
                {[0,60,120,180,240,300].map(a=>(
                  <div key={a} style={{ position:'absolute', top:'50%', left:'50%', width:1, height:34, background:'rgba(0,212,255,0.4)', transformOrigin:'top center', transform:`translateX(-50%) rotate(${a}deg)` }} />
                ))}
              </div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:40 }}>
                {bars.map((_,i)=>(
                  <div key={i} style={{ width:4, height:'100%', borderRadius:2, transformOrigin:'bottom', background:status==='listening'?'rgba(0,255,136,0.8)':status==='speaking'?'rgba(170,136,255,0.8)':status==='thinking'?'rgba(0,212,255,0.8)':'rgba(0,212,255,0.15)', animation:active?`jarvisWaveform ${0.3+(i*0.07)%0.6}s ease-in-out infinite alternate`:'none', transform:active?undefined:'scaleY(0.2)' }} />
                ))}
              </div>
              {transcript && <div className="mono" style={{ fontSize:10, color:'#00ff88', textAlign:'center', lineHeight:1.4, padding:'0 8px', wordBreak:'break-word' }}>"{transcript}"</div>}
              {status==='listening' && !transcript && <div className="orbitron" style={{ fontSize:11, color:'#00ff88', letterSpacing:3 }}>{currentLang.activatedMsg}</div>}
            </div>

            <div className="panel" style={{ padding:14, display:'flex', flexDirection:'column', gap:10 }}>
              <div className="mono" style={{ fontSize:10, color:'#4a8fa8', letterSpacing:3 }}>LANGUAGE</div>
              <select value={langCode} onChange={e=>{ setLangCode(e.target.value); if(wakeRef.current){try{wakeRef.current.abort()}catch{}wakeRef.current=null}; wakeMatchedRef.current=false; wakeStartingRef.current=false; if(!capturingRef.current&&!speakingRef.current&&readyRef.current)setTimeout(startWake,400) }} onClick={e=>e.stopPropagation()} style={{ background:'rgba(0,10,20,0.9)', border:'1px solid rgba(0,212,255,0.4)', borderRadius:4, color:'#00d4ff', fontFamily:'Share Tech Mono, monospace', fontSize:12, padding:'6px 8px', width:'100%', cursor:'pointer', outline:'none', letterSpacing:1 }}>
                {LANGUAGES.map(l=><option key={l.code} value={l.code} style={{ background:'#000d1a', color:'#00d4ff' }}>{l.label}</option>)}
              </select>
              <div className="mono" style={{ fontSize:9, color:'rgba(0,212,255,0.4)', lineHeight:1.6 }}>{ui.dropdownHint}</div>
            </div>

            <div className="panel" style={{ padding:14, display:'flex', flexDirection:'column', gap:8 }}>
              {[{l:'WAKE WORD',v:'JARVIS'},{l:'LISTEN TIME',v:'7 SEC'},{l:'ENGINE',v:'BERT/BART Transformer'},{l:'TTS',v:'EDGE TTS'},{l:'MATH',v:'KaTeX'},{l:'SPEECH',v:ui.speechLabel}].map(x=>(
                <div key={x.l} style={{ display:'flex', justifyContent:'space-between' }}>
                  <span className="mono" style={{ fontSize:9, color:'#4a8fa8', letterSpacing:1 }}>{x.l}</span>
                  <span className="mono" style={{ fontSize:10, color:'#00d4ff' }}>{x.v}</span>
                </div>
              ))}
            </div>

            {isReady && <button className="btn-arc" onClick={async e=>{ e.stopPropagation(); await fetch(`${BACKEND}/reset/`,{method:'POST'}).catch(()=>{}); setMessages([]); addMsg('jarvis',ui.clearMemory) }} style={{ width:'100%' }}>CLEAR MEMORY</button>}
          </div>

          {/* CENTER — conversation log with rich rendering */}
          <div className="panel" style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
            <div style={{ padding:'12px 20px', borderBottom:'1px solid rgba(0,212,255,0.15)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span className="mono" style={{ fontSize:11, color:'#4a8fa8', letterSpacing:2 }}>CONVERSATION LOG</span>
              <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                <span className="mono" style={{ fontSize:9, color:'rgba(0,212,255,0.35)', letterSpacing:1 }}>MATH • CODE • TABLES</span>
                <span className="mono" style={{ fontSize:11, color:'#00d4ff' }}>{messages.length} ENTRIES</span>
              </div>
            </div>
            <div className="scrollable" style={{ flex:1, padding:20, display:'flex', flexDirection:'column', gap:16 }}>
              {messages.length===0 && (
                <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
                  <div className="orbitron glow-text" style={{ fontSize:14, letterSpacing:4, color:'rgba(0,212,255,0.3)' }}>AWAITING INPUT</div>
                  <div className="mono" style={{ fontSize:11, color:'rgba(0,212,255,0.2)', textAlign:'center', lineHeight:1.8 }}>{ui.emptyState}</div>
                  {/* Capability hint */}
                  <div style={{ marginTop:8, display:'flex', gap:8, flexWrap:'wrap', justifyContent:'center' }}>
                    {['∑ Equations','</> Code','⊞ Tables','▸ Derivations'].map(tag=>(
                      <span key={tag} className="mono" style={{ fontSize:9, color:'rgba(0,212,255,0.25)', border:'1px solid rgba(0,212,255,0.12)', borderRadius:3, padding:'3px 8px', letterSpacing:1 }}>{tag}</span>
                    ))}
                  </div>
                </div>
              )}
              {messages.map(m=>(
                <div key={m.id} className={m.role==='user'?'msg-user':'msg-jarvis'} style={{ display:'flex', flexDirection:m.role==='user'?'row-reverse':'row', alignItems:'flex-start', gap:12 }}>
                  <div style={{ width:32, height:32, border:`1px solid ${m.role==='user'?'rgba(255,165,0,0.6)':'rgba(0,212,255,0.6)'}`, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background:m.role==='user'?'rgba(255,165,0,0.1)':'rgba(0,212,255,0.1)' }}>
                    <span className="orbitron" style={{ fontSize:9, color:m.role==='user'?'#ffa500':'#00d4ff' }}>{m.role==='user'?'YOU':'AI'}</span>
                  </div>
                  <div style={{ maxWidth:'78%' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexDirection:m.role==='user'?'row-reverse':'row' }}>
                      <span className="mono" style={{ fontSize:10, color:m.role==='user'?'#ffa500':'#00d4ff', letterSpacing:1 }}>{m.role==='user'?'OPERATOR':'JARVIS'}</span>
                      <span className="mono" style={{ fontSize:9, color:'#4a8fa8' }}>{m.time}</span>
                    </div>
                    <div style={{ padding:'10px 14px', background:m.role==='user'?'rgba(255,165,0,0.07)':'rgba(0,212,255,0.07)', border:`1px solid ${m.role==='user'?'rgba(255,165,0,0.2)':'rgba(0,212,255,0.2)'}`, borderRadius:m.role==='user'?'8px 2px 8px 8px':'2px 8px 8px 8px' }}>
                      <JarvisMessage text={m.text} role={m.role} />
                    </div>
                  </div>
                </div>
              ))}
              {status==='thinking' && (
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:32, height:32, border:'1px solid rgba(0,212,255,0.6)', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,212,255,0.1)' }}>
                    <span className="orbitron" style={{ fontSize:9, color:'#00d4ff' }}>AI</span>
                  </div>
                  <div style={{ padding:'10px 14px', background:'rgba(0,212,255,0.07)', border:'1px solid rgba(0,212,255,0.2)', borderRadius:'2px 8px 8px 8px', display:'flex', gap:6, alignItems:'center' }}>
                    {[0,1,2].map(i=><div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#00d4ff', animation:`arcPulse 1s ease-in-out ${i*0.2}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={messagesEnd} />
            </div>
          </div>

          {/* RIGHT */}
          <div style={{ width:220, display:'flex', flexDirection:'column', gap:12 }}>
            <div className="panel" style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
              <div className="mono" style={{ fontSize:10, color:'#4a8fa8', letterSpacing:3 }}>SYSTEM STATUS</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div className={`status-dot${!isReady?' offline':''}`} />
                <span className="mono" style={{ fontSize:11, color:isReady?'#00ff88':'#ff3030' }}>{isReady?'ONLINE':'CONNECTING...'}</span>
              </div>
              <div className="mono" style={{ fontSize:10, color:'#4a8fa8', lineHeight:1.8 }}>
                {isReady ? <span style={{ color:'#ffa500' }}>{ui.statusHint[0]}<br/>{ui.statusHint[1]}</span> : <>Connecting to Django...<br/>python manage.py runserver</>}
              </div>
            </div>

            <div className="panel" style={{ padding:16, display:'flex', flexDirection:'column', gap:10 }}>
              <div className="mono" style={{ fontSize:10, color:'#4a8fa8', letterSpacing:3 }}>HOW TO USE</div>
              {ui.howTo.map(x=>(
                <div key={x.s} style={{ display:'flex', gap:10 }}>
                  <span className="orbitron" style={{ fontSize:10, color:'#00d4ff', flexShrink:0 }}>{x.s}</span>
                  <span className="mono" style={{ fontSize:10, color:'#4a8fa8', lineHeight:1.5 }}>{x.t}</span>
                </div>
              ))}
            </div>

            {/* Rich Content Cheatsheet */}
            <div className="panel" style={{ padding:14, display:'flex', flexDirection:'column', gap:8 }}>
              <div className="mono" style={{ fontSize:10, color:'#4a8fa8', letterSpacing:3 }}>CONTENT SUPPORT</div>
              {[
                { icon:'∑', label:'Equations', hint:'LaTeX via KaTeX' },
                { icon:'<>', label:'Code Blocks', hint:'Syntax + copy' },
                { icon:'⊞', label:'Tables', hint:'Auto-rendered' },
                { icon:'▸', label:'Lists', hint:'Ordered + unordered' },
                { icon:'""', label:'Callouts', hint:'Notes & warnings' },
              ].map(x=>(
                <div key={x.label} style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ color:'#00d4ff', fontFamily:'Share Tech Mono', fontSize:13, width:18 }}>{x.icon}</span>
                  <div>
                    <div className="mono" style={{ fontSize:9, color:'#c8f0ff', lineHeight:1 }}>{x.label}</div>
                    <div className="mono" style={{ fontSize:8, color:'rgba(0,212,255,0.35)' }}>{x.hint}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="panel" style={{ padding:14, flex:1, display:'flex', flexDirection:'column', gap:10 }}>
              <div className="mono" style={{ fontSize:10, color:'#4a8fa8', letterSpacing:3 }}>METRICS</div>
              {[{l:'NEURAL NET',v:'98.2%',p:'98.2%'},{l:'RESPONSE',v:'~1.2S',p:'60%'},{l:'ACCURACY',v:'99.1%',p:'99.1%'},{l:'UPTIME',v:isReady?'100%':'0%',p:isReady?'100%':'0%'}].map(x=>(
                <div key={x.l}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                    <span className="mono" style={{ fontSize:9, color:'#4a8fa8' }}>{x.l}</span>
                    <span className="mono" style={{ fontSize:9, color:'#00d4ff' }}>{x.v}</span>
                  </div>
                  <div style={{ height:2, background:'rgba(0,212,255,0.1)', borderRadius:1 }}>
                    <div style={{ height:'100%', width:x.p, background:'#00d4ff', borderRadius:1, transition:'width 1s ease', boxShadow:'0 0 6px #00d4ff' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ display:'flex', justifyContent:'space-between', padding:'0 8px' }}>
          <span className="mono" style={{ fontSize:9, color:'rgba(0,212,255,0.2)', letterSpacing:2 }}>STARK INDUSTRIES © 2024 // ALL RIGHTS RESERVED</span>
          <span className="mono" style={{ fontSize:9, color:'rgba(0,212,255,0.2)', letterSpacing:2 }}>MARK IV // {isReady?'ACTIVE':'STANDBY'}</span>
        </div>
      </div>
    </div>
  )
}