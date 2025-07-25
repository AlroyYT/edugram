import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { backend_url } from '../components/config';

type WordData = {
  word: string;
  format: "mp4" | "webp" | "none";
};

type WordStatus = {
  word: string;
  status: "displaying" | "completed" | "pending";
};

const Summarize = ({ file }: { file: File | null }) => {
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [summaryText, setSummaryText] = useState<string>("");
  
  // Animation states
  const [animationData, setAnimationData] = useState<WordData[]>([]);
  const [animationLoading, setAnimationLoading] = useState<boolean>(false);
  const [animationError, setAnimationError] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [wordStatuses, setWordStatuses] = useState<WordStatus[]>([]);
  const [progress, setProgress] = useState(0);
  const [isAnimationPlaying, setIsAnimationPlaying] = useState<boolean>(false);
  const [isAnimationPaused, setIsAnimationPaused] = useState<boolean>(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const handleSummarize = async () => {
    if (!file) {
      setUploadStatus("Error: No file selected for summarization");
      setIsSuccess(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    console.log("File :", file);
    setIsLoading(true);
    setIsSuccess(false);

    try {
      const response = await axios.post(
        `${backend_url}/api/summarize/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      console.log("Response :", response.data.summary)

      if (response.data?.summary) {
        setSummaryText(response.data.summary);
        setUploadStatus("");
        setIsSuccess(true);
        
        // Don't auto-prepare animation - let user click button
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      setUploadStatus("Error generating summary");
      setIsSuccess(false);
      console.error("Error generating summary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const prepareSignLanguageAnimation = async (text: string) => {
    if (!text.trim()) return;

    setAnimationLoading(true);
    setAnimationError("");
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
      formData.append('sen', text);

      const response = await fetch("http://localhost:8000/api/animation_view/", {
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
        setAnimationError(data.error);
      } else {
        setAnimationData(data.words || []);
        // Reset animation states
        setCurrentIndex(-1);
        setIsAnimationPlaying(false);
        setIsAnimationPaused(false);
      }
    } catch (error: any) {
      console.error("Error fetching animation data", error);
      if (error.message.includes('fetch')) {
        setAnimationError('No response from server. Please check if the server is running on localhost:8000.');
      } else {
        setAnimationError(error.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setAnimationLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const startAnimation = () => {
    if (animationData.length === 0) return;
    
    setIsAnimationPlaying(true);
    setIsAnimationPaused(false);
    setCurrentIndex(0);
    setWordStatuses(animationData.map(word => ({
      word: word.word,
      status: "pending"
    })));
  };

  const pauseAnimation = () => {
    setIsAnimationPaused(true);
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      currentVideo.pause();
    }
  };

  const resumeAnimation = () => {
    setIsAnimationPaused(false);
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) {
      currentVideo.play().catch(console.error);
    }
  };

  const stopAnimation = () => {
    setIsAnimationPlaying(false);
    setIsAnimationPaused(false);
    setCurrentIndex(-1);
    setWordStatuses([]);
    // Pause all videos
    videoRefs.current.forEach(video => {
      if (video) video.pause();
    });
  };

  const restartAnimation = () => {
    stopAnimation();
    setTimeout(() => startAnimation(), 100);
  };

  useEffect(() => {
    if (isAnimationPlaying && !isAnimationPaused) {
      setWordStatuses(prev => prev.map((status, index) => ({
        ...status,
        status: index < currentIndex ? "completed" : 
                index === currentIndex ? "displaying" : "pending"
      })));
    }
  }, [currentIndex, isAnimationPlaying, isAnimationPaused]);

  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < videoRefs.current.length && isAnimationPlaying && !isAnimationPaused) {
      const currentVideo = videoRefs.current[currentIndex];
      if (currentVideo) {
        currentVideo.play().catch(console.error);
      }
    }
  }, [currentIndex, isAnimationPlaying, isAnimationPaused]);

  const handleVideoEnded = () => {
    if (currentIndex < videoRefs.current.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Animation completed
      setIsAnimationPlaying(false);
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

    const mediaSrc = `http://localhost:8000/static/animations/${wordData.format}/${wordData.word}.${wordData.format}`;
    
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

  const renderAnimationControls = () => {
    // Show controls if we have summary text, regardless of animation data status
    if (!summaryText) return null;

    return (
      <div className="animation-controls">
        {animationLoading ? (
          <button className="control-button disabled" disabled>
            <span className="button-icon">⏳</span>
            Preparing Animation...
          </button>
        ) : animationData.length === 0 ? (
          <button
            onClick={() => prepareSignLanguageAnimation(summaryText)}
            className="control-button primary"
          >
            <span className="button-icon">🎬</span>
            Prepare Sign Language
          </button>
        ) : !isAnimationPlaying ? (
          <button
            onClick={startAnimation}
            className="control-button primary"
          >
            <span className="button-icon">▶️</span>
            Start Animation
          </button>
        ) : (
          <div className="control-button-group">
            {!isAnimationPaused ? (
              <button
                onClick={pauseAnimation}
                className="control-button secondary"
              >
                <span className="button-icon">⏸️</span>
                Pause
              </button>
            ) : (
              <button
                onClick={resumeAnimation}
                className="control-button secondary"
              >
                <span className="button-icon">▶️</span>
                Resume
              </button>
            )}
            <button
              onClick={stopAnimation}
              className="control-button secondary"
            >
              <span className="button-icon">⏹️</span>
              Stop
            </button>
            <button
              onClick={restartAnimation}
              className="control-button secondary"
            >
              <span className="button-icon">🔄</span>
              Restart
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <style jsx>{`
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
          width: 280px;
          height: 280px;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
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
          font-size: 3rem;
          margin-bottom: 1rem;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .media-word {
          font-size: 1.2rem;
          font-weight: 600;
          color: #374151;
          text-transform: capitalize;
        }

        .word-display {
          font-size: 1.5rem;
          font-weight: 700;
          color: #374151;
          padding: 1rem 2rem;
          background: rgba(255, 255, 255, 0.8);
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

        .animation-section {
          min-height: 400px;
          background: rgba(255, 255, 255, 0.3);
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-radius: 20px;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
          gap: 1rem;
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
          background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
          animation: rotate 30s linear infinite;
          pointer-events: none;
        }

        @keyframes rotate {
          to { transform: rotate(360deg); }
        }

        .animation-controls {
          margin-bottom: 1rem;
          display: flex;
          justify-content: center;
          gap: 0.5rem;
        }

        .control-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(10px);
          position: relative;
          overflow: hidden;
        }

        .control-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .control-button:hover::before {
          left: 100%;
        }

        .control-button.primary {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
        }

        .control-button.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }

        .control-button.secondary {
          background: rgba(255, 255, 255, 0.8);
          color: #374151;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .control-button.secondary:hover {
          background: rgba(255, 255, 255, 0.9);
          transform: translateY(-1px);
          box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
        }

        .control-button.disabled {
          background: rgba(156, 163, 175, 0.3);
          color: rgba(107, 114, 128, 0.6);
          cursor: not-allowed;
        }

        .control-button-group {
          display: flex;
          gap: 0.5rem;
        }

        .button-icon {
          font-size: 1rem;
        }

        .word-status-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .word-status {
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-weight: 500;
          font-size: 0.85rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .word-status.pending {
          background: rgba(156, 163, 175, 0.2);
          color: rgba(107, 114, 128, 0.8);
        }

        .word-status.displaying {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          transform: scale(1.05);
          box-shadow: 0 3px 10px rgba(16, 185, 129, 0.4);
          animation: pulse 1.5s infinite;
        }

        .word-status.completed {
          background: rgba(107, 114, 128, 0.3);
          color: rgba(107, 114, 128, 0.6);
          text-decoration: line-through;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1.05); }
          50% { transform: scale(1.1); }
        }

        .progress-bar {
          width: 100%;
          height: 3px;
          background: rgba(156, 163, 175, 0.2);
          border-radius: 2px;
          overflow: hidden;
          margin-top: 1rem;
          opacity: ${animationLoading ? 1 : 0};
          transition: opacity 0.3s ease;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
          border-radius: 2px;
          width: ${progress}%;
          transition: width 0.3s ease;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 1rem;
          margin: 1rem 0;
          color: #ef4444;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .placeholder-text {
          color: rgba(107, 114, 128, 0.6);
          font-size: 1rem;
          text-align: center;
          font-weight: 400;
        }
      `}</style>

      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-6xl w-full flex gap-8">
          {/* Summary Section */}
          <div className="w-1/2 bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="inline-block p-3 bg-blue-50 rounded-full mb-4">
                📄
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Document Summarizer
              </h1>
              <p className="text-gray-500">
                Upload your document and get an AI-powered summary
              </p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6">
              <div className="text-center">
                {file ? (
                  <div className="space-y-2">
                    <span className="text-2xl">✅</span>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-2xl">📁</span>
                    <p className="text-sm font-medium text-gray-900">
                      No file selected
                    </p>
                    <p className="text-xs text-gray-500">
                      Please select a file to summarize
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleSummarize}
              disabled={isLoading || !file}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                isLoading || !file
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {isLoading ? "Processing..." : "Generate Summary"}
            </button>

            {uploadStatus && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{uploadStatus}</p>
              </div>
            )}

            {summaryText && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-bold mb-2 text-gray-900">Summary:</h3>
                <p className="text-gray-700 leading-relaxed">{summaryText}</p>
              </div>
            )}
          </div>

          {/* Sign Language Animation Section */}
          <div className="w-1/2 bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="inline-block p-3 bg-blue-50 rounded-full mb-4">
                🤟
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Sign Language Animation
              </h1>
              <p className="text-gray-500">
                Control the sign language animation playback
              </p>
            </div>
            
            {animationError && (
              <div className="error-message">
                <span>⚠️</span>
                <div>
                  <strong>Animation Error</strong>
                  <p>{animationError}</p>
                </div>
              </div>
            )}

            {renderAnimationControls()}

            {wordStatuses.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  🎯 Animation Progress
                </h4>
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
                <div className="progress-bar">
                  <div className="progress-fill"></div>
                </div>
              </div>
            )}

            <div className="animation-section">
              {animationData.length > 0 && !animationLoading ? (
                animationData.map((wordData, index) => renderWord(wordData, index))
              ) : !animationLoading && !animationError && summaryText ? (
                <div className="placeholder-text">
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🤟</div>
                  <p>Sign language animation ready</p>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.7 }}>
                    Click "Start Animation" to begin
                  </p>
                </div>
              ) : animationLoading ? (
                <div className="placeholder-text">
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔄</div>
                  <p>Creating sign language animation...</p>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.7 }}>
                    Processing words for animation
                  </p>
                </div>
              ) : (
                <div className="placeholder-text">
                  <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🤟</div>
                  <p>Generate a summary to see sign language animation</p>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.7 }}>
                    Upload a document and click "Generate Summary"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Summarize;