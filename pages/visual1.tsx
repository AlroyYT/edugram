import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
declare global {
  interface Window {
    mermaid: any;
  }
}

interface AnimationStep {
  id: number;
  title: string;
  description: string;
  mermaidCode: string;
}

interface AnimationData {
  title: string;
  description: string;
  steps: AnimationStep[];
  conclusion: string;
}

// --- Icons ---
const Icons = {
  Play: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>,
  Pause: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>,
  Next: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>,
  Prev: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>,
  Search: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>,
  Sparkles: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>,
  VolumeOn: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>,
  VolumeOff: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>,
};

export default function Visual1() {
  const [topic, setTopic] = useState('');
  const [animationData, setAnimationData] = useState<AnimationData | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // --- Text-to-Speech Function ---
  const speakText = (text: string) => {
    if (!voiceEnabled) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    speechRef.current = utterance;

    // Configure voice settings
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1;
    utterance.volume = 1;

    // Try to use a good quality voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(voice => 
      voice.lang.startsWith('en') && (voice.name.includes('Google') || voice.name.includes('Microsoft'))
    ) || voices.find(voice => voice.lang.startsWith('en'));
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  // --- Stop Speech ---
  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // --- Speak when step changes ---
  useEffect(() => {
    if (animationData && voiceEnabled) {
      const step = animationData.steps[currentStep];
      if (step) {
        const textToSpeak = `${step.title}. ${step.description}`;
        // Delay speech slightly to let animation start
        setTimeout(() => speakText(textToSpeak), 500);
      }
    }

    return () => {
      stopSpeech();
    };
  }, [currentStep, animationData, voiceEnabled]);

  // --- Load voices (required for some browsers) ---
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    
    if (window.speechSynthesis) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // --- Styles & Mermaid Logic ---
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      
      @keyframes popIn {
        0% { opacity: 0; transform: scale(0.6) translateY(20px); }
        60% { transform: scale(1.05) translateY(-5px); }
        100% { opacity: 1; transform: scale(1) translateY(0); }
      }

      @keyframes drawLine {
        from { stroke-dashoffset: 1000; opacity: 0; }
        to { stroke-dashoffset: 0; opacity: 1; }
      }

      @keyframes arrowFadeIn {
        from { opacity: 0; transform: scale(0); }
        to { opacity: 1; transform: scale(1); }
      }

      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.8; }
      }

      .mermaid .node rect, 
      .mermaid .node circle, 
      .mermaid .node polygon {
        fill: #EEF2FF !important;
        stroke: #6366F1 !important;
        stroke-width: 2px !important;
      }

      .mermaid .node, .mermaid .edgePath, .mermaid .edgeLabel {
        opacity: 0; 
      }

      .mermaid .node {
        animation: popIn 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        transform-origin: center;
      }

      .mermaid .node:nth-of-type(1) { animation-delay: 0.2s; }
      .mermaid .node:nth-of-type(2) { animation-delay: 0.5s; }
      .mermaid .node:nth-of-type(3) { animation-delay: 0.8s; }
      .mermaid .node:nth-of-type(4) { animation-delay: 1.1s; }
      .mermaid .node:nth-of-type(5) { animation-delay: 1.4s; }
      .mermaid .node:nth-of-type(6) { animation-delay: 1.7s; }
      .mermaid .node:nth-of-type(7) { animation-delay: 2.0s; }
      .mermaid .node:nth-of-type(8) { animation-delay: 2.3s; }
      .mermaid .node:nth-of-type(9) { animation-delay: 2.6s; }
      .mermaid .node:nth-of-type(10) { animation-delay: 2.9s; }
      
      .mermaid .edgePath path {
        stroke: #1e293b !important;
        stroke-width: 2px !important;
        stroke-dasharray: 1000;
        stroke-dashoffset: 1000;
        animation: drawLine 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      }

      .mermaid .edgePath:nth-of-type(1) path { animation-delay: 1.3s; }
      .mermaid .edgePath:nth-of-type(2) path { animation-delay: 1.7s; }
      .mermaid .edgePath:nth-of-type(3) path { animation-delay: 2.1s; }
      .mermaid .edgePath:nth-of-type(4) path { animation-delay: 2.5s; }
      .mermaid .edgePath:nth-of-type(5) path { animation-delay: 2.9s; }
      .mermaid .edgePath:nth-of-type(6) path { animation-delay: 3.3s; }
      .mermaid .edgePath:nth-of-type(7) path { animation-delay: 3.7s; }
      .mermaid .edgePath:nth-of-type(8) path { animation-delay: 4.1s; }
      .mermaid .edgePath:nth-of-type(9) path { animation-delay: 4.5s; }
      .mermaid .edgePath:nth-of-type(10) path { animation-delay: 4.9s; }

      .mermaid marker {
        fill: #1e293b !important;
      }
      .mermaid marker path {
        animation: arrowFadeIn 0.4s ease-out forwards;
        transform-origin: center;
        opacity: 0;
      }
      
      .mermaid marker:nth-of-type(1) path { animation-delay: 1.8s; }
      .mermaid marker:nth-of-type(2) path { animation-delay: 2.2s; }
      .mermaid marker:nth-of-type(3) path { animation-delay: 2.6s; }
      .mermaid marker:nth-of-type(4) path { animation-delay: 3.0s; }
      .mermaid marker:nth-of-type(5) path { animation-delay: 3.4s; }

      .mermaid .edgeLabel {
        background-color: white !important;
        animation: arrowFadeIn 0.5s ease-out forwards;
      }
      .mermaid .edgeLabel:nth-of-type(1) { animation-delay: 1.6s; }
      .mermaid .edgeLabel:nth-of-type(2) { animation-delay: 2.0s; }
      .mermaid .edgeLabel:nth-of-type(3) { animation-delay: 2.4s; }
      .mermaid .edgeLabel:nth-of-type(4) { animation-delay: 2.8s; }
      .mermaid .edgeLabel:nth-of-type(5) { animation-delay: 3.2s; }

      .mermaid .node .label {
        font-family: 'Inter', sans-serif !important;
        font-weight: 600 !important;
        color: #1e293b !important;
      }

      .speaking-indicator {
        animation: pulse 1.5s ease-in-out infinite;
      }

      .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
      .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    `;
    document.head.appendChild(style);

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
    script.async = true;
    script.onload = () => {
      if (window.mermaid) {
        window.mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          securityLevel: 'loose',
          fontFamily: 'Inter, sans-serif',
          flowchart: { 
            useMaxWidth: false, 
            htmlLabels: true, 
            curve: 'basis',
            padding: 20,
            rankSpacing: 60,
          },
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.contains(script) && document.body.removeChild(script);
      document.head.contains(style) && document.head.removeChild(style);
      stopSpeech();
    };
  }, []);

  // --- Rendering Logic ---
  useEffect(() => {
    const renderDiagram = async () => {
      if (animationData && mermaidRef.current && window.mermaid) {
        try {
          mermaidRef.current.innerHTML = '';
          
          const id = `mermaid-${Date.now()}-${currentStep}`;
          const { svg } = await window.mermaid.render(id, animationData.steps[currentStep]?.mermaidCode || 'graph TD; Error-->Stop');
          
          mermaidRef.current.innerHTML = svg;
          
          const svgEl = mermaidRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.height = '100%';
            svgEl.style.maxWidth = 'none';
            svgEl.style.minWidth = '400px';
          }

          const nodes = mermaidRef.current.querySelectorAll('.node');
          const edges = mermaidRef.current.querySelectorAll('.edgePath');
          const edgeLabels = mermaidRef.current.querySelectorAll('.edgeLabel');
          
          nodes.forEach((node) => {
            (node as HTMLElement).style.opacity = '0';
          });
          
          edges.forEach((edge) => {
            const path = edge.querySelector('path');
            if (path) {
              (path as SVGPathElement).style.opacity = '0';
              const length = (path as SVGPathElement).getTotalLength();
              (path as SVGPathElement).style.strokeDasharray = `${length}`;
              (path as SVGPathElement).style.strokeDashoffset = `${length}`;
            }
          });
          
          edgeLabels.forEach((label) => {
            (label as HTMLElement).style.opacity = '0';
          });
          
          nodes.forEach((node, i) => {
            setTimeout(() => {
              (node as HTMLElement).style.transition = 'opacity 0.5s ease-out';
              (node as HTMLElement).style.opacity = '1';
            }, i * 300 + 200);
          });
          
          const nodeDelay = nodes.length * 300 + 500;
          edges.forEach((edge, i) => {
            const path = edge.querySelector('path');
            if (path) {
              setTimeout(() => {
                (path as SVGPathElement).style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                (path as SVGPathElement).style.opacity = '1';
                (path as SVGPathElement).style.strokeDashoffset = '0';
              }, nodeDelay + i * 400);
            }
          });
          
          edgeLabels.forEach((label, i) => {
            setTimeout(() => {
              (label as HTMLElement).style.transition = 'opacity 0.5s ease-out';
              (label as HTMLElement).style.opacity = '1';
            }, nodeDelay + i * 400 + 200);
          });
          
        } catch (err) {
          console.error('Mermaid render error:', err);
        }
      }
    };
    if (animationData) setTimeout(renderDiagram, 100);
  }, [currentStep, animationData]);

  // --- Actions ---
  const generateAnimation = async () => {
    if (!topic.trim()) { setError('Please enter a topic'); return; }
    setLoading(true); setError(''); setAnimationData(null); setCurrentStep(0); setIsPlaying(false);
    stopSpeech();
    
    try {
      const response = await fetch('/api/generate-animation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Generation failed');
      setAnimationData(data.animationData);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  const playAnimation = () => {
    setIsPlaying(true);
    setCurrentStep(0);
    if (animationData) {
      let step = 0;
      const interval = setInterval(() => {
        step++;
        if (step >= animationData.steps.length) {
          clearInterval(interval);
          setIsPlaying(false);
        } else {
          setCurrentStep(step);
        }
      }, 8000); // Increased to 8 seconds to allow speech to complete
    }
  };

  const nextStep = () => {
    stopSpeech();
    if (animationData && currentStep < animationData.steps.length - 1) {
      setCurrentStep(c => c + 1);
    }
  };

  const prevStep = () => {
    stopSpeech();
    if (currentStep > 0) {
      setCurrentStep(c => c - 1);
    }
  };

  const toggleVoice = () => {
    if (voiceEnabled) {
      stopSpeech();
    }
    setVoiceEnabled(!voiceEnabled);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      fontFamily: 'Inter, sans-serif',
      backgroundColor: '#F8FAFC', 
      color: '#0F172A', 
      backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)', 
      backgroundSize: '24px 24px',
      padding: '60px 20px',
    }}>
      
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* --- Header Section --- */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          style={{ textAlign: 'center', marginBottom: '60px' }}
        >
          <span style={{ 
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '6px 16px', background: '#EEF2FF', color: '#4F46E5', 
            borderRadius: '99px', fontSize: '0.85rem', fontWeight: '600',
            marginBottom: '16px', border: '1px solid #E0E7FF'
          }}>
            <Icons.Sparkles /> AI Diagram Generator
          </span>
          <h1 style={{ 
            fontSize: '3.5rem', fontWeight: '800', letterSpacing: '-0.03em', 
            lineHeight: '1.1', marginBottom: '16px',
            background: 'linear-gradient(to right, #0F172A, #334155)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
          }}>
            Visualise Complexity.
          </h1>
          <p style={{ color: '#64748B', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto' }}>
            Transform technical concepts into clear, step-by-step architectural diagrams with voice narration.
          </p>
        </motion.div>

        {/* --- Search Bar --- */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.1 }}
          style={{ 
            maxWidth: '600px', margin: '0 auto 60px', position: 'relative',
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.08)'
          }}
        >
          <div style={{ 
            display: 'flex', alignItems: 'center', background: 'white', 
            borderRadius: '16px', padding: '8px', border: '1px solid #E2E8F0',
            transition: 'border-color 0.2s',
          }}>
            <div style={{ padding: '0 16px' }}><Icons.Search /></div>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && generateAnimation()}
              placeholder="e.g. How Kubernetes Load Balancing Works"
              style={{
                flex: 1, border: 'none', outline: 'none', fontSize: '1.1rem',
                color: '#0F172A', background: 'transparent', padding: '12px 0'
              }}
            />
            <button
              onClick={generateAnimation}
              disabled={loading}
              style={{
                background: loading ? '#94A3B8' : '#0F172A', color: 'white',
                border: 'none', borderRadius: '10px', padding: '12px 24px',
                fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'transform 0.1s ease',
                fontSize: '0.95rem'
              }}
            >
              {loading ? 'Processing...' : 'Generate'}
            </button>
          </div>
          {error && (
            <div style={{ 
              position: 'absolute', top: '110%', left: 0, right: 0, 
              background: '#FEF2F2', color: '#B91C1C', padding: '12px', 
              borderRadius: '8px', fontSize: '0.9rem', textAlign: 'center',
              border: '1px solid #FCA5A5'
            }}>
              {error}
            </div>
          )}
        </motion.div>

        {/* --- Main Workspace Card --- */}
        <AnimatePresence mode="wait">
          {animationData && (
            <motion.div
              key="content-card"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              style={{
                background: 'white', borderRadius: '24px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                overflow: 'hidden'
              }}
            >
              {/* Card Header */}
              <div style={{ 
                padding: '32px 40px', borderBottom: '1px solid #F1F5F9',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                flexWrap: 'wrap', gap: '20px'
              }}>
                <div style={{ flex: 1, minWidth: '300px' }}>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '8px', letterSpacing: '-0.02em' }}>
                    {animationData.title}
                  </h2>
                  <p style={{ color: '#64748B', lineHeight: '1.6' }}>{animationData.description}</p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {/* Voice Toggle */}
                  <button
                    onClick={toggleVoice}
                    style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      background: voiceEnabled ? '#EEF2FF' : 'white',
                      color: voiceEnabled ? '#4F46E5' : '#64748B',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
                  >
                    {voiceEnabled ? <Icons.VolumeOn /> : <Icons.VolumeOff />}
                  </button>

                  {/* Status Indicator */}
                  <div style={{ 
                    background: '#F8FAFC', padding: '8px 16px', borderRadius: '12px',
                    border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '12px'
                  }}>
                    {isSpeaking && (
                      <span className="speaking-indicator" style={{ fontSize: '1.2rem' }}>🔊</span>
                    )}
                    <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: '600' }}>
                      Step {currentStep + 1} <span style={{ color: '#CBD5E1' }}>/</span> {animationData.steps.length}
                    </span>
                    <div style={{ width: '80px', height: '6px', background: '#E2E8F0', borderRadius: '3px' }}>
                      <motion.div 
                        animate={{ width: `${((currentStep + 1) / animationData.steps.length) * 100}%` }}
                        style={{ height: '100%', background: '#4F46E5', borderRadius: '3px' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* --- The Stage (Mermaid) --- */}
              <div style={{ 
                background: '#F8FAFC', 
                height: '500px', 
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                borderBottom: '1px solid #E2E8F0'
              }}>
                <div 
                  className="custom-scrollbar"
                  style={{ 
                    flex: 1, overflow: 'auto', display: 'flex', 
                    justifyContent: 'center', alignItems: 'center',
                    padding: '40px'
                  }}
                >
                  <div 
                    ref={mermaidRef} 
                    key={`step-${currentStep}`}
                    style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center' }} 
                  />
                </div>
              </div>

              {/* --- Controls Footer --- */}
              <div style={{ padding: '32px 40px', background: 'white' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                  
                  {/* Textual Explanation */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      style={{ marginBottom: '32px', minHeight: '80px' }}
                    >
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#0F172A', marginBottom: '8px' }}>
                        {animationData.steps[currentStep]?.title}
                      </h3>
                      <p style={{ color: '#475569', fontSize: '1.05rem', lineHeight: '1.6' }}>
                        {animationData.steps[currentStep]?.description}
                      </p>
                    </motion.div>
                  </AnimatePresence>

                  {/* Button Array */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                    <button
                      onClick={prevStep}
                      disabled={currentStep === 0}
                      style={{
                        width: '44px', height: '44px', borderRadius: '12px', border: '1px solid #E2E8F0',
                        background: 'white', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
                        opacity: currentStep === 0 ? 0.5 : 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      <Icons.Prev />
                    </button>

                    <button
                      onClick={playAnimation}
                      disabled={isPlaying}
                      style={{
                        padding: '0 24px', height: '44px', borderRadius: '12px', border: 'none',
                        background: isPlaying ? '#F1F5F9' : '#0F172A', 
                        color: isPlaying ? '#94A3B8' : 'white',
                        display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600',
                        cursor: isPlaying ? 'default' : 'pointer',
                        transition: 'all 0.2s',
                        minWidth: '140px', justifyContent: 'center'
                      }}
                    >
                      {isPlaying ? <><Icons.Pause /> Playing</> : <><Icons.Play /> Play Auto</>}
                    </button>

                    <button
                      onClick={nextStep}
                      disabled={currentStep === animationData.steps.length - 1}
                      style={{
                        width: '44px', height: '44px', borderRadius: '12px', border: '1px solid #E2E8F0',
                        background: 'white', color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: currentStep === animationData.steps.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: currentStep === animationData.steps.length - 1 ? 0.5 : 1,
                        transition: 'all 0.2s'
                      }}
                    >
                      <Icons.Next />
                    </button>
                  </div>

                </div>
              </div>

              {/* Conclusion Banner */}
              {currentStep === animationData.steps.length - 1 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  style={{
                    background: 'linear-gradient(to right, #4F46E5, #4338CA)',
                    color: 'white', padding: '24px 40px', textAlign: 'center'
                  }}
                >
                  <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.5rem' }}>🎓</span>
                    <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>{animationData.conclusion}</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
      </div>
    </div>
  );
}