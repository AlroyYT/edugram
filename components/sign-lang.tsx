import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/sign.module.css'; // Import the CSS Module

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
  
  // Use refs to store recognition instance
  const recognitionRef = useRef<any>(null);
  // Track if component is mounted on client side
  const [isBrowser, setIsBrowser] = useState(false);

  // Only run this effect once on client-side
  useEffect(() => {
    setIsBrowser(true);
    
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

      const response = await fetch('http://127.0.0.1:8000/api/convert-text-to-gesture/', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('Response:', data); // Debug log

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
      console.log('Response:', data); // Debug log

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
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting recognition:', error);
        setError('Failed to start recording. Please try again.');
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formBox}>
        <h2 className={styles.heading}>Convert Text or Voice to Sign Language</h2>

        {/* Section for Text to Sign Language */}
        <div className="flex justify-center items-center space-x-8 mb-8">
          <div className={styles.inputSection}>
            <input
              type="text"
              value={textInput}
              onChange={handleTextInputChange}
              placeholder="Enter text"
              className={styles.inputText}
            />
            <button
              onClick={handleConvertTextToGesture}
              disabled={loading}
              className={styles.button}
            >
              {loading ? 'Converting...' : 'Convert Text'}
            </button>
          </div>

          {/* Section for Voice to Sign Language */}
          {isBrowser && (
            <div className={styles.inputSection}>
              <button
                onClick={handleStartStopRecording}
                disabled={loading}
                className={styles.button}
              >
                {isRecording ? 'Stop Recording' : 'Start Recording'}
              </button>
            </div>
          )}
        </div>

        {/* Display Transcribed Text */}
        <div className={styles.transcribedText}>
          <p>{textInput}</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className={styles.errorMessage}>
            <p>{error}</p>
          </div>
        )}

        {/* Animation Output */}
        {animation && (
          <div className={styles.animationOutput}>
            <img
              src={`data:image/gif;base64,${animation}`}
              alt="Sign Language Animation"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;