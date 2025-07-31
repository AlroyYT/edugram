import React, { useState, useEffect, useRef } from 'react';
import { backend_url } from '../components/config';
const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const [browserTranscript, setBrowserTranscript] = useState('');
  const [whisperTranscript, setWhisperTranscript] = useState('');
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState('');
  const [conversation, setConversation] = useState([]);  // Store chat history
  const [isReady, setIsReady] = useState(true);  // Flag to control when ready for next input
  const [processingChunks, setProcessingChunks] = useState(false);  // State for streaming
  const [remainingChunks, setRemainingChunks] = useState([]);  // State for audio queue

  const audioRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Load conversation from localStorage when component mounts
  useEffect(() => {
    const savedConversation = localStorage.getItem('jarvis_conversation');
    if (savedConversation) {
      try {
        setConversation(JSON.parse(savedConversation));
      } catch (e) {
        console.error("Error loading saved conversation:", e);
        // If there's an error parsing, start with empty conversation
      }
    }
  }, []);

  // Save conversation to localStorage whenever it changes
  useEffect(() => {
    if (conversation.length > 0) {
      localStorage.setItem('jarvis_conversation', JSON.stringify(conversation));
    }
  }, [conversation]);

  useEffect(() => {
    // Check if speech recognition is supported
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US'; // Set language explicitly

    recognitionRef.current.onresult = (event) => {
      // Only update transcript if we're ready for input
      if (isReady) {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');

        setBrowserTranscript(transcript);

        // Changed wake word from "hey jarvis" to just "jarvis"
        if (transcript.toLowerCase().includes('jarvis')) {
          setTriggered(true);
          startRecording();
        }
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.log("Speech recognition error:", event.error);
      setError(`Speech recognition error: ${event.error}`);
      
      // If the error is "no-speech", restart recognition after a delay
      if (event.error === 'no-speech' && isReady) {
        setTimeout(() => {
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
              setTimeout(() => {
                recognitionRef.current.start();
              }, 100);
            } catch (e) {
              console.error("Error restarting recognition:", e);
            }
          }
        }, 1000);
      }
    };

    recognitionRef.current.onend = () => {
      // Restart recognition if it wasn't explicitly stopped and we're ready for input
      if (isReady && !triggered) {
        try {
          recognitionRef.current.start();
        } catch (err) {
          console.error("Failed to restart recognition:", err);
        }
      }
    };

    // Only start recognition if we're ready for input
    if (isReady) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        setError(`Could not start speech recognition: ${err.message}`);
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isReady, triggered]);

  // Handle playing audio chunks in sequence
  useEffect(() => {
    if (processingChunks && remainingChunks.length > 0) {
      playNextChunk();
    } else if (processingChunks && remainingChunks.length === 0) {
      // This ensures we set processing to false when there are no more chunks
      setProcessingChunks(false);
      setIsReady(true);
      
      // Restart background recognition when all chunks are done
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Failed to restart recognition after audio chunks:", e);
        }
      }
    }
  }, [processingChunks, remainingChunks]);

  // Scroll to bottom of chat whenever conversation updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversation]);

  // Function to play the next audio chunk
  const playNextChunk = () => {
    if (remainingChunks.length === 0) {
      setProcessingChunks(false);
      setIsReady(true);
      
      // Restart background recognition when all chunks are done
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Failed to restart recognition after audio chunks:", e);
        }
      }
      return;
    }

    const chunk = remainingChunks[0].toString();
    const base64Data = chunk.includes(',') ? chunk.split(',')[1] : chunk;
    
    const byteCharacters = atob(base64Data);
    const byteArray = new Uint8Array([...byteCharacters].map(char => char.charCodeAt(0)));
    const audioBlob = new Blob([byteArray], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(audioBlob);

    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play()
        .catch(err => {
          console.error("Error playing audio:", err);
          // If we can't play, move to the next chunk
          setRemainingChunks(prevChunks => prevChunks.slice(1));
        });
      
      audioRef.current.onended = () => {
        URL.revokeObjectURL(audioUrl); // Clean up the URL
        // Remove the chunk we just played
        setRemainingChunks(prevChunks => prevChunks.slice(1));
      };
    }
  };

  // Function to clear conversation history
  const clearConversation = () => {
    setConversation([]);
    localStorage.removeItem('jarvis_conversation');
  };

  const startRecording = async () => {
    try {
      // Stop the background recognition while we record the command
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      
      setIsListening(true);
      setIsReady(false);  // Not ready for new commands while processing
      setBrowserTranscript(''); // Clear browser transcript while processing
      setError(''); // Clear any previous errors
      
      // Ensure you're using high quality audio
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        } 
      });
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm' // Explicitly set to webm as expected by backend
      });
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        setIsListening(false);
        setTriggered(false);

        if (audioChunksRef.current.length === 0) {
          setError('No speech detected.');
          setIsReady(true);  // Ready for new commands
          
          // Restart background recognition
          if (recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error("Failed to restart recognition after empty recording:", e);
            }
          }
          return;
        }

        // Create audio blob with webm type to match backend expectation
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

        if (audioBlob.size < 1000) {
          setError('No valid speech detected in recording.');
          setIsReady(true);  // Ready for new commands
          
          // Restart background recognition
          if (recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.error("Failed to restart recognition after invalid recording:", e);
            }
          }
          return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

          try {
            // Create a context object to send with the request
            // This includes conversation history (up to last 10 exchanges for brevity)
            const conversationContext = conversation.slice(-20); // Get last 20 messages (10 exchanges)
            
            const response = await fetch(`${backend_url}/api/process_audio/`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                audio: base64Audio,
                browserTranscript: browserTranscript,
                conversation: conversationContext // Send conversation history
              }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            const data = await response.json();

            if (response.ok && data.status === 'success') {
              // Use the correct field names that match the backend
              setWhisperTranscript(data.text);
              setResponseText(data.response);

              // Add to conversation history
              const newMessage = { role: 'user', content: data.text };
              const newResponse = { role: 'jarvis', content: data.response };
              setConversation(prev => [...prev, newMessage, newResponse]);

              // Check for streaming response
              if (data.streaming && data.voice_response) {
                const base64Data = data.voice_response.includes(',') 
                  ? data.voice_response.split(',')[1] 
                  : data.voice_response;
                
                const byteCharacters = atob(base64Data);
                const byteArray = new Uint8Array([...byteCharacters].map(char => char.charCodeAt(0)));
                const audioBlob = new Blob([byteArray], { type: 'audio/mp3' });
                const audioUrl = URL.createObjectURL(audioBlob);

                if (audioRef.current) {
                  // Play the first chunk immediately
                  audioRef.current.src = audioUrl;
                  audioRef.current.play()
                    .catch(err => {
                      console.error("Error playing first audio chunk:", err);
                      setIsReady(true);
                      if (recognitionRef.current) {
                        try {
                          recognitionRef.current.start();
                        } catch (e) {
                          console.error("Failed to restart recognition after audio error:", e);
                        }
                      }
                    });
                  
                  // When first chunk ends, start processing additional chunks
                  audioRef.current.onended = () => {
                    URL.revokeObjectURL(audioUrl); // Clean up the URL
                    if (data.additional_chunks && data.additional_chunks.length > 0) {
                      setRemainingChunks(data.additional_chunks);
                      setProcessingChunks(true);
                    } else {
                      // If no additional chunks, set ready
                      setProcessingChunks(false);
                      setIsReady(true);
                      
                      // Restart background recognition
                      if (recognitionRef.current) {
                        try {
                          recognitionRef.current.start();
                        } catch (e) {
                          console.error("Failed to restart recognition after audio playback:", e);
                        }
                      }
                    }
                  };
                }
              } else if (data.voice_response) {
                // Fall back to non-streaming behavior if streaming not available
                const base64Data = data.voice_response.includes(',') 
                  ? data.voice_response.split(',')[1] 
                  : data.voice_response;
                
                const byteCharacters = atob(base64Data);
                const byteArray = new Uint8Array([...byteCharacters].map(char => char.charCodeAt(0)));
                const audioBlob = new Blob([byteArray], { type: 'audio/mp3' });
                const audioUrl = URL.createObjectURL(audioBlob);

                if (audioRef.current) {
                  audioRef.current.src = audioUrl;
                  audioRef.current.play()
                    .catch(err => {
                      console.error("Error playing audio response:", err);
                      setIsReady(true);
                      if (recognitionRef.current) {
                        try {
                          recognitionRef.current.start();
                        } catch (e) {
                          console.error("Failed to restart recognition after audio error:", e);
                        }
                      }
                    });
                  
                  // Set up event listener for when audio playback ends
                  audioRef.current.onended = () => {
                    URL.revokeObjectURL(audioUrl); // Clean up the URL
                    // Ready for next interaction after audio finishes
                    setProcessingChunks(false); // Ensure this is set to false
                    setIsReady(true);
                    
                    // Restart background recognition
                    if (recognitionRef.current) {
                      try {
                        recognitionRef.current.start();
                      } catch (e) {
                        console.error("Failed to restart recognition after audio playback:", e);
                      }
                    }
                  };
                }
              } else {
                // If no audio response, set ready immediately
                setProcessingChunks(false);
                setIsReady(true);
                
                // Restart background recognition
                if (recognitionRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch (e) {
                    console.error("Failed to restart recognition without audio:", e);
                  }
                }
              }
            } else {
              setError(data.message || 'Could not understand audio.');
              setProcessingChunks(false);
              setIsReady(true);  // Ready for new commands
              
              // Restart background recognition
              if (recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  console.error("Failed to restart recognition after error response:", e);
                }
              }
            }
          } catch (err) {
            if (err.name === 'AbortError') {
              setError('Jarvis took too long to respond. Try again.');
            } else {
              setError(`Error sending audio to server: ${err.message}`);
            }
            
            setProcessingChunks(false);
            setIsReady(true);  // Ready for new commands
            
            // Restart background recognition
            if (recognitionRef.current) {
              try {
                recognitionRef.current.start();
              } catch (e) {
                console.error("Failed to restart recognition after request error:", e);
              }
            }
          }
        };

        reader.readAsDataURL(audioBlob);
        
        // Stop all tracks to release the microphone
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorderRef.current.start();

      // Record for 7 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 5000);
    } catch (err) {
      setError(`Microphone error: ${err.message}`);
      setIsListening(false);
      setTriggered(false);
      setProcessingChunks(false);
      setIsReady(true);  // Ready for new commands
      
      // Restart background recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Failed to restart recognition after error:", e);
        }
      }
    }
  };

  // Check if browser transcript contains command to clear conversation
  useEffect(() => {
    if (browserTranscript.toLowerCase().includes('jarvis clear') || 
        browserTranscript.toLowerCase().includes('jarvis reset') ||
        browserTranscript.toLowerCase().includes('clear conversation')) {
      clearConversation();
      setError('');
      setBrowserTranscript('');
      // Maybe also play a confirmation sound or response
      if (isReady) {
        setError('Conversation history cleared');
        setTimeout(() => setError(''), 3000);
      }
    }
  }, [browserTranscript, isReady]);

  return (
<div className="voice-assistant-container">

  <div className="hud-corner hud-corner-tl"></div>
  <div className="hud-corner hud-corner-tr"></div>
  <div className="hud-corner hud-corner-bl"></div>
  <div className="hud-corner hud-corner-br"></div>
  
  <div className="visualizer">
    <div className={`circle ${isListening ? 'listening' : ''}`}>
      <div className="innerCircle"></div>
    </div>
  </div>

  <div className="status">
    {isListening ? 'Voice Input Active' : processingChunks ? 'Processing Response' : isReady ? 'Say "Jarvis" to activate' : 'Analyzing...'}
  </div>

  {/* Debug transcript display - only shown when not processing */}
  {browserTranscript && isReady && (
    <div className="transcript">
      <h3>Audio Recognition:</h3>
      <p>{browserTranscript}</p>
    </div>
  )}
  
  {/* Chat history container */}
  <div className="chat-container" ref={chatContainerRef}>
    {conversation.length > 0 ? (
      conversation.map((message, index) => (
        <div key={index} className={`chat-message ${message.role}`}>
          <div className="chat-bubble">
            <strong>{message.role === 'user' ? 'U.S.E.R' : 'J.A.R.V.I.S.'}</strong>
            <p>{message.content}</p>
          </div>
        </div>
      ))
    ) : (
      <div className="chat-empty">
        <p>Communication logs will appear here, sir</p>
      </div>
    )}
  </div>

  {error && (
    <div className="error">
      <p>{error}</p>
    </div>
  )}

  {/* Clear conversation button */}
  {conversation.length > 0 && (
    <div className="clear-button-container">
      <button 
        className="clear-button"
        onClick={clearConversation}
        title="Clear conversation history (Or say 'Jarvis, clear conversation')"
      >
        Clear History
      </button>
    </div>
  )}

  <audio ref={audioRef} style={{ display: 'none' }} controls />
</div>
  );
};

export default VoiceAssistant;