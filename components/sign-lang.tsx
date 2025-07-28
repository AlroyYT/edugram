import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/sign.module.css';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const App = () => {
  const [textInput, setTextInput] = useState('');
  const [animation, setAnimation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // Use refs to store recognition instance
  const recognitionRef = useRef<any>(null);
  // Track if component is mounted on client side
  const [isBrowser, setIsBrowser] = useState(false);

  // Only run this effect once on client-side
  useEffect(() => {
    setIsBrowser(true);
    
    // Check user's preferred theme
    const savedTheme = localStorage.getItem('preferred-theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
    }
    
    // Initialize SpeechRecognition only on client-side
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';
        
        // Set up event handlers
        recognitionRef.current.onstart = () => {
          setIsRecording(true);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current.onresult = (event: any) => {
          const lastResultIndex = event.results.length - 1;
          const text = event.results[lastResultIndex][0].transcript;
          setTextInput(text);
          handleRealTimeVoiceToGesture(text);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setError('Failed to recognize speech');
        };
      } else {
        console.warn('Speech Recognition API not supported in this browser');
      }
    }
    
    // Cleanup on component unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const handleRealTimeVoiceToGesture = async (text: string) => {
    if (!text.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('text', text.trim());

      const response = await fetch('https://127.0.0.1:8000/api/convert-text-to-gesture/', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('Response:', data);

      if (data.status === 'success') {
        setAnimation(data.animation);
      } else {
        setError(data.message || 'Failed to generate animation');
      }
    } catch (error) {
      console.error('Error converting text to gesture:', error);
      setError('Failed to convert text to gesture. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextInput(e.target.value);
    setError(null);
  };

  const handleConvertTextToGesture = async () => {
    if (!textInput.trim()) {
      setError('Please enter some text');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('text', textInput.trim());

      const response = await fetch('http://127.0.0.1:8000/api/convert-text-to-gesture/', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('Response:', data);

      if (data.status === 'success') {
        setAnimation(data.animation);
      } else {
        setError(data.message || 'Failed to generate animation');
      }
    } catch (error) {
      console.error('Error converting text to gesture:', error);
      setError('Failed to convert text to gesture. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartStopRecording = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported in this browser');
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      try {
        try {
          recognitionRef.current.start();
        } catch (startErr: any) {
          if (startErr.name === 'InvalidStateError') {
            console.log("Recognition was already running in sign language component");
            // Just continue as if it started successfully
          } else {
            // Re-throw other errors
            throw startErr;
          }
        }
      } catch (error) {
        console.error('Error starting recognition:', error);
        setError('Failed to start recording. Please try again.');
      }
    }
  };

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('preferred-theme', newMode ? 'dark' : 'light');
  };

  return (
    <div className={`${styles.pageWrapper} ${darkMode ? styles.darkMode : ''}`}>
      <button 
        className={styles.themeToggle} 
        onClick={toggleTheme}
      >
        {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
      </button>
      
      <div className={styles.container}>
        <div className={styles.formBox}>
          <div className={styles.headerSection}>
            <h2 className={styles.heading}>Sign Language Translator</h2>
            <p className={styles.subHeading}>Convert text or voice to sign language gestures</p>
          </div>
          
          <div className={styles.inputWrapper}>
            <div className={styles.inputContainer}>
              <div className={styles.inputIconWrapper}>
                <span className={styles.inputIcon}>✍️</span>
              </div>
              <input
                type="text"
                value={textInput}
                onChange={handleTextInputChange}
                placeholder="Enter text to translate..."
                className={styles.inputText}
              />
            </div>
            
            <div className={styles.buttonGroup}>
              <button
                onClick={handleConvertTextToGesture}
                disabled={loading}
                className={`${styles.button} ${styles.convertButton}`}
              >
                {loading ? (
                  <span className={styles.loadingSpinner}>
                    <span className={styles.spinnerDot}></span>
                  </span>
                ) : (
                  <>Convert to Sign</>
                )}
              </button>
              
              {isBrowser && (
                <button
                  onClick={handleStartStopRecording}
                  disabled={loading}
                  className={`${styles.button} ${styles.voiceButton} ${isRecording ? styles.recording : ''}`}
                >
                  {isRecording ? (
                    <>
                      <span className={styles.recordingPulse}></span>
                      Stop Recording
                    </>
                  ) : (
                    <>Use Voice Input</>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Display Transcribed Text */}
          {textInput && (
            <div className={styles.transcribedTextCard}>
              <h3 className={styles.cardTitle}>Input Text</h3>
              <p className={styles.transcribedText}>{textInput}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className={styles.errorMessage}>
              <span className={styles.errorIcon}>⚠️</span>
              <p>{error}</p>
            </div>
          )}

          {/* Animation Output */}
          {animation && (
            <div className={styles.resultSection}>
              <h3 className={styles.resultTitle}>Sign Language Animation</h3>
              <div className={styles.animationOutput}>
                <img
                  src={`data:image/gif;base64,${animation}`}
                  alt="Sign Language Animation"
                  className={styles.animationImage}
                />
              </div>
            </div>
          )}
          
          <div className={styles.footer}>
            <p>Bridging communication gaps through technology</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;