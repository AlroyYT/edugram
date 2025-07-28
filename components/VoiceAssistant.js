import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

const VoiceAssistant = () => {
  const router = useRouter();
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
  const [isRecognitionActive, setIsRecognitionActive] = useState(false); // Track recognition status
  
  // Helper function for safely starting speech recognition with error handling
  const safelyStartRecognition = (context) => {
    if (!recognitionRef.current) {
      console.log(`Cannot start recognition in ${context}: recognition not initialized`);
      return false;
    }
    
    // Check if recognition might actually be running already
    let isActuallyRunning = false;
    try {
      // Some browsers implement this non-standard property
      if (recognitionRef.current.state === 'running') {
        console.log(`Recognition already running in ${context} (detected via state property)`);
        isActuallyRunning = true;
      }
    } catch (stateErr) {
      // Browser doesn't support checking recognition state directly
    }
    
    if (!isActuallyRunning) {
      try {
        console.log(`Starting recognition in ${context}`);
        // Try to start with specific error handling
        try {
          setIsRecognitionActive(true);
          recognitionRef.current.start();
          return true;
        } catch (startErr) {
          if (startErr.name === 'InvalidStateError') {
            console.log(`Recognition already started in ${context} (caught via InvalidStateError)`);
            setIsRecognitionActive(true); // Update our state to match reality
            return true;
          } else {
            throw startErr; // Re-throw if it's a different error
          }
        }
      } catch (err) {
        console.error(`Failed to start recognition in ${context}:`, err);
        setIsRecognitionActive(false);
        return false;
      }
    } else {
      // Already running
      console.log(`Recognition already running in ${context}, updating state`);
      setIsRecognitionActive(true);
      return true;
    }
  };

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

  // Recognition status is already defined above
  
  useEffect(() => {
    // Check if speech recognition is supported
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    // Only create a new instance if there isn't one already
    if (!recognitionRef.current) {
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
      
      // Mark recognition as inactive on error
      setIsRecognitionActive(false);
      
      // Handle different types of errors
      if ((event.error === 'no-speech' || event.error === 'aborted') && isReady) {
        // For both no-speech and aborted errors, we want to restart recognition
        console.log(`Handling ${event.error} error by restarting recognition after delay`);
        
        // Clear error after a short time to not worry the user
        setTimeout(() => setError(''), 3000);
        
        setTimeout(() => {
          if (recognitionRef.current && !isRecognitionActive && isReady) {
            try {
              // First stop recognition to be sure it's properly terminated
              try {
                recognitionRef.current.stop();
              } catch (stopErr) {
                console.log("Error stopping recognition (expected):", stopErr);
              }
              
              // Then start after a short delay
              setTimeout(() => {
                if (recognitionRef.current && !isRecognitionActive && isReady) {
                  safelyStartRecognition("after error recovery");
                }
              }, 500);
            } catch (e) {
              console.error("Error restarting recognition:", e);
              setIsRecognitionActive(false);
            }
          }
        }, 1000);
      }
    };

      recognitionRef.current.onend = () => {
        console.log("Recognition ended");
        // Set recognition as inactive when it ends
        setIsRecognitionActive(false);
        
        // Clear any error messages related to aborted recognition
        if (error.includes("aborted")) {
          setError('');
        }
        
        // Restart recognition if it wasn't explicitly stopped and we're ready for input
        if (isReady && !triggered) {
          // Add a longer delay for aborted errors to give the browser time to release resources
          const wasAborted = error.includes("aborted");
          const delayTime = wasAborted ? 1500 : 500;
          
          if (wasAborted) {
            console.log("Adding longer delay after aborted error to ensure resources are released");
          }
          
          setTimeout(() => {
            try {
              // First check if recognition is still needed and not already active
              if (recognitionRef.current && !isRecognitionActive && isReady && !triggered) {
                console.log(`Attempting to restart recognition after end event${wasAborted ? " (was aborted)" : ""}`);
                
                // Use the helper function to safely start recognition
                safelyStartRecognition("after end event" + (wasAborted ? " (recovering from abort)" : ""));
              }
            } catch (err) {
              console.error("Failed to restart recognition:", err);
              setIsRecognitionActive(false);
            }
          }, delayTime);
        }
      };
    }

    // Only start recognition if we're ready for input and not already active
    if (isReady && !isRecognitionActive && recognitionRef.current) {
      try {
        // Before trying to start, check if recognition is actually running
        let isActuallyRunning = false;
        
        // Check state directly if possible using non-standard but available property in some browsers
        try {
          if (recognitionRef.current && recognitionRef.current.state === 'running') {
            isActuallyRunning = true;
          }
        } catch (stateErr) {
          console.log("Browser doesn't support checking recognition state directly");
        }
        
        // Use our helper function to safely start recognition
        safelyStartRecognition("initial start");
      } catch (err) {
        console.error(`Could not start speech recognition: ${err.message}`);
        setError(`Could not start speech recognition: ${err.message}`);
        setIsRecognitionActive(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          setIsRecognitionActive(false);
        } catch (err) {
          console.log("Error stopping recognition on cleanup:", err);
        }
      }
    };
  }, [isReady, triggered, isRecognitionActive]);
  
  // Handle browser visibility changes to prevent aborted errors
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Page became visible - ensuring recognition is active");
        // When the page becomes visible again, restart recognition if needed
        setTimeout(() => {
          if (recognitionRef.current && !isRecognitionActive && isReady && !triggered) {
            safelyStartRecognition("after visibility change");
          }
        }, 1000); // Give browser time to stabilize
      } else {
        console.log("Page became hidden - stopping recognition to prevent aborted errors");
        // When page becomes hidden, stop recognition to avoid aborted errors
        if (recognitionRef.current && isRecognitionActive) {
          try {
            recognitionRef.current.stop();
            setIsRecognitionActive(false);
          } catch (err) {
            console.log("Error stopping recognition on visibility change:", err);
          }
        }
      }
    };
    
    // Add event listener for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRecognitionActive, isReady, triggered]);
  
  // Handle playing audio chunks in sequence
  useEffect(() => {
    if (processingChunks && remainingChunks.length > 0) {
      playNextChunk();
    } else if (processingChunks && remainingChunks.length === 0) {
      // This ensures we set processing to false when there are no more chunks
      setProcessingChunks(false);
      setIsReady(true);
      
      // Restart background recognition when all chunks are done
      if (recognitionRef.current && !isRecognitionActive) {
        try {
          // Double-check recognition state before starting
          if (recognitionRef.current.state !== 'started') {
            console.log("Restarting recognition after audio chunks");
            setIsRecognitionActive(true);
            recognitionRef.current.start();
          } else {
            console.log("Recognition already active after audio chunks");
            setIsRecognitionActive(true); // Update our state to match reality
          }
        } catch (e) {
          console.error("Failed to restart recognition after audio chunks:", e);
          setIsRecognitionActive(false);
        }
      }
    }
  }, [processingChunks, remainingChunks, isRecognitionActive]);

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
      if (recognitionRef.current && !isRecognitionActive) {
        try {
          // Check recognition state first to prevent errors
          if (recognitionRef.current.state !== 'started') {
            console.log("Restarting recognition in playNextChunk");
            setIsRecognitionActive(true);
            recognitionRef.current.start();
          } else {
            console.log("Recognition already active in playNextChunk");
            setIsRecognitionActive(true); // Update our state to match reality
          }
        } catch (e) {
          console.error("Failed to restart recognition in playNextChunk:", e);
          setIsRecognitionActive(false);
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

  // Advanced intent handling system that can process both navigation and action requests
  const handleAdvancedIntents = (transcript, aiResponse) => {
    if (!transcript && !aiResponse) return null;
    
    // Helper function to check if a document is available for processing
    const checkForDocumentAccess = () => {
      // Check if there's a document in context that can be used
      return localStorage.getItem('uploadedFile') !== null;
    };
    
    // Helper function for navigation - keep the timeout minimal for faster responses
    const navigateTo = (path, pageName) => {
      setTimeout(() => {
        router.push(path);
      }, 800); // Reduced from 1500ms to 800ms for faster navigation
      return `Navigating to ${pageName}...`;
    };
    
    // Define all available intents
    const intents = {
      // Main navigation pages
      NAVIGATE_DEAF: {
        action: () => navigateTo('/deaf', 'Deaf Assistance'),
        patterns: ['deaf assistance', 'deaf help', 'go to deaf', 'open deaf', 'show deaf']
      },
      NAVIGATE_BLIND: {
        action: () => navigateTo('/voice-assistant', 'Blind Assistance'),
        patterns: ['blind assistance', 'voice assistant', 'go to blind', 'open blind', 'show blind']
      },
      NAVIGATE_PERSONALIZED: {
        action: () => navigateTo('/topic-explorer', 'Personalized Learning'),
        patterns: ['personalized learning', 'topic explorer', 'go to personalized', 'open personalized']
      },
      FEATURE_TOPIC_RECOMMENDATIONS: {
        action: () => {
          router.push('/topic-explorer');
          return "I can help you discover new topics to learn about. Navigating to the Topic Explorer where you can find personalized recommendations...";
        },
        patterns: ['recommend topic', 'suggest topic', 'new topic', 'topic idea', 'what should i learn', 'topic recommendation', 'recommend new topics', 'suggest something to learn']
      },
      NAVIGATE_FEATURES: {
        action: () => navigateTo('/features', 'Features Page'),
        patterns: ['features page', 'go to features', 'show features', 'all features', 'available features']
      },
      NAVIGATE_HOME: {
        action: () => navigateTo('/', 'Home Page'),
        patterns: ['home page', 'go to home', 'go back home', 'homepage', 'main page']
      },
      NAVIGATE_SIGN: {
        action: () => navigateTo('/sign', 'Sign Language Translator'),
        patterns: ['sign language', 'go to sign', 'sign translator', 'translate signs']
      },
      NAVIGATE_SUMMARY: {
        action: () => navigateTo('/summary', 'Summary Tool'),
        patterns: ['summary tool', 'go to summary', 'summarize', 'summarization']
      },
      
      // Feature-specific intents for document processing
      FEATURE_FLASHCARDS: {
        action: () => {
          if (checkForDocumentAccess()) {
            router.push('/flash');
            return "Opening flashcard generator...";
          }
          return "Please upload a document first to create flashcards. Would you like me to navigate to the document upload page?";
        },
        patterns: ['flashcard', 'flash card', 'study card', 'make card', 'create card']
      },
      FEATURE_SUMMARY: {
        action: () => {
          if (checkForDocumentAccess()) {
            router.push('/summary');
            return "Opening document summarizer...";
          }
          return "Please upload a document first to create a summary. Would you like me to navigate to the document upload page?";
        },
        patterns: ['summar', 'condense', 'shorten', 'brief']
      },
      FEATURE_QUIZ: {
        action: () => {
          if (checkForDocumentAccess()) {
            router.push('/quizz');
            return "Opening quiz generator...";
          }
          return "Please upload a document first to create a quiz. Would you like me to navigate to the document upload page?";
        },
        patterns: ['quiz', 'question', 'test me', 'assessment', 'exam']
      },
      TRANSLATE_SIGN: {
        action: () => {
          router.push('/sign');
          return "Opening sign language translator...";
        },
        patterns: ['translate sign', 'sign language translation', 'convert to sign language']
      }
    };
    
    // SPEED OPTIMIZATION: Check user transcript first (fastest path)
    // This gives immediate response to direct user commands without waiting for AI processing
    if (transcript) {
      const lowerInput = transcript.toLowerCase();
      
      // Fast path: Check for common navigation patterns first with direct string checks
      // These are the most frequently used commands, so we check them first for speed
      if (lowerInput.includes('go to home') || lowerInput.includes('home page')) {
        console.log("Fast path: Home navigation");
        return intents.NAVIGATE_HOME.action();
      }
      
      if (lowerInput.includes('deaf')) {
        console.log("Fast path: Deaf assistance navigation");
        return intents.NAVIGATE_DEAF.action();
      }
      
      if (lowerInput.includes('blind') || lowerInput.includes('voice assistant')) {
        console.log("Fast path: Blind assistance navigation");
        return intents.NAVIGATE_BLIND.action();
      }
      
      // Check all other patterns - using a more efficient approach
      // We group patterns by intent to reduce nested loops
      const intentEntries = Object.entries(intents);
      for (let i = 0; i < intentEntries.length; i++) {
        const [intentName, intentConfig] = intentEntries[i];
        for (let j = 0; j < intentConfig.patterns.length; j++) {
          if (lowerInput.includes(intentConfig.patterns[j])) {
            console.log(`Detected intent ${intentName} from user transcript`);
            return intentConfig.action();
          }
        }
      }
    }
    
    // Then check for special Gemini navigation formats (second fastest path)
    if (aiResponse) {
      // Check for special navigation format [NAVIGATE:path] - fastest AI path
      const navRegex = /\[NAVIGATE:(\/[a-z\-]*)\](.*)/i;
      const match = aiResponse.match(navRegex);
      
      if (match) {
        const path = match[1];
        const message = match[2] || "Navigating...";
        // Use faster navigation
        setTimeout(() => {
          router.push(path);
        }, 800); // Reduced for speed
        return message.trim();
      }
      
      // Check for special feature format from Gemini: [FEATURE:name]
      const featureMatch = aiResponse.match(/\[FEATURE:([^\]]+)\]/);
      if (featureMatch) {
        const featureName = featureMatch[1].toLowerCase();
        // Direct lookup with cached key matches
        const featurePrefix = `FEATURE_${featureName.toUpperCase()}`;
        const exactMatch = intents[featurePrefix];
        if (exactMatch) {
          return exactMatch.action();
        }
        
        // Fallback to partial match if exact match not found
        const matchingIntent = Object.keys(intents).find(key => 
          key.toLowerCase().includes(`feature_${featureName}`)
        );
        if (matchingIntent) {
          return intents[matchingIntent].action();
        }
      }
      
      // Check Gemini's response for action intent patterns
      const lowerResponse = aiResponse.toLowerCase();
      const intentEntries = Object.entries(intents);
      for (let i = 0; i < intentEntries.length; i++) {
        const [intentName, intentConfig] = intentEntries[i];
        for (let j = 0; j < intentConfig.patterns.length; j++) {
          if (lowerResponse.includes(intentConfig.patterns[j])) {
            console.log(`Detected intent ${intentName} from Gemini response`);
            return intentConfig.action();
          }
        }
      }
    }
    
    // No intent detected
    return null;
  };

  // Function to clear conversation history
  const clearConversation = () => {
    setConversation([]);
    localStorage.removeItem('jarvis_conversation');
  };

  const startRecording = async () => {
    try {
      // Stop the background recognition while we record the command
      if (recognitionRef.current && isRecognitionActive) {
        try {
          recognitionRef.current.stop();
          setIsRecognitionActive(false);
        } catch (e) {
          console.error("Error stopping recognition before recording:", e);
        }
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
          if (recognitionRef.current && !isRecognitionActive && isReady) {
            setTimeout(() => {
              try {
                setIsRecognitionActive(true);
                recognitionRef.current.start();
              } catch (e) {
                console.error("Failed to restart recognition after invalid recording:", e);
                setIsRecognitionActive(false);
              }
            }, 500);
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
            
            // Create system instructions to help Gemini understand navigation commands
            const systemInstructions = `
You are Jarvis, an AI assistant for the Edugram platform. When the user asks to navigate somewhere or perform a specific action, 
you should indicate this in your response using one of these special formats:
1. For navigation: Include [NAVIGATE:/path] at the start of your response, such as [NAVIGATE:/deaf] I'll take you to deaf assistance...
2. For specific features: Mention the action clearly, like "Opening flashcard generator..." or "Starting summary tool..."

Available pages and their paths:
- Home page: /
- Deaf Assistance: /deaf
- Blind Assistance (Voice assistant): /voice-assistant
- Personalized Learning (Topic Explorer): /topic-explorer
- Features overview: /features
- Sign Language Translator: /sign
- Summary Tool: /summary
- Flashcards: /flash

Detect when the user wants to navigate or perform actions, even if they don't use exact commands.
`;
            
            const response = await fetch('https://edugram-574544346633.asia-south1.run.app/api/process_audio/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                audio: base64Audio,
                browserTranscript: browserTranscript,
                conversation: conversationContext, // Send conversation history
                systemInstructions: systemInstructions // Add system instructions for Gemini
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
              
              // Check for navigation or action intents in both user input and Gemini's response
              const actionResponse = handleAdvancedIntents(data.text, data.response);
              if (actionResponse) {
                console.log("Handling intent from Gemini response:", actionResponse);
                // Update the response text to reflect the action
                setResponseText(actionResponse);
              }

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
              // Try client-side fallback for navigation or action commands
              const actionResponse = handleAdvancedIntents(browserTranscript, null);
              if (actionResponse) {
                // If an action/navigation was handled, use that response
                const newMessage = { role: 'user', content: browserTranscript };
                const newResponse = { role: 'jarvis', content: actionResponse };
                setConversation(prev => [...prev, newMessage, newResponse]);
                setResponseText(actionResponse);
              } else {
                setError(data.message || 'Could not understand audio.');
              }
              
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
            // Try client-side fallback for navigation or action commands
            const actionResponse = handleAdvancedIntents(browserTranscript, null);
            
            if (actionResponse) {
              // If an action/navigation was handled, use that response
              const newMessage = { role: 'user', content: browserTranscript };
              const newResponse = { role: 'jarvis', content: actionResponse };
              setConversation(prev => [...prev, newMessage, newResponse]);
              setResponseText(actionResponse);
            } else {
              // Show appropriate error based on type
              if (err.name === 'AbortError') {
                setError('Jarvis took too long to respond. Try again.');
              } else {
                setError(`Error sending audio to server: ${err.message}`);
              }
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
      }, 7000);
    } catch (err) {
      setError(`Microphone error: ${err.message}`);
      setIsListening(false);
      setTriggered(false);
      setProcessingChunks(false);
      setIsReady(true);  // Ready for new commands
      
      // Restart background recognition
      if (recognitionRef.current) {
        safelyStartRecognition("after error");
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