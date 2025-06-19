import React, { useState, useRef, useEffect } from "react";

type WordData = {
  word: string;
  format: "mp4" | "webp" | "none";
};

type WordStatus = {
  word: string;
  status: "displaying" | "completed" | "pending";
};

const AnimationView: React.FC = () => {
  const [sentence, setSentence] = useState<string>("");
  const [animationData, setAnimationData] = useState<WordData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [wordStatuses, setWordStatuses] = useState<WordStatus[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Real backend integration - RESTORED!
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sentence.trim() === "") return;

    setLoading(true);
    setError("");
    setCurrentIndex(-1);
    setProgress(0);

    try {
      // Progress simulation for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 80) {
            clearInterval(progressInterval);
            return 80;
          }
          return prev + 10;
        });
      }, 150);

      const formData = new FormData();
      formData.append('sen', sentence);

      const response = await fetch("http://edugram-574544346633.asia-south1.run.app/api/animation_view/", {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setAnimationData(data.words || []);
      }
    } catch (error: any) {
      console.error("Error fetching animation data", error);
      if (error.message.includes('fetch')) {
        setError('No response from server. Please check if the server is running on localhost:8000.');
      } else {
        setError(error.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  useEffect(() => {
    // Don't use localStorage in artifacts - storing in memory instead
    setDarkMode(true); // Default to dark mode
  }, []);

  useEffect(() => {
    if (animationData.length > 0) {
      setCurrentIndex(0);
      setWordStatuses(animationData.map(word => ({
        word: word.word,
        status: "pending"
      })));
    }
  }, [animationData]);

  useEffect(() => {
    setWordStatuses(prev => prev.map((status, index) => ({
      ...status,
      status: index < currentIndex ? "completed" : 
              index === currentIndex ? "displaying" : "pending"
    })));
  }, [currentIndex]);

  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < videoRefs.current.length) {
      const currentVideo = videoRefs.current[currentIndex];
      if (currentVideo) {
        currentVideo.play().catch(console.error);
      }
    }
  }, [currentIndex]);

  const handleVideoEnded = () => {
    if (currentIndex < videoRefs.current.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(-1);
    }
  };

  const renderWord = (wordData: WordData, index: number) => {
    if (wordData.format === "none") {
      return (
        <div 
          key={wordData.word} 
          className={`word-display ${currentIndex === index ? 'active' : ''}`}
        >
          {wordData.word}
        </div>
      );
    }

    const mediaSrc = `https://edugram-574544346633.asia-south1.run.app/static/animations/${wordData.format}/${wordData.word}.${wordData.format}`;
    
    return (
      <div 
        key={wordData.word}
        className={`media-container ${currentIndex === index ? 'active' : ''}`}
      >
        <div className="media-wrapper">
          {wordData.format === "mp4" ? (
            <video 
              ref={el => {
                if (el) videoRefs.current[index] = el;
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '20px',
                display: currentIndex === index ? 'block' : 'none'
              }}
              muted
              onEnded={handleVideoEnded}
            >
              <source src={mediaSrc} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <img 
              src={mediaSrc} 
              alt={wordData.word} 
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '20px',
                display: currentIndex === index ? 'block' : 'none'
              }}
            />
          )}
          {currentIndex !== index && (
            <div className="media-placeholder">
              <div className="media-icon">🤟</div>
              <div className="media-word">{wordData.word}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          overflow-x: hidden;
        }

        .app-container {
          min-height: 100vh;
          background: ${darkMode ? 
            'linear-gradient(135deg, #0a0118 0%, #1a0b2e 25%, #16213e 50%, #0f3460 75%, #533483 100%)' :
            'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)'
          };
          position: relative;
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .app-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="0.5" fill="%23ffffff" opacity="0.1"/><circle cx="75" cy="75" r="0.3" fill="%23ffffff" opacity="0.05"/><circle cx="50" cy="10" r="0.4" fill="%23ffffff" opacity="0.08"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          pointer-events: none;
          animation: grain 20s linear infinite;
        }

        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -10%); }
          20% { transform: translate(-15%, 5%); }
          30% { transform: translate(7%, -25%); }
          40% { transform: translate(-5%, 25%); }
          50% { transform: translate(-15%, 10%); }
          60% { transform: translate(15%, 0%); }
          70% { transform: translate(0%, 15%); }
          80% { transform: translate(3%, 35%); }
          90% { transform: translate(-10%, 10%); }
        }

        .floating-orbs {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          background: ${darkMode ? 
            'radial-gradient(circle, rgba(138, 43, 226, 0.4) 0%, rgba(138, 43, 226, 0.1) 50%, transparent 100%)' :
            'radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)'
          };
          animation: float 20s infinite linear;
        }

        .orb:nth-child(1) { width: 300px; height: 300px; top: -150px; left: -150px; animation-delay: 0s; }
        .orb:nth-child(2) { width: 200px; height: 200px; top: 20%; right: -100px; animation-delay: -5s; }
        .orb:nth-child(3) { width: 400px; height: 400px; bottom: -200px; left: 20%; animation-delay: -10s; }
        .orb:nth-child(4) { width: 150px; height: 150px; top: 60%; right: 10%; animation-delay: -15s; }

        @keyframes float {
          0% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(50px, -50px) rotate(120deg); }
          66% { transform: translate(-30px, 30px) rotate(240deg); }
          100% { transform: translate(0, 0) rotate(360deg); }
        }

        .main-container {
          position: relative;
          z-index: 1;
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .theme-toggle {
          position: fixed;
          top: 2rem;
          right: 2rem;
          z-index: 100;
          background: ${darkMode ? 
            'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.9)'
          };
          backdrop-filter: blur(20px);
          border: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'};
          border-radius: 50px;
          padding: 0.75rem 1.5rem;
          color: ${darkMode ? '#ffffff' : '#000000'};
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-weight: 500;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .theme-toggle:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        .glass-card {
          background: ${darkMode ? 
            'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.25)'
          };
          backdrop-filter: blur(30px);
          border: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)'};
          border-radius: 32px;
          padding: 3rem;
          box-shadow: ${darkMode ? 
            '0 25px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)' :
            '0 25px 50px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6)'
          };
          animation: cardEntry 1s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes cardEntry {
          from {
            opacity: 0;
            transform: translateY(50px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .header-section {
          text-align: center;
          margin-bottom: 3rem;
        }

        .main-title {
          font-size: 4rem;
          font-weight: 800;
          background: ${darkMode ? 
            'linear-gradient(135deg, #ffffff 0%, #a855f7 50%, #3b82f6 100%)' :
            'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 50%, #db2777 100%)'
          };
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 1rem;
          animation: titleGlow 3s ease-in-out infinite alternate;
          line-height: 1.1;
        }

        @keyframes titleGlow {
          from { filter: brightness(1); }
          to { filter: brightness(1.2); }
        }

        .subtitle {
          font-size: 1.25rem;
          color: ${darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'};
          font-weight: 400;
          margin-bottom: 0.5rem;
        }

        .description {
          font-size: 1rem;
          color: ${darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'};
          font-weight: 300;
        }

        .input-section {
          margin-bottom: 3rem;
        }

        .input-container {
          position: relative;
          margin-bottom: 2rem;
        }

        .input-field {
          width: 100%;
          background: ${darkMode ? 
            'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)'
          };
          border: 2px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
          border-radius: 20px;
          padding: 1.5rem 1.5rem 1.5rem 4rem;
          font-size: 1.1rem;
          color: ${darkMode ? '#ffffff' : '#000000'};
          resize: vertical;
          min-height: 120px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          backdrop-filter: blur(10px);
        }

        .input-field:focus {
          outline: none;
          border-color: ${darkMode ? '#a855f7' : '#7c3aed'};
          box-shadow: 0 0 0 4px ${darkMode ? 'rgba(168, 85, 247, 0.2)' : 'rgba(124, 58, 237, 0.2)'};
          transform: translateY(-2px);
        }

        .input-field::placeholder {
          color: ${darkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)'};
        }

        .input-icon {
          position: absolute;
          left: 1.5rem;
          top: 1.5rem;
          font-size: 1.5rem;
          z-index: 1;
          animation: bounce 2s infinite;
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-5px); }
          60% { transform: translateY(-2px); }
        }

        .button-container {
          display: flex;
          justify-content: center;
          gap: 1rem;
        }

        .generate-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          border-radius: 50px;
          padding: 1rem 2.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          color: white;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          min-width: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .generate-button:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 15px 35px rgba(102, 126, 234, 0.4);
        }

        .generate-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .generate-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .generate-button:hover::before {
          left: 100%;
        }

        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .progress-bar {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 1rem;
          opacity: ${loading ? 1 : 0};
          transition: opacity 0.3s ease;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 2px;
          width: ${progress}%;
          transition: width 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          right: 0;
          background-image: linear-gradient(
            -45deg,
            rgba(255, 255, 255, 0.2) 25%,
            transparent 25%,
            transparent 50%,
            rgba(255, 255, 255, 0.2) 50%,
            rgba(255, 255, 255, 0.2) 75%,
            transparent 75%,
            transparent
          );
          background-size: 50px 50px;
          animation: move 1s linear infinite;
        }

        @keyframes move {
          0% { background-position: 0 0; }
          100% { background-position: 50px 50px; }
        }

        .error-message {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1));
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 16px;
          padding: 1.5rem;
          margin: 1.5rem 0;
          color: #ef4444;
          display: flex;
          align-items: center;
          gap: 1rem;
          backdrop-filter: blur(10px);
          animation: errorSlide 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes errorSlide {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .status-section {
          background: ${darkMode ? 
            'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)'
          };
          border: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
          border-radius: 20px;
          padding: 2rem;
          margin: 2rem 0;
          backdrop-filter: blur(10px);
          opacity: ${wordStatuses.length > 0 ? 1 : 0};
          transform: ${wordStatuses.length > 0 ? 'translateY(0)' : 'translateY(20px)'};
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .status-title {
          font-size: 1.3rem;
          font-weight: 600;
          color: ${darkMode ? '#ffffff' : '#000000'};
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .word-status-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          justify-content: center;
        }

        .word-status {
          padding: 0.5rem 1rem;
          border-radius: 25px;
          font-weight: 500;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .word-status.pending {
          background: ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
          color: ${darkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'};
        }

        .word-status.displaying {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          transform: scale(1.05);
          box-shadow: 0 5px 15px rgba(16, 185, 129, 0.4);
          animation: pulse 1.5s infinite;
        }

        .word-status.completed {
          background: ${darkMode ? 'rgba(107, 114, 128, 0.3)' : 'rgba(156, 163, 175, 0.3)'};
          color: ${darkMode ? 'rgba(156, 163, 175, 0.8)' : 'rgba(107, 114, 128, 0.8)'};
          text-decoration: line-through;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1.05); }
          50% { transform: scale(1.1); }
        }

        .animation-section {
          min-height: 500px;
          background: ${darkMode ? 
            'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.3)'
          };
          border: 2px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
          border-radius: 24px;
          margin: 2rem 0;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 2rem;
          padding: 2rem;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(15px);
        }

        .animation-section::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, ${darkMode ? 'rgba(168, 85, 247, 0.1)' : 'rgba(124, 58, 237, 0.1)'} 0%, transparent 70%);
          animation: rotate 30s linear infinite;
          pointer-events: none;
        }

        @keyframes rotate {
          to { transform: rotate(360deg); }
        }

        .media-container {
          position: relative;
          opacity: 0;
          transform: scale(0.8) translateY(20px);
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .media-container.active {
          opacity: 1;
          transform: scale(1) translateY(0);
        }

        .media-wrapper {
          width: 350px;
          height: 350px;
          background: ${darkMode ? 
            'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)' :
            'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.4) 100%)'
          };
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(20px);
          border: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'};
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
        }

        .media-wrapper::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.1) 50%, transparent 70%);
          transform: translateX(-100%);
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .media-placeholder {
          text-align: center;
          z-index: 1;
        }

        .media-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          animation: float 3s ease-in-out infinite;
        }

        .media-word {
          font-size: 1.5rem;
          font-weight: 600;
          color: ${darkMode ? '#ffffff' : '#000000'};
          text-transform: capitalize;
        }

        .word-display {
          font-size: 2rem;
          font-weight: 700;
          color: ${darkMode ? '#ffffff' : '#000000'};
          padding: 1rem 2rem;
          background: ${darkMode ? 
            'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)'
          };
          border-radius: 16px;
          backdrop-filter: blur(10px);
          opacity: 0;
          transform: scale(0.8);
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .word-display.active {
          opacity: 1;
          transform: scale(1);
        }

        .placeholder-text {
          color: ${darkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'};
          font-size: 1.2rem;
          text-align: center;
          font-weight: 300;
        }

        .footer {
          text-align: center;
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
          color: ${darkMode ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)'};
          font-size: 1rem;
          font-weight: 300;
        }

        @media (max-width: 768px) {
          .main-container {
            padding: 1rem;
          }
          
          .glass-card {
            padding: 2rem;
            border-radius: 24px;
          }
          
          .main-title {
            font-size: 2.5rem;
          }
          
          .media-wrapper {
            width: 280px;
            height: 280px;
          }
          
          .theme-toggle {
            top: 1rem;
            right: 1rem;
            padding: 0.5rem 1rem;
          }
        }
      `}</style>

      <div className="app-container">
        <div className="floating-orbs">
          <div className="orb"></div>
          <div className="orb"></div>
          <div className="orb"></div>
          <div className="orb"></div>
        </div>

        <button 
          className="theme-toggle"
          onClick={() => setDarkMode(!darkMode)}
        >
          {darkMode ? '☀️ Light' : '🌙 Dark'}
        </button>

        <div className="main-container" ref={containerRef}>
          <div className="glass-card">
            <div className="header-section">
              <h1 className="main-title">SignSpeak AI</h1>
              <p className="subtitle">Bridging Communication Through Technology</p>
              <p className="description">Transform text into beautiful sign language animations with AI-powered precision</p>
            </div>

            <form onSubmit={handleSubmit} className="input-section">
              <div className="input-container">
                <div className="input-icon">✍️</div>
                <textarea
                  value={sentence}
                  onChange={(e) => {
                    setSentence(e.target.value);
                    setIsTyping(e.target.value.length > 0);
                  }}
                  placeholder="Enter your message to convert to sign language..."
                  className="input-field"
                  rows={4}
                />
              </div>

              <div className="button-container">
                <button
                  type="submit"
                  disabled={loading || !sentence.trim()}
                  className="generate-button"
                >
                  {loading ? (
                    <>
                      <div className="loading-spinner"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      ✨ Generate Animation
                    </>
                  )}
                </button>
              </div>

              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
            </form>

            {error && (
              <div className="error-message">
                <span>⚠️</span>
                <div>
                  <strong>Oops! Something went wrong</strong>
                  <p>{error}</p>
                </div>
              </div>
            )}

            {wordStatuses.length > 0 && (
              <div className="status-section">
                <h3 className="status-title">
                  🎯 Animation Progress
                </h3>
                <div className="word-status-container">
                  {wordStatuses.map((status, index) => (
                    <div 
                      key={index} 
                      className={`word-status ${status.status}`}
                    >
                      {status.word}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="animation-section">
              {animationData.length > 0 && !loading ? (
                animationData.map((wordData, index) => renderWord(wordData, index))
              ) : !loading && !error ? (
                <div className="placeholder-text">
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤟</div>
                  <p>Your sign language animation will appear here</p>
                  <p style={{ fontSize: '1rem', marginTop: '0.5rem', opacity: 0.7 }}>
                    Enter text above and click generate to get started
                  </p>
                </div>
              ) : loading ? (
                <div className="placeholder-text">
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔄</div>
                  <p>Creating your sign language animation...</p>
                  <p style={{ fontSize: '1rem', marginTop: '0.5rem', opacity: 0.7 }}>
                    Processing {sentence.split(' ').length} words
                  </p>
                </div>
              ) : null}
            </div>

            <div className="footer">
              <p>🚀 Empowering inclusive communication with cutting-edge AI technology</p>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.6 }}>
                Built with React, TypeScript & Modern Web Technologies
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AnimationView;