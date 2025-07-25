import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { backend_url } from '../components/config';

type WordData = {
  word: string;
  format: "mp4" | "webp" | "none";
};

type WordStatus = {
  word: string;
  status: "displaying" | "completed" | "pending";
};

const Summary = () => {
  const router = useRouter();
  const [summaryText, setSummaryText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { summary, fileName, type } = router.query;

  // Animation states
  const [animationData, setAnimationData] = useState<WordData[]>([]);
  const [animationLoading, setAnimationLoading] = useState<boolean>(false);
  const [animationError, setAnimationError] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [wordStatuses, setWordStatuses] = useState<WordStatus[]>([]);
  const [progress, setProgress] = useState(0);
  const [isAnimationPlaying, setIsAnimationPlaying] = useState<boolean>(false);
  const [isAnimationPaused, setIsAnimationPaused] = useState<boolean>(false);
  const [showAnimation, setShowAnimation] = useState<boolean>(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  useEffect(() => {
    if (summary && typeof summary === 'string') {
      const decodedSummary = decodeURIComponent(summary);
      setSummaryText(decodedSummary);
      setIsLoading(false);
    }
  }, [summary]);

  // Helper function to check if a word contains only letters
  const isValidWord = (word: string): boolean => {
    // Remove common punctuation and check if remaining characters are letters
    const cleanWord = word.replace(/[.,!?;:'"()[\]{}\-_]/g, '').trim();
    
    // Return true if the word contains at least one letter and no numbers or special symbols
    return /^[a-zA-Z\s]+$/.test(cleanWord) && cleanWord.length > 0;
  };

  // Helper function to check if a word should be animated
  const shouldAnimateWord = (wordData: WordData): boolean => {
    return wordData.format !== "none" && isValidWord(wordData.word);
  };

  const prepareSignLanguageAnimation = async (text: string) => {
    if (!text.trim()) return;

    setAnimationLoading(true);
    setAnimationError("");
    setProgress(0);

    try {
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
        setCurrentIndex(-1);
        setIsAnimationPlaying(false);
        setIsAnimationPaused(false);
        setShowAnimation(true);
        // Only create status entries for words that should be animated
        setWordStatuses(data.words
          .filter((w: WordData) => shouldAnimateWord(w))
          .map((w: WordData) => ({
            word: w.word,
            status: "pending",
          }))
        );
      }
    } catch (error: any) {
      console.error("Error fetching animation data", error);
      setAnimationError(
        error.message.includes('fetch')
          ? 'No response from server. Please check if the server is running on localhost:8000.'
          : error.message || 'An unexpected error occurred.'
      );
    } finally {
      setAnimationLoading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const startAnimation = () => {
    if (animationData.length === 0) return;

    setIsAnimationPlaying(true);
    setIsAnimationPaused(false);

    // Find first valid word that should be animated
    let firstValidIndex = animationData.findIndex(w => shouldAnimateWord(w));

    if (firstValidIndex !== -1) {
      setCurrentIndex(firstValidIndex);
    } else {
      setIsAnimationPlaying(false);
      console.log("No valid animations found in the data");
    }
  };

  const pauseAnimation = () => {
    setIsAnimationPaused(true);
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) currentVideo.pause();
  };

  const resumeAnimation = () => {
    setIsAnimationPaused(false);
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo) currentVideo.play().catch(console.error);
  };

  const stopAnimation = () => {
    setIsAnimationPlaying(false);
    setIsAnimationPaused(false);
    setCurrentIndex(-1);
    setWordStatuses([]);
    videoRefs.current.forEach(video => {
      if (video) video.pause();
    });
  };

  const restartAnimation = () => {
    stopAnimation();
    setTimeout(() => startAnimation(), 100);
  };

  // Update word statuses and handle video playback
  useEffect(() => {
    if (isAnimationPlaying && !isAnimationPaused) {
      const validWords = animationData.filter(w => shouldAnimateWord(w));
      const currentValidIndex = validWords.findIndex((_, index) => {
        const originalIndex = animationData.findIndex(w => w.word === validWords[index].word);
        return originalIndex === currentIndex;
      });

      setWordStatuses(prev => prev.map((status, index) => ({
        ...status,
        status: index < currentValidIndex ? "completed" : 
                index === currentValidIndex ? "displaying" : "pending"
      })));
    }
  }, [currentIndex, isAnimationPlaying, isAnimationPaused, animationData]);

  useEffect(() => {
    if (currentIndex >= 0 && currentIndex < videoRefs.current.length && isAnimationPlaying && !isAnimationPaused) {
      const currentVideo = videoRefs.current[currentIndex];
      if (currentVideo) {
        currentVideo.play().catch(console.error);
      }
    }
  }, [currentIndex, isAnimationPlaying, isAnimationPaused]);
  
  const moveToNextValidWord = () => {
    let nextIndex = currentIndex + 1;
    
    // Skip words that shouldn't be animated (symbols, non-letters, or format "none")
    while (nextIndex < animationData.length && !shouldAnimateWord(animationData[nextIndex])) {
      console.log(`Skipping word "${animationData[nextIndex].word}" - contains symbols or non-letters`);
      nextIndex++;
    }
    
    if (nextIndex < animationData.length) {
      setCurrentIndex(nextIndex);
    } else {
      // Animation completed
      setIsAnimationPlaying(false);
      setCurrentIndex(-1);
    }
  };
  
  const handleVideoEnded = () => {
    moveToNextValidWord();
  };
  
  const handleMediaError = () => {
    console.log(`Media failed to load for word at index ${currentIndex}, skipping to next`);
    // Skip to next valid word when media fails to load
    moveToNextValidWord();
  };

  const renderWord = (wordData: WordData, index: number) => {
    // Skip words that shouldn't be animated
    if (!shouldAnimateWord(wordData)) {
      return null;
    }
  
    const mediaSrc = `http://localhost:8000/static/animations/${wordData.format}/${wordData.word}.${wordData.format}`;
    
    return (
      <div 
        key={`${wordData.word}-${index}`}
        className={`media-container ${currentIndex === index ? 'active' : ''}`}
        style={{ display: currentIndex === index ? 'block' : 'none' }}
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
                borderRadius: '20px'
              }}
              muted
              onEnded={handleVideoEnded}
              onError={handleMediaError}
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
                borderRadius: '20px'
              }}
              onError={handleMediaError}
            />
          )}
        </div>
        {/* <div className="word-display active">
          {wordData.word}
        </div> */}
      </div>
    );
  };
  
  const renderAnimationControls = () => {
    const validWordsCount = animationData.filter(w => shouldAnimateWord(w)).length;
    
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
          <div>
            <button
              onClick={startAnimation}
              className="control-button primary"
            >
              <span className="button-icon">▶️</span>
              Start Animation ({validWordsCount} words)
            </button>
          </div>
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

  const saveSummaryToPDF = async () => {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
  
  // Extract filename more robustly and create the summary filename
  let originalFileName = 'summary';
  if (fileName && typeof fileName === 'string') {
    // Remove file extension and any path
    originalFileName = fileName.split('/').pop()?.split('.')[0] || 'summary';
  }
  const summaryFileName = `${originalFileName}_summary`;

  try {
    const cleanText = summaryText
      .replace(/[^\w\s.,!?-]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();

    // PDF Header
    doc.setFontSize(16);
    doc.text("Document Summary", 20, 20);
    doc.setFontSize(12);
    doc.text(`File: ${originalFileName}`, 20, 30);
    doc.text(`Date: ${date}`, 20, 40);

    // PDF Content
    let y = 60;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const maxWidth = doc.internal.pageSize.width - (margin * 2);

    const paragraphs = cleanText.split('\n\n');

    paragraphs.forEach((paragraph: string) => {
      const lines = doc.splitTextToSize(paragraph, maxWidth);

      lines.forEach((line: string) => {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });

      y += lineHeight;
    });

    // Download the PDF directly to user's device
    doc.save(`${originalFileName}.pdf`);

    // Also save to server (optional - keep if you need server storage)
    try {
      const pdfBlob = doc.output('blob');
      const formData = new FormData();
      formData.append('file', pdfBlob, `${originalFileName}_summary.pdf`);
      formData.append('type', 'summary');
      formData.append('content', cleanText);
      formData.append('fileName', originalFileName);

      const response = await axios.post(`${backend_url}/api/save-material/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.status === 'success') {
        console.log('Summary PDF saved to server:', response.data.file_path);
      }
    } catch (serverError) {
      console.error('Error saving PDF to server:', serverError);
      // Don't throw error here - PDF was still downloaded successfully
    }

    // Show success message
    alert(`Summary exported as ${summaryFileName}.pdf`);

  } catch (error) {
    console.error('Error creating PDF:', error);
    alert('Error creating PDF. Please try again.');
    throw error; // Re-throw to handle in calling function
  }
};

  const handleBackClick = async () => {
  try {
    await saveSummaryToPDF();
  } catch (error) {
    console.error('Error saving PDF:', error);
    // Still navigate back even if PDF save failed
  } finally {
    router.push('/deaf');
  }
};
  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const getSentenceCount = (text: string): number => {
    return text.trim().split(/[.!?]+\s*/).filter(Boolean).length;
  };

  const getReadingTime = (text: string): number => {
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  };

  const formatSummaryText = (text: string): string => {
    return text
      .replace(/\*\*/g, '')
      .replace(/###/g, '\n\n')
      .replace(/\s+/g, ' ')
      .replace(/\. /g, '.\n\n')
      .trim();
  };

  const copyToClipboard = () => {
    try {
      navigator.clipboard.writeText(summaryText);
      alert('Summary copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const styles = {
    container: {
      minHeight: '100vh',
      padding: '2rem 1rem',
      background: 'linear-gradient(to bottom right, #EEF2FF, #E0E7FF)',
    },
    card: {
      maxWidth: '1200px',
      margin: '0 auto',
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
    },
    header: {
      padding: '1.5rem',
      borderBottom: '1px solid #e5e7eb',
      background: 'white',
    },
    statCard: {
      padding: '1.5rem',
      borderRadius: '12px',
      background: '#F3F4F6',
      marginBottom: '1rem',
    },
    button: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.75rem 1.5rem',
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      background: '#3B82F6',
      color: 'white',
      border: 'none',
      marginRight: '0.75rem',
    },
    content: {
      padding: '2rem',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1rem',
      marginBottom: '2rem',
    },
    summaryText: {
      color: '#374151',
      lineHeight: '1.7',
      whiteSpace: 'pre-wrap' as const,
    },
    animationSection: {
      background: '#F9FAFB',
      borderRadius: '12px',
      padding: '2rem',
      marginBottom: '2rem',
      borderLeft: '4px solid #3B82F6',
    }
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
          width: 200px;
          height: 200px;
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
          margin: 0.5rem;
        }

        .media-placeholder {
          text-align: center;
          z-index: 1;
        }

        .media-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .media-word {
          font-size: 0.9rem;
          font-weight: 600;
          color: #374151;
          text-transform: capitalize;
        }

        .word-display {
          font-size: 1.2rem;
          font-weight: 700;
          color: #374151;
          padding: 1rem 2rem;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 16px;
          backdrop-filter: blur(10px);
          opacity: 0;
          transform: scale(0.8);
          transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          margin: 0.5rem;
        }

        .word-display.active {
          opacity: 1;
          transform: scale(1);
        }

        .animation-area {
          min-height: 300px;
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

        .animation-controls {
          margin-bottom: 1rem;
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          flex-wrap: wrap;
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
          flex-wrap: wrap;
        }

        .button-icon {
          font-size: 1rem;
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

        .toggle-button {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 1rem;
        }

        .toggle-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1F2937' }}>
                Document Summary
              </h1>
              <button
                onClick={handleBackClick}
                style={{ ...styles.button, background: '#E5E7EB', color: '#374151' }}
              >
                ← Back to Upload
              </button>
            </div>
          </div>

          <div style={styles.content}>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem' }}>
                <div style={{ 
                  width: '4rem',
                  height: '4rem',
                  border: '4px solid #E5E7EB',
                  borderTopColor: '#3B82F6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem'
                }}></div>
                <p style={{ color: '#6B7280' }}>Processing your summary...</p>
              </div>
            ) : (
              <>
                <div style={styles.statsGrid}>
                  <div style={{ ...styles.statCard, background: '#EBF5FF' }}>
                    <div style={{ color: '#1E40AF', marginBottom: '0.5rem' }}>Word Count</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1E3A8A' }}>
                      {getWordCount(summaryText)}
                    </div>
                  </div>
                  <div style={{ ...styles.statCard, background: '#F5F3FF' }}>
                    <div style={{ color: '#5B21B6', marginBottom: '0.5rem' }}>Reading Time</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4C1D95' }}>
                      {getReadingTime(summaryText)} min
                    </div>
                  </div>
                  <div style={{ ...styles.statCard, background: '#ECFDF5' }}>
                    <div style={{ color: '#065F46', marginBottom: '0.5rem' }}>Sentences</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#064E3B' }}>
                      {getSentenceCount(summaryText)}
                    </div>
                  </div>
                </div>

                {/* Sign Language Animation Section */}
                <div style={styles.animationSection}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: '600', 
                      color: '#111827',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      Sign Language Animation
                    </h2>
                    <button
                      onClick={() => setShowAnimation(!showAnimation)}
                      className="toggle-button"
                    >
                      {showAnimation ? 'Hide Animation' : 'Show Animation'}
                    </button>
                  </div>

                  {showAnimation && (
                    <>
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

                      <div className="animation-area">
                        {animationData.length > 0 && !animationLoading ? (
                          <>
                            {animationData.map((wordData, index) => renderWord(wordData, index))}
                            {!isAnimationPlaying && currentIndex === -1 && (
                              <div className="placeholder-text">
                                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🤟</div>
                                <p>Animation ready to play</p>
                                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.7 }}>
                                  Click "Start Animation" to begin (symbols will be skipped)
                                </p>
                              </div>
                            )}
                          </>
                        ) : !animationLoading && !animationError ? (
                          <div className="placeholder-text">
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🤟</div>
                            <p>Ready to create sign language animation</p>
                            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.7 }}>
                              Click "Prepare Sign Language" to begin
                            </p>
                          </div>
                        ) : animationLoading ? (
                          <div className="placeholder-text">
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔄</div>
                            <p>Creating sign language animation...</p>
                            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', opacity: 0.7 }}>
                              Processing words for animation (symbols will be filtered out)
                            </p>
                          </div>
                        ) : (
                          <div className="placeholder-text">
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🤟</div>
                            <p>Sign language animation ready</p>
                          </div>
                        )}
                        
                        {/* Progress bar */}
                        <div className="progress-bar">
                          <div className="progress-fill"></div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>
                      Summary Content
                    </h2>
                    <button
                      onClick={copyToClipboard}
                      style={{ ...styles.button, background: '#10B981' }}
                    >
                      📋 Copy to Clipboard
                    </button>
                  </div>
                  <div style={{
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    maxHeight: '60vh',
                    overflowY: 'auto'
                  }}>
                    
<div style={styles.summaryText}>
                      {formatSummaryText(summaryText)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Summary;