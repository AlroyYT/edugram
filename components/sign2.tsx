import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

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
  const [darkMode, setDarkMode] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  // Styles
  const pageWrapperStyle: React.CSSProperties = {
    minHeight: "100vh",
    padding: "2rem",
    backgroundColor: darkMode ? "#1a1a1a" : "#f5f5f5",
    color: darkMode ? "#ffffff" : "#000000",
    transition: "background-color 0.3s ease"
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "2rem"
  };

  const formBoxStyle: React.CSSProperties = {
    backgroundColor: darkMode ? "#2d2d2d" : "#ffffff",
    borderRadius: "15px",
    padding: "2rem",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)"
  };

  const headerSectionStyle: React.CSSProperties = {
    textAlign: "center",
    marginBottom: "2rem"
  };

  const headingStyle: React.CSSProperties = {
    fontSize: "2.5rem",
    fontWeight: "bold",
    color: darkMode ? "#ffffff" : "#333",
    marginBottom: "0.5rem"
  };

  const subHeadingStyle: React.CSSProperties = {
    fontSize: "1.1rem",
    color: darkMode ? "#cccccc" : "#666"
  };

  const inputWrapperStyle: React.CSSProperties = {
    marginBottom: "2rem"
  };

  const inputContainerStyle: React.CSSProperties = {
    position: "relative",
    marginBottom: "1rem"
  };

  const inputIconWrapperStyle: React.CSSProperties = {
    position: "absolute",
    left: "1rem",
    top: "1rem",
    zIndex: 1
  };

  const inputIconStyle: React.CSSProperties = {
    fontSize: "1.5rem"
  };

  const inputTextStyle: React.CSSProperties = {
    width: "100%",
    padding: "1rem 1rem 1rem 3rem",
    fontSize: "1.1rem",
    border: `2px solid ${darkMode ? "#444" : "#e0e0e0"}`,
    borderRadius: "10px",
    minHeight: "120px",
    resize: "vertical",
    transition: "border-color 0.3s ease",
    backgroundColor: darkMode ? "#333" : "#ffffff",
    color: darkMode ? "#ffffff" : "#000000"
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: "flex",
    gap: "1rem",
    justifyContent: "center"
  };

  const buttonStyle: React.CSSProperties = {
    padding: "0.8rem 1.5rem",
    fontSize: "1.1rem",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.3s ease",
    backgroundColor: "#4CAF50",
    color: "white"
  };

  const loadingSpinnerStyle: React.CSSProperties = {
    display: "inline-block",
    width: "20px",
    height: "20px",
    border: "3px solid #ffffff",
    borderRadius: "50%",
    borderTopColor: "transparent",
    animation: "spin 1s linear infinite"
  };

  const errorMessageStyle: React.CSSProperties = {
    backgroundColor: darkMode ? "#3d1f1f" : "#ffebee",
    color: "#c62828",
    padding: "1rem",
    borderRadius: "8px",
    margin: "1rem 0",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem"
  };

  const statusSectionStyle: React.CSSProperties = {
    backgroundColor: darkMode ? "#333" : "#f8f9fa",
    padding: "1.5rem",
    borderRadius: "10px",
    margin: "1.5rem 0"
  };

  const statusTitleStyle: React.CSSProperties = {
    fontSize: "1.2rem",
    fontWeight: 600,
    marginBottom: "1rem",
    color: darkMode ? "#ffffff" : "#333"
  };

  const wordStatusContainerStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    justifyContent: "center"
  };

  const getWordStatusStyle = (status: string): React.CSSProperties => ({
    fontSize: "1.1rem",
    padding: "0.3rem 0.6rem",
    borderRadius: "4px",
    color: status === "displaying" ? "#4CAF50" : 
           status === "completed" ? "#666" : "#999",
    fontWeight: status === "displaying" ? "bold" : "normal",
    textDecoration: status === "completed" ? "line-through" : "none"
  });

  const animationSectionStyle: React.CSSProperties = {
    marginTop: "2rem",
    minHeight: "400px",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: "1rem",
    padding: "1rem",
    border: `2px solid ${darkMode ? "#444" : "#e0e0e0"}`,
    borderRadius: "10px"
  };

  const mediaStyle: React.CSSProperties = {
    width: "300px",
    height: "300px",
    objectFit: "contain",
    borderRadius: "8px"
  };

  const textWordStyle: React.CSSProperties = {
    fontSize: "1.5rem",
    margin: "0 0.5rem"
  };

  const placeholderTextStyle: React.CSSProperties = {
    color: darkMode ? "#999" : "#666",
    fontSize: "1.1rem",
    textAlign: "center"
  };

  const footerStyle: React.CSSProperties = {
    textAlign: "center",
    marginTop: "2rem",
    paddingTop: "1rem",
    borderTop: `1px solid ${darkMode ? "#444" : "#e0e0e0"}`,
    color: darkMode ? "#999" : "#666"
  };

  const themeToggleStyle: React.CSSProperties = {
    position: "fixed",
    top: "1rem",
    right: "1rem",
    padding: "0.5rem 1rem",
    borderRadius: "20px",
    border: "none",
    backgroundColor: darkMode ? "#333" : "#ffffff",
    color: darkMode ? "#ffffff" : "#000000",
    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
    cursor: "pointer",
    transition: "all 0.3s ease"
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('preferred-theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    }
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
        currentVideo.play();
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (sentence.trim() === "") return;

    setLoading(true);
    setError("");
    setCurrentIndex(-1);

    try {
      const formData = new FormData();
      formData.append('sen', sentence);

      const response = await axios.post("http://localhost:8000/api/animation_view/", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.error) {
        setError(response.data.error);
      } else {
        setAnimationData(response.data.words || []);
      }
    } catch (error: any) {
      console.error("Error fetching animation data", error);
      if (error.response) {
        setError(error.response.data.error || 'Server error occurred');
      } else if (error.request) {
        setError('No response from server. Please check if the server is running.');
      } else {
        setError('Error setting up the request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const WordStatusIndicator: React.FC<{ status: WordStatus }> = ({ status }) => (
    <span style={getWordStatusStyle(status.status)}>
      {status.word}{' '}
    </span>
  );

  const renderWord = (wordData: WordData, index: number) => {
    if (wordData.format === "none") {
      return <span key={wordData.word} style={textWordStyle}>{wordData.word}</span>;
    }

    const mediaSrc = `http://localhost:8000/static/animations/${wordData.format}/${wordData.word}.${wordData.format}`;
    return wordData.format === "mp4" ? (
      <video 
        key={wordData.word}
        ref={el => {
          if (el) videoRefs.current[index] = el;
        }}
        style={{
          ...mediaStyle,
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
        key={wordData.word} 
        src={mediaSrc} 
        alt={wordData.word} 
        style={{
          ...mediaStyle,
          display: currentIndex === index ? 'block' : 'none'
        }}
      />
    );
  };

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('preferred-theme', newMode ? 'dark' : 'light');
  };

  return (
    <div style={pageWrapperStyle}>
      <button 
        style={themeToggleStyle}
        onClick={toggleTheme}
      >
        {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
      </button>

      <div style={containerStyle}>
        <div style={formBoxStyle}>
          <div style={headerSectionStyle}>
            <h2 style={headingStyle}>Sign Language Animation</h2>
            <p style={subHeadingStyle}>Convert text to sign language animations</p>
          </div>

          <form onSubmit={handleSubmit} style={inputWrapperStyle}>
            <div style={inputContainerStyle}>
              <div style={inputIconWrapperStyle}>
                <span style={inputIconStyle}>✍️</span>
              </div>
              <textarea
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                placeholder="Enter a sentence to convert to sign language..."
                style={inputTextStyle}
                rows={4}
              />
            </div>

            <div style={buttonGroupStyle}>
              <button
                type="submit"
                disabled={loading}
                style={buttonStyle}
              >
                {loading ? (
                  <span style={loadingSpinnerStyle}></span>
                ) : (
                  <>Generate Animation</>
                )}
              </button>
            </div>
          </form>

          {error && (
            <div style={errorMessageStyle}>
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {wordStatuses.length > 0 && (
            <div style={statusSectionStyle}>
              <h3 style={statusTitleStyle}>Word Status:</h3>
              <div style={wordStatusContainerStyle}>
                {wordStatuses.map((status, index) => (
                  <WordStatusIndicator key={index} status={status} />
                ))}
              </div>
            </div>
          )}

          <div style={animationSectionStyle}>
            {animationData.length > 0 && !loading ? (
              animationData.map((wordData, index) => renderWord(wordData, index))
            ) : !loading && !error ? (
              <p style={placeholderTextStyle}>
                Enter a sentence above to see the sign language animation.
              </p>
            ) : null}
          </div>

          <div style={footerStyle}>
            <p>Bridging communication gaps through technology</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimationView;
