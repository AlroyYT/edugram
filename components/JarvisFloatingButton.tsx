import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useFileContext } from '../context/FileContext';
import { useFileUpload, detectFileUploadCommand } from './FileUploadHelper';

interface ConversationMessage {
  role: 'user' | 'assistant' | 'jarvis';
  content: string;
}

// Type definition for SpeechRecognition and File System Access API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    showDirectoryPicker?: (options?: any) => Promise<any>;
  }

  // Add missing methods to the existing FileSystemHandle interface
  interface FileSystemHandle {
    // These methods exist but aren't in the standard TypeScript DOM types yet
    queryPermission(options: { mode: 'read' | 'readwrite' }): Promise<'granted' | 'denied' | 'prompt'>;
    requestPermission(options: { mode: 'read' | 'readwrite' }): Promise<'granted' | 'denied'>;
    toJSON(): Promise<any>;
  }

  // Add static method to the FileSystemHandle interface constructor
  interface FileSystemHandleConstructor {
    fromJSON(json: any): Promise<FileSystemHandle>;
  }

  // Augment the FileSystemHandle constructor without redefining the variable
  interface FileSystemHandleConstructor {
    new(): FileSystemHandle;
    prototype: FileSystemHandle;
    fromJSON(json: any): Promise<FileSystemHandle>;
  }
}

const JarvisFloatingButton = () => {
  const [isListening, setIsListening] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const [browserTranscript, setBrowserTranscript] = useState('');
  const [whisperTranscript, setWhisperTranscript] = useState('');
  const [responseText, setResponseText] = useState('');
  const [error, setError] = useState('');
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);  // Store chat history
  const { uploadedFile, setUploadedFile } = useFileContext(); // Access the file context
  const [isReady, setIsReady] = useState(true);  // Flag to control when ready for next input
  const [processingChunks, setProcessingChunks] = useState(false);  // State for streaming
  const [remainingChunks, setRemainingChunks] = useState([]);  // State for audio queue
  const [isRecognitionActive, setIsRecognitionActive] = useState(false); // Track recognition state
  const [showAssistant, setShowAssistant] = useState(false); // Control visibility of the assistant
  const [isButtonVisible, setIsButtonVisible] = useState(true); // Control visibility of the button
  const [recognitionInitialized, setRecognitionInitialized] = useState(false); // Track if recognition is initialized
  const [lastNavigatedTo, setLastNavigatedTo] = useState(''); // Track the last page we navigated to
  const [isInMeeting, setIsInMeeting] = useState(false); // Track if user is in a meeting (like Google Meet)
  const [usedKeyboardNavigation, setUsedKeyboardNavigation] = useState(false); // Track if keyboard navigation is being used
  
  // Use our new file upload helper
  const fileUploadHelper = useFileUpload();

  const router = useRouter();
  
  // Detect if user is in a Google Meet or similar video call
  useEffect(() => {
    // Function to detect if microphone might be in use by another application
    const detectActiveMeeting = async () => {
      try {
        // Try to quickly access the microphone
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true 
          } 
        });
        
        // If we get here, the microphone is available
        if (isInMeeting) {
          console.log("Microphone now available - exited meeting mode");
          setIsInMeeting(false);
          
          // Announce to users who rely on audio feedback
          const utterance = new SpeechSynthesisUtterance("Microphone is now available. Voice commands are active again. You can continue using keyboard shortcuts if preferred.");
          window.speechSynthesis.speak(utterance);
          
          // Remove the meeting notification if it's still there
          const notification = document.getElementById('meeting-notification');
          if (notification) {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.5s ease';
            setTimeout(() => notification.remove(), 500);
          }
          
          // Try to restart recognition
          if (!isRecognitionActive && recognitionRef.current) {
            setTimeout(() => safelyStartRecognition("meeting exit"), 1000);
          }
          
          // Show a toast notification that voice commands are back
          const voiceActiveNotification = document.createElement('div');
          voiceActiveNotification.id = 'voice-active-notification';
          voiceActiveNotification.style.position = 'fixed';
          voiceActiveNotification.style.bottom = '80px';
          voiceActiveNotification.style.right = '20px';
          voiceActiveNotification.style.backgroundColor = 'rgba(16, 185, 129, 0.9)';  // Green color
          voiceActiveNotification.style.color = 'white';
          voiceActiveNotification.style.padding = '15px 20px';
          voiceActiveNotification.style.borderRadius = '10px';
          voiceActiveNotification.style.zIndex = '9999';
          voiceActiveNotification.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
          voiceActiveNotification.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">Voice Commands Active</div>
            <div style="font-size: 14px;">Say "Jarvis" to activate voice assistant</div>
          `;
          
          document.body.appendChild(voiceActiveNotification);
          
          // Remove after 5 seconds
          setTimeout(() => {
            const notification = document.getElementById('voice-active-notification');
            if (notification) {
              notification.style.opacity = '0';
              notification.style.transition = 'opacity 0.5s ease';
              setTimeout(() => notification.remove(), 500);
            }
          }, 5000);
        }
        
        // Clean up the test stream
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        // If we can't get microphone access, it might be in use by a meeting
        if (!isInMeeting) {
          console.log("Microphone may be in use by another application like Google Meet:", err);
          setIsInMeeting(true);
          
          // Announce to users who rely on audio feedback
          const utterance = new SpeechSynthesisUtterance(
            "Meeting detected. You're in Google Meet which affects microphone access. Please wait until your meeting ends, or disconnect from this meeting to use voice commands."
          );
          utterance.rate = 1.0;
          window.speechSynthesis.speak(utterance);
          
          // Set error message for visual users
          setError("Microphone is being used by another application (like Google Meet). Please end your meeting to use voice commands.");
        }
      }
    };
    
    // Run the check periodically to detect meeting status changes
    detectActiveMeeting();
    const meetingDetectionInterval = setInterval(detectActiveMeeting, 60000); // Check every minute
    
    return () => clearInterval(meetingDetectionInterval);
  }, [isInMeeting, isRecognitionActive]);
  
  // Effect to monitor page changes and apply appropriate accessibility controls
  useEffect(() => {
    // Clear any existing speech when navigating
    window.speechSynthesis.cancel();
    
    // Current page-specific setup
    const currentPage = router.pathname;
    
    let cleanupFunction: (() => void) | void;
    
    // Apply specific controls based on the current page
    switch (currentPage) {
      case '/flash':
        // Give the components time to mount before attaching controls
        setTimeout(() => {
          cleanupFunction = handleFlashcardControls();
        }, 1500);
        break;
      case '/quizz':
        // Give the components time to mount before attaching controls
        setTimeout(() => {
          cleanupFunction = handleQuizControls();
        }, 1500);
        break;
      case '/deaf':
        // Add focus to the file upload input for blind users
        setTimeout(() => {
          const fileInput = document.getElementById('file-upload') as HTMLInputElement;
          if (fileInput) {
            fileInput.focus();
            speakForBlindUsers("Document upload page. Press Alt+U to open file selection dialog.", true);
          }
        }, 1500);
        break;
      default:
        // No special controls for other pages
        if (currentPage === '/') {
          speakForBlindUsers("Home page loaded. Use Alt+J for keyboard shortcuts.", false);
        }
        break;
    }
    
    // Return cleanup function if one was provided
    return () => {
      if (cleanupFunction) cleanupFunction();
    };
  }, [router.pathname]);
  
  // Helper function to check if a document is available for keyboard navigation
  const hasAccessibleDocument = (): boolean => {
    // Check if there's a document in context that can be used
    return uploadedFile !== null;
  };
  
  // Helper function for accessibility speech feedback
  const speakForBlindUsers = (message: string, priority: boolean = false) => {
    // Cancel previous speech if this is a priority message
    if (priority) window.speechSynthesis.cancel();
    
    // Instead of using speech synthesis directly, add message to conversation
    // so Jarvis responds with this information instead
    const assistantMessage: ConversationMessage = { 
      role: 'jarvis', 
      content: message
    };
    setConversation(prev => [...prev, assistantMessage]);
    
    // We'll add a short delay before allowing new commands to ensure the message is processed
    setIsReady(false);
    setTimeout(() => setIsReady(true), 500);
    
    console.log("Jarvis speaking:", message);
  };
  
  // Function to handle voice commands for flashcard navigation
  const handleFlashcardControls = (command?: string) => {
    // Only apply these controls when on flashcard page
    if (router.pathname !== '/flash') return;
    
    // Find the flashcard elements
    const toggleCardButton = document.querySelector('.fcrd84_flashcard') as HTMLElement;
    const prevButton = document.querySelector('.fcrd84_prev_button') as HTMLButtonElement;
    const nextButton = document.querySelector('.fcrd84_next_button') as HTMLButtonElement || 
                       document.querySelector('.fcrd84_done_button') as HTMLButtonElement;
    
    // If this is the initial call with no command, read instructions and first card
    if (!command) {
      // Read initial instructions when flashcard page loads
      speakForBlindUsers(
        "Flashcard page loaded. Say 'flip' to reveal answer, 'next' for the next flashcard, 'previous' for the previous flashcard, " +
        "'read' to hear the current card content, 'progress' to hear your progress, or 'help' for instructions.",
        true
      );
      
      // After announcing instructions, read the first flashcard question
      setTimeout(() => {
        const frontContent = document.querySelector('.fcrd84_flashcard_front h2')?.textContent;
        if (frontContent) {
          speakForBlindUsers(`Question: ${frontContent}`, true);
        }
      }, 5000);
      
      // Return an empty cleanup function
      return () => {};
    }
    
    // Handle specific voice commands
    switch(command) {
      case 'flip':
        // Flip the card
        if (toggleCardButton) {
          toggleCardButton.click();
          
          // Read the appropriate content based on whether card is flipped
          setTimeout(() => {
            const isFlipped = toggleCardButton.classList.contains('fcrd84_flipped');
            if (isFlipped) {
              const backContent = document.querySelector('.fcrd84_flashcard_back p')?.textContent;
              if (backContent) {
                speakForBlindUsers(`Answer: ${backContent}`, true);
              }
            } else {
              const frontContent = document.querySelector('.fcrd84_flashcard_front h2')?.textContent;
              if (frontContent) {
                speakForBlindUsers(`Question: ${frontContent}`, true);
              }
            }
          }, 500);
        }
        break;
        
      case 'next':
        // Go to next card
        if (nextButton && !nextButton.disabled) {
          nextButton.click();
          
          // Check if this was the "Done" button
          if (nextButton.textContent?.includes('Done')) {
            speakForBlindUsers("Finished flashcards. Returning to document portal.", true);
          } else {
            // Read the next card after a small delay
            setTimeout(() => {
              const frontContent = document.querySelector('.fcrd84_flashcard_front h2')?.textContent;
              if (frontContent) {
                speakForBlindUsers(`Question: ${frontContent}`, true);
              }
            }, 1000);
          }
        }
        break;
        
      case 'previous':
        // Go to previous card
        if (prevButton && !prevButton.disabled) {
          prevButton.click();
          
          // Read the previous card after a small delay
          setTimeout(() => {
            const frontContent = document.querySelector('.fcrd84_flashcard_front h2')?.textContent;
            if (frontContent) {
              speakForBlindUsers(`Question: ${frontContent}`, true);
            }
          }, 1000);
        } else {
          speakForBlindUsers("This is the first card. You cannot go back further.", true);
        }
        break;
        
      case 'read':
        // Read current card content
        const isFlipped = toggleCardButton?.classList.contains('fcrd84_flipped');
        if (isFlipped) {
          const backContent = document.querySelector('.fcrd84_flashcard_back p')?.textContent;
          if (backContent) {
            speakForBlindUsers(`Answer: ${backContent}`, true);
          }
        } else {
          const frontContent = document.querySelector('.fcrd84_flashcard_front h2')?.textContent;
          if (frontContent) {
            speakForBlindUsers(`Question: ${frontContent}`, true);
          }
        }
        break;
        
      case 'progress':
        // Report flashcard progress
        const progressText = document.querySelector('.fcrd84_card_counter span')?.textContent;
        if (progressText) {
          speakForBlindUsers(progressText, true);
        }
        break;
        
      default:
        // Check for help command or unknown command
        if (command.toLowerCase().includes('help')) {
          speakForBlindUsers(
            "Flashcard commands: Say 'flip' to reveal answer, 'next' for the next flashcard, 'previous' for the previous flashcard, " +
            "'read' to hear the current card content, or 'progress' to hear your progress.",
            true
          );
        } else {
          speakForBlindUsers("I didn't recognize that flashcard command. Try saying 'flip', 'next', 'previous', 'read', or 'progress'.", true);
        }
        break;
    }
  };
  
  // Helper function to announce progress in flashcards or quiz
  const announceProgress = () => {
    if (router.pathname === '/flash') {
      // Get flashcard progress information
      const progressText = document.querySelector('.fcrd84_card_counter span')?.textContent;
      if (progressText) {
        speakForBlindUsers(progressText, true);
      }
    } else if (router.pathname === '/quizz') {
      // Get quiz progress information
      const progressText = document.querySelector('.quizProgressText')?.textContent;
      if (progressText) {
        speakForBlindUsers(progressText, true);
        
        // Also announce timer if available
        const timerText = document.querySelector('.quizTimerCircle text')?.textContent;
        if (timerText) {
          setTimeout(() => {
            speakForBlindUsers(`${timerText} seconds remaining`, false);
          }, 1000);
        }
      }
    }
  };

  // Function to handle voice commands for quiz interaction
  const handleQuizControls = (command?: string) => {
    // Only apply these controls when on quiz page
    if (router.pathname !== '/quizz') return;
    
    // Find quiz elements
    const optionButtons = document.querySelectorAll('.quizOptionButton') as NodeListOf<HTMLButtonElement>;
    const questionText = document.querySelector('.quizQuestionText') as HTMLElement;
    const nextButton = document.querySelector('.quizNextButton') as HTMLButtonElement;
    const prevButton = document.querySelector('.quizPrevButton') as HTMLButtonElement;
    
    // Function to read current question and all options
    const readFullQuestion = () => {
      if (questionText) {
        // First read the question
        speakForBlindUsers(`Question: ${questionText.textContent}`, true);
        
        // Then read all options after a delay
        setTimeout(() => {
          let optionsText = "Options: ";
          optionButtons.forEach((button, index) => {
            const letter = button.querySelector('.quizOptionLetter')?.textContent;
            const text = button.querySelector('.quizOptionText')?.textContent;
            optionsText += `${letter} ${text}. `;
          });
          speakForBlindUsers(optionsText, false);
        }, 2000);
      }
    };
    
    // If this is the initial call with no command, set up timer checks and read instructions
    if (!command) {
      // Set up timer checks for announcements
      const setupTimerAnnouncements = () => {
        // Check timer every 5 seconds
        const timerInterval = setInterval(() => {
          const timerText = document.querySelector('.quizTimerCircle text')?.textContent;
          if (timerText) {
            const seconds = parseInt(timerText);
            // Announce when timer reaches specific thresholds
            if (seconds === 30) {
              speakForBlindUsers("30 seconds remaining", true);
            } else if (seconds === 10) {
              speakForBlindUsers("10 seconds remaining", true);
            }
          }
        }, 5000);
        
        return timerInterval;
      };
      
      // Initialize the timer checks
      const timerInterval = setupTimerAnnouncements();
      
      // Read initial instructions when quiz page loads
      speakForBlindUsers(
        "Quiz page loaded. I'll read the question and options. Say 'select A' to choose option A, " +
        "'select B' for option B, and so on. Say 'repeat question' to hear the question again, " +
        "'repeat options' for just the options, or 'repeat' for both. Say 'next' to go to the next question " +
        "or 'previous' to go back. Say 'help' for instructions.",
        true
      );
      
      // After announcing instructions, read the first question and options
      setTimeout(() => {
        readFullQuestion();
      }, 5000);
      
      // Return cleanup function to clear timer
      return () => {
        clearInterval(timerInterval);
      };
    }
    
    // Handle specific voice commands for quiz interaction
    switch(command) {
      case 'repeat-question':
        // Read just the question
        if (questionText) {
          speakForBlindUsers(`Question: ${questionText.textContent}`, true);
        }
        break;
        
      case 'repeat-options':
        // Read just the options
        let optionsText = "Options: ";
        optionButtons.forEach((button, index) => {
          const letter = button.querySelector('.quizOptionLetter')?.textContent;
          const text = button.querySelector('.quizOptionText')?.textContent;
          optionsText += `${letter} ${text}. `;
        });
        speakForBlindUsers(optionsText, true);
        break;
        
      case 'repeat-all':
        // Read the full question and options
        readFullQuestion();
        break;
        
      case 'select-a':
        // Select option A
        const optionA = document.querySelector('.quizOptionButton:nth-child(1)') as HTMLButtonElement;
        if (optionA && !optionA.disabled) {
          optionA.click();
          
          // Read explanation after a delay
          setTimeout(() => {
            const explanation = document.querySelector('.quizExplanationContent p')?.textContent;
            if (explanation) {
              speakForBlindUsers(`Explanation: ${explanation}`, true);
            }
          }, 1000);
        } else {
          speakForBlindUsers("Option A is not available or already selected.", true);
        }
        break;
        
      case 'select-b':
        // Select option B
        const optionB = document.querySelector('.quizOptionButton:nth-child(2)') as HTMLButtonElement;
        if (optionB && !optionB.disabled) {
          optionB.click();
          
          // Read explanation after a delay
          setTimeout(() => {
            const explanation = document.querySelector('.quizExplanationContent p')?.textContent;
            if (explanation) {
              speakForBlindUsers(`Explanation: ${explanation}`, true);
            }
          }, 1000);
        } else {
          speakForBlindUsers("Option B is not available or already selected.", true);
        }
        break;
        
      case 'select-c':
        // Select option C
        const optionC = document.querySelector('.quizOptionButton:nth-child(3)') as HTMLButtonElement;
        if (optionC && !optionC.disabled) {
          optionC.click();
          
          // Read explanation after a delay
          setTimeout(() => {
            const explanation = document.querySelector('.quizExplanationContent p')?.textContent;
            if (explanation) {
              speakForBlindUsers(`Explanation: ${explanation}`, true);
            }
          }, 1000);
        } else {
          speakForBlindUsers("Option C is not available or already selected.", true);
        }
        break;
        
      case 'select-d':
        // Select option D
        const optionD = document.querySelector('.quizOptionButton:nth-child(4)') as HTMLButtonElement;
        if (optionD && !optionD.disabled) {
          optionD.click();
          
          // Read explanation after a delay
          setTimeout(() => {
            const explanation = document.querySelector('.quizExplanationContent p')?.textContent;
            if (explanation) {
              speakForBlindUsers(`Explanation: ${explanation}`, true);
            }
          }, 1000);
        } else {
          speakForBlindUsers("Option D is not available or already selected.", true);
        }
        break;
        
      case 'next':
        // Move to next question
        if (nextButton && !nextButton.disabled) {
          nextButton.click();
          
          // Read the next question and options after a delay
          setTimeout(() => {
            readFullQuestion();
          }, 1000);
        } else {
          speakForBlindUsers("There is no next question available.", true);
        }
        break;
        
      case 'previous':
        // Move to previous question
        if (prevButton && !prevButton.disabled) {
          prevButton.click();
          
          // Read the previous question and options after a delay
          setTimeout(() => {
            readFullQuestion();
          }, 1000);
        } else {
          speakForBlindUsers("This is the first question. You cannot go back further.", true);
        }
        break;
        
      case 'timer':
        // Announce time remaining
        const timerText = document.querySelector('.quizTimerCircle text')?.textContent;
        if (timerText) {
          speakForBlindUsers(`${timerText} seconds remaining`, true);
        } else {
          speakForBlindUsers("Timer information is not available.", true);
        }
        break;
        
      default:
        // Check for help command or unknown command
        if (command.toLowerCase().includes('help')) {
          speakForBlindUsers(
            "Quiz commands: Say 'repeat question' to hear the question again, 'repeat options' to hear the options, " +
            "'select A' through 'select D' to choose an option, 'next' or 'previous' to navigate questions, " +
            "'timer' to check time remaining.",
            true
          );
        } else {
          speakForBlindUsers("I didn't recognize that quiz command. Try saying 'repeat question', 'repeat options', " + 
            "'select' followed by A through D, 'next', 'previous', or 'timer'.", true);
        }
        break;
    }
  };
  
  // Add keyboard shortcuts for accessibility, especially when in a meeting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only activate these shortcuts if Alt key is pressed (to avoid interfering with typing)
      // OR if Control+Shift is pressed as an alternative shortcut combination
      if (e.altKey || (e.ctrlKey && e.shiftKey)) {
        const currentPath = router.pathname;
        let navigateAction = null;
        let destinationName = "";
        let useFile = false;
        
        // Get the key pressed (regardless of case)
        const keyPressed = e.key.toLowerCase();
        
        switch (keyPressed) {
          case 'f': // Alt+F or Ctrl+Shift+F for Flashcards
            destinationName = "Flashcard Generator";
            navigateAction = () => router.push('/flash');
            useFile = true;
            break;
          
          case 'q': // Alt+Q or Ctrl+Shift+Q for Quiz
            destinationName = "Quiz Generator";
            navigateAction = () => router.push('/quizz');
            useFile = true;
            break;
          
          case 'd': // Alt+D for Deaf Assistance
            destinationName = "Deaf Assistance";
            navigateAction = () => router.push('/deaf');
            break;
            
          case 's': // Alt+S for Summary
            destinationName = "Summary Generator";
            navigateAction = () => router.push('/summary');
            useFile = true;
            break;
            
          case 'h': // Alt+H for Home
            destinationName = "Home Page";
            navigateAction = () => router.push('/');
            break;
            
          case 'u': // Alt+U for Upload Document
            if (currentPath === '/deaf') {
              // Simulate a click on the file upload input
              const fileInput = document.getElementById('file-upload') as HTMLInputElement;
              if (fileInput) {
                fileInput.click();
                speakForBlindUsers("File selection dialog opened", true);
              }
              destinationName = "File Upload";
            } else {
              destinationName = "Document Portal";
              navigateAction = () => router.push('/deaf');
            }
            break;
            
          case 'j': // Alt+J for Help with voice commands
            speakForBlindUsers(
              "Voice commands: Say 'flip' to reveal answer, 'next' or 'previous' to navigate, " +
              "'read' to hear content, 'repeat question' or 'repeat options' in quizzes, " +
              "'select A' through 'select D' to choose quiz options.",
              true
            );
            return; // Don't navigate
        }
        
        if (navigateAction) {
          e.preventDefault(); // Prevent default browser behavior
          
          // Check if we need a file for this destination
          if (useFile && !hasAccessibleDocument()) {
            // Announce file requirement
            speakForBlindUsers(
              `You need to upload a document first before accessing ${destinationName}. Navigating to document portal.`,
              true
            );
            
            // Redirect to document upload page instead
            setTimeout(() => {
              router.push('/deaf');
              setLastNavigatedTo('Deaf Assistance');
              
              // After navigation, focus on file upload button for blind users
              setTimeout(() => {
                const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                if (fileInput) {
                  fileInput.focus();
                  speakForBlindUsers("Please upload a document. Press Alt+U to open file selection dialog.", false);
                }
              }, 1200);
            }, 500);
            
            setUsedKeyboardNavigation(true);
            return;
          }
          
          // Announce navigation
          speakForBlindUsers(`Navigating to ${destinationName}`, true);
          
          // Execute the navigation after a short delay
          setTimeout(navigateAction, 500); // Faster navigation
          setLastNavigatedTo(destinationName);
          
          // Track that we used keyboard navigation
          setUsedKeyboardNavigation(true);
        }
      }
    };
    
    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Announce keyboard shortcuts on component mount if in meeting mode
    if (isInMeeting) {
      setTimeout(() => {
        speakForBlindUsers("Keyboard navigation mode active. Press Alt+J for help with shortcuts.", false);
      }, 2000);
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [router, uploadedFile, isInMeeting]);
  
  // Helper function to setup recognition handlers
  const setupRecognitionHandlers = () => {
    if (!recognitionRef.current) return;
    
    recognitionRef.current.onresult = (event: any) => {
      if (isReady) {
        try {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');
          
          setBrowserTranscript(transcript);
          
          // Check for wake word
          if (transcript.toLowerCase().includes('jarvis')) {
            console.log("✓ WAKE WORD DETECTED on page:", router.pathname);
            // Trigger the assistant mode
            setTriggered(true);
            setBrowserTranscript('');
            
            // Stop the recognition first
            try {
              recognitionRef.current.stop();
              setIsRecognitionActive(false);
            } catch (err) {
              console.error("Error stopping recognition after wake word:", err);
            }
            
            // Start recording
            startRecording();
          }
        } catch (err) {
          console.error("Error processing speech recognition results:", err);
        }
      }
    };
    
    recognitionRef.current.onerror = (event: any) => {
      console.log("Speech recognition error:", event.error);
      setIsRecognitionActive(false);
    };
    
    recognitionRef.current.onend = () => {
      console.log("Recognition ended");
      setIsRecognitionActive(false);
      
      // Restart if needed
      if (isReady && !triggered) {
        setTimeout(() => {
          if (recognitionRef.current && !isRecognitionActive && isReady && !triggered) {
            safelyStartRecognition("after recognition ended");
          }
        }, 1000);
      }
    };
  };
  
  // Helper function for safely starting speech recognition with error handling
  const safelyStartRecognition = (context: string) => {
    if (!recognitionRef.current || !recognitionInitialized) {
      console.log(`Cannot start recognition in ${context}: recognition not initialized`);
      return false;
    }
    
    // Don't try to start if we already know it's active
    if (isRecognitionActive) {
      console.log(`Recognition already active in ${context} based on component state, skipping start`);
      return true;
    }
    
    // Check if recognition might actually be running already
    let isActuallyRunning = false;
    try {
      // @ts-ignore - Some browsers implement this non-standard property
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
        
        // Create a new instance if we have persistent InvalidStateError issues
        if (recognitionRef.current._hasInvalidStateError) {
          console.log(`Recreating recognition instance due to previous InvalidStateError`);
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = 'en-US';
          
          // Re-attach event handlers
          setupRecognitionHandlers();
          recognitionRef.current._hasInvalidStateError = false;
        }
        
        // Try to start with specific error handling
        try {
          setIsRecognitionActive(true);
          recognitionRef.current.start();
          return true;
        } catch (startErr: any) {
          if (startErr.name === 'InvalidStateError') {
            console.log(`Recognition already started in ${context} (caught via InvalidStateError)`);
            recognitionRef.current._hasInvalidStateError = true; // Mark for recreation next time
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
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

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
  
  // Track page navigation changes
  useEffect(() => {
    // Function to handle route change complete
    const handleRouteChangeComplete = (url: string) => {
      // Convert URL path to page name (e.g., /features -> features)
      const pageName = url.split('/').pop() || 'home';
      const formattedPageName = pageName === '' ? 'home' : pageName;
      console.log(`Navigation complete to: ${formattedPageName}`);
      setLastNavigatedTo(formattedPageName);
    };

    // Subscribe to router events
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    
    // Cleanup
    return () => {
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [router]);
  
  // Add watchdog timer to monitor and restart speech recognition if it stops unexpectedly
  useEffect(() => {
    // Only run the watchdog timer if recognition should be active
    if (!triggered && !processingChunks && recognitionInitialized) {
      const watchdogInterval = setInterval(() => {
        // Check if recognition should be running but isn't
        if (!isRecognitionActive) {
          console.log("🔄 Watchdog: Speech recognition appears to be inactive, attempting to restart");
          safelyStartRecognition("watchdog timer");
        }
      }, 10000); // Check every 10 seconds
      
      return () => clearInterval(watchdogInterval);
    }
  }, [isRecognitionActive, recognitionInitialized, triggered, processingChunks]);

  // Add watchdog timer to monitor and restart speech recognition if it stops unexpectedly
  useEffect(() => {
    let watchdogTimer: NodeJS.Timeout;
    
    if (recognitionInitialized) {
      console.log("Setting up watchdog timer for speech recognition");
      
      const checkRecognition = () => {
        console.log("Watchdog checking recognition status...");
        if (!isRecognitionActive && recognitionInitialized && !triggered && !processingChunks) {
          console.log("⚠️ Watchdog detected inactive recognition, restarting...");
          safelyStartRecognition("watchdog timer");
        }
      };
      
      // Start the watchdog timer - check every 10 seconds
      watchdogTimer = setInterval(checkRecognition, 10000);
    }
    
    return () => {
      if (watchdogTimer) {
        console.log("Cleaning up watchdog timer");
        clearInterval(watchdogTimer);
      }
    };
  }, [isRecognitionActive, recognitionInitialized, triggered, processingChunks]);

  useEffect(() => {
    // Check if speech recognition is supported
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    // Initialize speech recognition on component mount
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    // Create a new instance only if needed
    try {
      // First make sure any existing instance is properly stopped
      if (recognitionRef.current) {
        console.log("Cleaning up existing recognition instance");
        try {
          // Try to stop - this will error if already stopped
          recognitionRef.current.stop();
        } catch (stopErr) {
          console.log("Recognition was already stopped:", stopErr);
        }
      }
      
      // Create new recognition instance
      console.log("Creating new recognition instance on page:", router.pathname);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US'; // Set language explicitly
      console.log("Recognition initialized on page:", router.pathname);
      setRecognitionInitialized(true); // Mark as initialized
    } catch (err) {
      console.error("Failed to initialize speech recognition:", err);
      setError(`Speech recognition initialization failed: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }

    recognitionRef.current.onresult = (event: any) => {
      // Only update transcript if we're ready for input
      if (isReady) {
        try {
          const transcript = Array.from(event.results)
            .map((result: any) => result[0])
            .map((result: any) => result.transcript)
            .join('');

          setBrowserTranscript(transcript);

          // Changed wake word from "hey jarvis" to just "jarvis"
          console.log("Transcript:", transcript);
          if (transcript.toLowerCase().includes('jarvis')) {
            console.log("Wake word detected on page:", router.pathname);
            
            // First stop recognition to avoid conflicts
            if (recognitionRef.current && isRecognitionActive) {
              try {
                recognitionRef.current.stop();
                setIsRecognitionActive(false);
              } catch (e) {
                console.error("Error stopping recognition after wake word:", e);
              }
            }
            
            // Show the assistant UI
            setShowAssistant(true);
            
            // Trigger recording with a slight delay
            setTimeout(() => {
              setTriggered(true);
              startRecording();
            }, 300);
          }
        } catch (err) {
          console.error("Error processing speech recognition results:", err);
        }
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.log("Speech recognition error:", event.error);
      setError(`Speech recognition error: ${event.error}`);
      setIsRecognitionActive(false);
      
      // If the error is "no-speech", restart recognition after a longer delay
      if (event.error === 'no-speech' && isReady) {
        setTimeout(() => {
          if (recognitionRef.current && !isRecognitionActive && isReady && recognitionInitialized) {
            try {
              console.log("Attempting to restart recognition after no-speech error");
              // First stop recognition to be sure it's properly terminated
              try {
                recognitionRef.current.stop();
              } catch (stopErr) {
                console.log("Error stopping recognition (expected):", stopErr);
              }
              
              // Then start after a short delay
              setTimeout(() => {
                if (recognitionRef.current && !isRecognitionActive && isReady && recognitionInitialized) {
                  setIsRecognitionActive(true);
                  recognitionRef.current.start();
                }
              }, 500);
            } catch (e) {
              console.error("Error restarting recognition:", e);
              setIsRecognitionActive(false);
            }
          }
        }, 2000);
      }
    };

    recognitionRef.current.onend = () => {
      console.log("Recognition ended");
      setIsRecognitionActive(false);
      
      // Restart recognition if it wasn't explicitly stopped and we're ready for input
      if (isReady && !triggered) {
        // Add a significant delay to ensure the previous instance is fully cleaned up
        setTimeout(() => {
          // Double check conditions before restarting
          if (recognitionRef.current && !isRecognitionActive && isReady && !triggered && recognitionInitialized) {
            try {
              console.log("Attempting to restart recognition after end event");
              
              // Try to start with error handling
              try {
                setIsRecognitionActive(true);
                recognitionRef.current.start();
              } catch (startErr: any) {
                if (startErr.name === 'InvalidStateError') {
                  console.log("Recognition already active in onend handler");
                  setIsRecognitionActive(true); // Update our state to match reality
                } else {
                  throw startErr; // Re-throw if it's a different error
                }
              }
            } catch (err) {
              console.error("Failed to restart recognition:", err);
              setIsRecognitionActive(false);
              // Don't try to restart again if it fails
            }
          }
        }, 1000); // Increased delay to prevent rapid restart attempts
      }
    };

    // Set up the handlers and start recognition right away
    if (recognitionRef.current) {
      // Set up event handlers first
      recognitionRef.current.onresult = (event: any) => {
        // Only update transcript if we're ready for input
        if (isReady) {
          try {
            // Get the most recent result
            const currentResults = event.results;
            const latestResultIndex = currentResults.length - 1;
            const latestTranscript = currentResults[latestResultIndex][0].transcript;
            
            // Build the full transcript
            const fullTranscript = Array.from(currentResults)
              .map((result: any) => result[0].transcript)
              .join(' ');
            
            // Update the displayed transcript
            setBrowserTranscript(fullTranscript);

            // Wake word detection - prioritize the latest result for faster response
            console.log("Latest transcript:", latestTranscript);
            console.log("Full transcript:", fullTranscript);
            
            // Check both the latest and the full transcript for the wake word
            const lowerLatest = latestTranscript.toLowerCase();
            const lowerFull = fullTranscript.toLowerCase();
            
            if (lowerLatest.includes('jarvis') || lowerFull.includes('jarvis')) {
              console.log("✓ WAKE WORD DETECTED on page:", router.pathname);
              
              // First stop recognition to avoid conflicts
              if (recognitionRef.current && isRecognitionActive) {
                try {
                  recognitionRef.current.stop();
                  setIsRecognitionActive(false);
                } catch (e) {
                  console.error("Error stopping recognition after wake word:", e);
                }
              }
              
              // Show the assistant UI
              setShowAssistant(true);
              
              // Trigger recording with a slight delay
              setTimeout(() => {
                setTriggered(true);
                startRecording();
              }, 300);
            }
          } catch (err) {
            console.error("Error processing speech recognition results:", err);
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.log("Speech recognition error:", event.error);
        setError(`Speech recognition error: ${event.error}`);
        setIsRecognitionActive(false);
        
        // If the error is "no-speech", restart recognition after a longer delay
        if (event.error === 'no-speech' && isReady) {
          setTimeout(() => {
            if (recognitionRef.current && !isRecognitionActive && isReady) {
              try {
                console.log("Attempting to restart recognition after no-speech error");
                // First stop recognition to be sure it's properly terminated
                try {
                  recognitionRef.current.stop();
                } catch (stopErr) {
                  console.log("Error stopping recognition (expected):", stopErr);
                }
                
                // Then start after a short delay
                setTimeout(() => {
                  if (recognitionRef.current && !isRecognitionActive && isReady) {
                    setIsRecognitionActive(true);
                    recognitionRef.current.start();
                  }
                }, 500);
              } catch (e) {
                console.error("Error restarting recognition:", e);
                setIsRecognitionActive(false);
              }
            }
          }, 2000);
        }
      };

      recognitionRef.current.onend = () => {
        console.log("Recognition ended");
        setIsRecognitionActive(false);
        
        // Restart recognition if it wasn't explicitly stopped and we're ready for input
        if (isReady && !triggered) {
          // Add a significant delay to ensure the previous instance is fully cleaned up
          setTimeout(() => {
            // Double check conditions before restarting
            if (recognitionRef.current && !isRecognitionActive && isReady && !triggered) {
              try {
                console.log("Attempting to restart recognition after end event");
                
                // Before trying to start, check if recognition is actually running
                let isActuallyRunning = false;
                
                // Check state directly if possible using non-standard but available property in some browsers
                try {
                  // @ts-ignore - Some browsers implement this non-standard property
                  if (recognitionRef.current && recognitionRef.current.state === 'running') {
                    isActuallyRunning = true;
                  }
                } catch (stateErr) {
                  console.log("Browser doesn't support checking recognition state directly");
                }
                
                if (!isActuallyRunning) {
                  try {
                    setIsRecognitionActive(true);
                    recognitionRef.current.start();
                  } catch (startErr: any) {
                    if (startErr.name === 'InvalidStateError') {
                      console.log("Recognition already active in onend handler");
                      setIsRecognitionActive(true); // Update our state to match reality
                    } else {
                      throw startErr; // Re-throw if it's a different error
                    }
                  }
                } else {
                  console.log("Recognition already running in onend handler");
                  setIsRecognitionActive(true);
                }
              } catch (err) {
                console.error("Failed to restart recognition:", err);
                setIsRecognitionActive(false);
                // Don't try to restart again if it fails
              }
            }
          }, 1000); // Increased delay to prevent rapid restart attempts
        }
      };
      
      // Start recognition immediately with safer error handling
      try {
        // Before trying to start, check if recognition is actually running
        let isActuallyRunning = false;
        
        // Check state directly if possible using non-standard but available property in some browsers
        try {
          // @ts-ignore - Some browsers implement this non-standard property
          if (recognitionRef.current && recognitionRef.current.state === 'running') {
            isActuallyRunning = true;
          }
        } catch (err) {
          console.log("Browser doesn't support checking recognition state directly");
        }
        
        if (!isActuallyRunning) {
          try {
            console.log("Starting speech recognition on page:", router.pathname);
            setIsRecognitionActive(true);
            recognitionRef.current.start();
          } catch (startErr: any) {
            if (startErr.name === 'InvalidStateError') {
              console.log("Recognition already active (caught error), updating state");
              setIsRecognitionActive(true); // Update our state to match reality
            } else {
              throw startErr; // Re-throw if it's a different error
            }
          }
        } else {
          console.log("Recognition already running, updating state to match");
          setIsRecognitionActive(true);
        }
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
        setIsRecognitionActive(false);
      }
    }

    return () => {
      if (recognitionRef.current) {
        console.log("Cleaning up recognition on page change");
        try {
          recognitionRef.current.onend = null; // Remove event handlers first
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          
          if (isRecognitionActive) {
            recognitionRef.current.stop();
          }
        } catch (err) {
          console.log("Error stopping recognition on cleanup:", err);
        }
        setIsRecognitionActive(false);
        setRecognitionInitialized(false); // Reset initialization flag
      }
    };
  // Only run this effect once when the component mounts
  }, [router.pathname]);
  
  // Watchdog timer to ensure speech recognition stays active
  useEffect(() => {
    // Create a watchdog timer that checks if recognition is active every 5 seconds
    const watchdogInterval = setInterval(() => {
      // Only restart if we're not currently in the middle of handling a command
      if (!isListening && !triggered && isReady && !processingChunks) {
        console.log("Watchdog check: Recognition active?", isRecognitionActive);
        
        if (!isRecognitionActive && recognitionInitialized && recognitionRef.current) {
          console.log("Watchdog detected inactive recognition - restarting");
          safelyStartRecognition("watchdog timer");
        }
      }
    }, 5000);
    
    return () => clearInterval(watchdogInterval);
  }, [isRecognitionActive, isListening, triggered, isReady, processingChunks, recognitionInitialized]);

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
        setTimeout(() => {
          if (recognitionRef.current && !isRecognitionActive && isReady && recognitionInitialized) {
            safelyStartRecognition("after audio chunks");
          }
        }, 1000);
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
      return;
    }

    const currentChunk = remainingChunks[0];
    const newRemainingChunks = remainingChunks.slice(1);
    setRemainingChunks(newRemainingChunks);

    if (audioRef.current) {
      audioRef.current.src = currentChunk;
      audioRef.current.play().catch(e => {
        console.error("Error playing audio chunk:", e);
        // Skip to next chunk if there's an error
        setRemainingChunks(newRemainingChunks);
      });
    }
  };

  // Audio onEnded event handler
  const handleAudioEnded = () => {
    // Process next chunk if there are any remaining
    if (remainingChunks.length > 0) {
      playNextChunk();
    } else {
      setProcessingChunks(false);
      setIsReady(true);
    }
  };

  const startRecording = async () => {
    try {
      // Stop any ongoing speech recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsRecognitionActive(false);
      }

      setIsListening(true);
      setIsReady(false); // Prevent new inputs while recording
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
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm' // Explicitly set to webm as expected by backend
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        setTriggered(false);

        if (audioChunksRef.current.length === 0) {
          setError('No speech detected.');
          setIsReady(true);  // Ready for new commands
          
          // Restart background recognition
          setTimeout(() => {
            if (recognitionRef.current && !isRecognitionActive && isReady && recognitionInitialized) {
              safelyStartRecognition("after empty recording");
            }
          }, 1000);
          return;
        }

        // Create audio blob with webm type to match backend expectation
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);

        // Stop all tracks to release the microphone
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      
      // Record for 7 seconds (matching main VoiceAssistant)
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 7000);
      
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(`Failed to start recording: ${err instanceof Error ? err.message : String(err)}`);
      setIsListening(false);
      setIsReady(true);
      setTriggered(false);
      
      // Try to restart recognition
      setTimeout(() => {
        if (recognitionRef.current && !isRecognitionActive && isReady && recognitionInitialized) {
          safelyStartRecognition("after recording failure");
        }
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      setIsListening(false);
      setTriggered(false);

      if (audioBlob.size < 1000) {
        setError('No valid speech detected in recording.');
        setIsReady(true);  // Ready for new commands
        
        // Restart background recognition
        setTimeout(() => {
          if (recognitionRef.current && !isRecognitionActive && isReady && recognitionInitialized) {
            safelyStartRecognition("after invalid recording");
          }
        }, 1000);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

        try {
          // Create a context object to send with the request
          // This includes conversation history (up to last 20 exchanges for context)
          const conversationContext = conversation.slice(-20); 
          
          const response = await fetch('https://edugram-574544346633.asia-south1.run.app/api/process_audio/', {
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

            // Add to conversation history (matching VoiceAssistant.js format)
            const newMessage: ConversationMessage = { role: 'user', content: data.text };
            const newResponse: ConversationMessage = { role: 'jarvis', content: data.response };
            const updatedConversation = [...conversation, newMessage, newResponse];
            setConversation(updatedConversation);
            
            // Check for navigation commands and special page controls
  // Implement voice command processing for navigation
  const checkForNavigation = (transcript: string) => {
    const lowerText = transcript.toLowerCase().trim();
    
    // Handle MCQ/quiz generation through proper quiz feature
    if (lowerText.includes('generate mcq') || 
        lowerText.includes('generate quiz') || 
        lowerText.includes('create quiz') || 
        lowerText.includes('multiple choice question')) {
      
      // Check if document is uploaded
      if (uploadedFile) {
        // Add to conversation that we're generating a quiz
        const quizMessage: ConversationMessage = { 
          role: 'jarvis', 
          content: `Generating an interactive quiz from ${uploadedFile.name}. Please wait a moment...`
        };
        setConversation(prev => [...prev, quizMessage]);
        
        // Navigate to the quiz page
        setTimeout(() => {
          router.push('/quizz');
        }, 1000);
        
        return true;
      } else {
        // Add message that we need a file first
        const noFileMessage: ConversationMessage = { 
          role: 'jarvis', 
          content: "You need to upload a document first to generate a quiz. Let me help you navigate to the document upload page."
        };
        setConversation(prev => [...prev, noFileMessage]);
        
        // Navigate to document upload
        setTimeout(() => {
          router.push('/deaf');
        }, 1000);
        
        return true;
      }
    }
    
    // Check if user wants to navigate to specific pages
    if (lowerText.includes('go to flashcards') || lowerText.includes('open flashcards')) {
      speakForBlindUsers("Navigating to flashcards", true);
      router.push('/flash');
      return true;
    } 
    else if (lowerText.includes('go to quiz') || lowerText.includes('open quiz')) {
      speakForBlindUsers("Navigating to quiz", true);
      router.push('/quizz');
      return true;
    }
    else if (lowerText.includes('go to deaf') || lowerText.includes('deaf assistance')) {
      speakForBlindUsers("Navigating to deaf assistance", true);
      router.push('/deaf');
      return true;
    }
    else if (lowerText.includes('go to home') || lowerText.includes('home page')) {
      speakForBlindUsers("Navigating to home page", true);
      router.push('/');
      return true;
    }
    else if (lowerText.includes('upload document') || lowerText.includes('go to upload')) {
      speakForBlindUsers("Navigating to document upload", true);
      router.push('/paper');
      return true;
    }
    else if (lowerText.includes('go to summary') || lowerText.includes('summarize')) {
      speakForBlindUsers("Navigating to summary", true);
      router.push('/summary');
      return true;
    }
    else if (lowerText.includes('help') || lowerText.includes('commands') || lowerText.includes('what can i say')) {
      // Get the current page from the router to provide context-aware help
      const currentPage = router.pathname;
      
      if (currentPage === '/flash') {
        speakForBlindUsers("Flashcard voice commands: Say 'flip' to reveal answer, 'next' or 'previous' to navigate, 'read' to hear content, 'progress' for your position in the deck.", true);
      } 
      else if (currentPage === '/quizz') {
        speakForBlindUsers("Quiz voice commands: Say 'repeat question', 'repeat options', 'select' followed by A, B, C, or D to choose an answer, 'next' or 'previous' to navigate questions, 'timer' to hear remaining time.", true);
      }
      else {
        speakForBlindUsers("Voice commands: Say 'go to' followed by flashcards, quiz, deaf assistance, home page, upload document, or summary to navigate. Say 'help' on any page to hear available commands.", true);
      }
      return true;
    }
    
    // Get the current page from the router
    const currentPage = router.pathname;
    
    // Flashcard-specific commands
    if (currentPage === '/flash') {
      // Specific commands for flashcard page
      if (lowerText.includes('flip') || 
          lowerText.includes('reveal') || 
          lowerText.includes('show answer') ||
          lowerText.includes('turn over')) {
        handleFlashcardControls('flip');
        return true;
      }
      else if (lowerText.includes('next') || 
               lowerText.includes('forward') || 
               lowerText.includes('go ahead')) {
        handleFlashcardControls('next');
        return true;
      }
      else if (lowerText.includes('previous') || 
               lowerText.includes('back') || 
               lowerText.includes('go back')) {
        handleFlashcardControls('previous');
        return true;
      }
      else if (lowerText.includes('read') || 
               lowerText.includes('what does it say')) {
        handleFlashcardControls('read');
        return true;
      }
      else if (lowerText.includes('progress') || 
               lowerText.includes('where am i') || 
               lowerText.includes('how many')) {
        handleFlashcardControls('progress');
        return true;
      }
      else {
        // Handle any other flashcard-related commands
        handleFlashcardControls(lowerText);
        return true;
      }
    }
    
    // Quiz-specific commands
    if (currentPage === '/quizz') {
      // Specific commands for quiz page
      if (lowerText.includes('repeat question') || lowerText.includes('read question')) {
        handleQuizControls('repeat-question');
        return true;
      }
      else if (lowerText.includes('repeat options') || lowerText.includes('read options')) {
        handleQuizControls('repeat-options');
        return true;
      }
      else if (lowerText === 'repeat' || lowerText.includes('repeat all') || lowerText.includes('read all')) {
        handleQuizControls('repeat-all');
        return true;
      }
      else if (lowerText.includes('select a') || lowerText.includes('choose a') || lowerText.includes('option a')) {
        handleQuizControls('select-a');
        return true;
      }
      else if (lowerText.includes('select b') || lowerText.includes('choose b') || lowerText.includes('option b')) {
        handleQuizControls('select-b');
        return true;
      }
      else if (lowerText.includes('select c') || lowerText.includes('choose c') || lowerText.includes('option c')) {
        handleQuizControls('select-c');
        return true;
      }
      else if (lowerText.includes('select d') || lowerText.includes('choose d') || lowerText.includes('option d')) {
        handleQuizControls('select-d');
        return true;
      }
      else if (lowerText.includes('next') || lowerText.includes('next question')) {
        handleQuizControls('next');
        return true;
      }
      else if (lowerText.includes('previous') || lowerText.includes('previous question')) {
        handleQuizControls('previous');
        return true;
      }
      else if (lowerText.includes('timer') || lowerText.includes('time left') || lowerText.includes('how much time')) {
        handleQuizControls('timer');
        return true;
      }
      else {
        // Handle any other quiz-related commands
        handleQuizControls(lowerText);
        return true;
      }
    }
    
    return false;
  };
            
            // Check both the user input and response for navigation commands
            checkForNavigation(data.text) || checkForNavigation(data.response);

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
                    setTimeout(() => {
                      if (recognitionRef.current && !isRecognitionActive && isReady && recognitionInitialized) {
                        try {
                          setIsRecognitionActive(true);
                          recognitionRef.current.start();
                        } catch (e) {
                          console.error("Failed to restart recognition after audio error:", e);
                          setIsRecognitionActive(false);
                        }
                      }
                    }, 1000);
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
                    setTimeout(() => {
                      if (recognitionRef.current && !isRecognitionActive && isReady && recognitionInitialized) {
                        try {
                          console.log("Restarting recognition after audio playback");
                          setIsRecognitionActive(true);
                          recognitionRef.current.start();
                        } catch (e) {
                          console.error("Failed to restart recognition after audio playback:", e);
                          setIsRecognitionActive(false);
                        }
                      }
                    }, 1000);
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
                    setTimeout(() => {
                      if (recognitionRef.current && !isRecognitionActive && isReady && recognitionInitialized) {
                        try {
                          setIsRecognitionActive(true);
                          recognitionRef.current.start();
                        } catch (e) {
                          console.error("Failed to restart recognition after audio error:", e);
                          setIsRecognitionActive(false);
                        }
                      }
                    }, 1000);
                  });
                
                // Set up event listener for when audio playback ends
                audioRef.current.onended = () => {
                  URL.revokeObjectURL(audioUrl); // Clean up the URL
                  // Ready for next interaction after audio finishes
                  setProcessingChunks(false); // Ensure this is set to false
                  setIsReady(true);
                  
                  // Restart background recognition
                  setTimeout(() => {
                    if (recognitionRef.current && !isRecognitionActive && isReady && recognitionInitialized) {
                      try {
                        console.log("Restarting recognition after audio playback");
                        setIsRecognitionActive(true);
                        recognitionRef.current.start();
                      } catch (e) {
                        console.error("Failed to restart recognition after audio playback:", e);
                        setIsRecognitionActive(false);
                      }
                    }
                  }, 1000);
                };
              }
            } else {
              // If no audio response, set ready immediately and try client-side response generation
              setProcessingChunks(false);
              setIsReady(true);
              
              // Restart background recognition
              setTimeout(() => {
                if (recognitionRef.current && !isRecognitionActive && isReady && recognitionInitialized) {
                  safelyStartRecognition("without audio");
                }
              }, 1000);
            }
          } else {
            // Use client-side fallback generation when backend fails
            setError(data.message || 'Could not connect to assistant. Using offline mode.');
            await getAssistantResponse(browserTranscript, conversation);
            
            setProcessingChunks(false);
            setIsReady(true);  // Ready for new commands
            
            // Restart background recognition
            setTimeout(() => {
              if (recognitionRef.current && !isRecognitionActive && isReady && recognitionInitialized) {
                try {
                  console.log("Restarting recognition after error response");
                  // Use safer start with error handling
                  try {
                    setIsRecognitionActive(true);
                    recognitionRef.current.start();
                  } catch (startErr: any) {
                    if (startErr.name === 'InvalidStateError') {
                      console.log("Recognition already active after error response");
                      setIsRecognitionActive(true);
                    } else {
                      throw startErr;
                    }
                  }
                } catch (e) {
                  console.error("Failed to restart recognition after error response:", e);
                  setIsRecognitionActive(false);
                }
              }
            }, 1000);
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') {
            setError('Jarvis took too long to respond. Using offline mode.');
          } else {
            setError(`Error connecting to server: ${err instanceof Error ? err.message : String(err)}`);
          }
          
          // Use client-side fallback when API fails
          await getAssistantResponse(browserTranscript, conversation);
          
          setProcessingChunks(false);
          setIsReady(true);  // Ready for new commands
          
          // Restart background recognition
          setTimeout(() => {
            if (recognitionRef.current && !isRecognitionActive && isReady && recognitionInitialized) {
              safelyStartRecognition("after request error");
            }
          }, 1000);
        }
      };

      reader.readAsDataURL(audioBlob);
      
    } catch (err) {
      console.error('Error processing audio:', err);
      setError(`Error processing audio: ${err instanceof Error ? err.message : String(err)}`);
      
      // Reset state to allow new interactions
      setTriggered(false);
      setIsReady(true);
      
      // Try to restart recognition
      setTimeout(() => {
        if (recognitionRef.current && !isRecognitionActive && isReady && recognitionInitialized) {
          safelyStartRecognition("after processing failure");
        }
      }, 1000);
    }
  };

  // Client-side fallback when the API isn't available
  const getAssistantResponse = async (text: string, currentConversation: ConversationMessage[]): Promise<void> => {
    try {
      // Extract text after "jarvis" if it exists
      let inputText = text.trim();
      if (inputText.toLowerCase().includes('jarvis')) {
        const jarvisIndex = inputText.toLowerCase().indexOf('jarvis');
        inputText = inputText.substring(jarvisIndex + 6).trim();
      }
      
      // If no text after processing, use a default greeting
      if (!inputText) {
        inputText = "hello";
      }
      
      // Navigation helper function - optimized for speed and accessibility
      const navigateTo = (path: string, pageName: string): string => {
        // Store the page we're navigating to so we can announce it later
        setLastNavigatedTo(pageName);
        
        // Provide specific instructions for blind users based on destination
        if (path === '/flash' || path === '/quizz') {
          // For pages that require keyboard navigation for accessibility
          const isFlashcards = path === '/flash';
          const pageType = isFlashcards ? 'flashcards' : 'quiz';
          
          // Announce navigation with instructions for keyboard navigation
          speakForBlindUsers(`Navigating to ${pageName}. Keyboard controls will be announced when loaded.`, true);
          
          // If in meeting mode, give more detailed instructions
          if (isInMeeting) {
            setTimeout(() => {
              const instructions = isFlashcards 
                ? "When flashcards load, use Space to flip cards, Arrow keys to navigate between cards, and R key to have content read aloud."
                : "When quiz loads, use Q to hear the question, Arrow keys to navigate options, and Enter to select an answer.";
                
              speakForBlindUsers(instructions, false);
            }, 1200);
          }
          
          // Set flag to indicate keyboard navigation has been used
          setUsedKeyboardNavigation(true);
        }
        
        // SPEED OPTIMIZATION: Reduced timeout for faster navigation response
        setTimeout(() => {
          router.push(path);
        }, 600); // Reduced from 800ms to 600ms for even faster navigation
        
        return `Navigating to ${pageName}...`;
      };
      
      // Helper function to check if a document is available for processing
      // Returns a tuple of [boolean, string] where the boolean indicates if access is available
      // and the string provides a message explaining the result
      const checkForDocumentAccess = (): [boolean, string] => {
        // Check if there's a document in context that can be used
        const hasAccess = uploadedFile !== null;
        
        if (hasAccess) {
          // Document is available
          const fileName = uploadedFile?.name || "document";
          return [true, `Using ${fileName} for processing`];
        } else {
          // No document available
          return [false, "You need to upload a document first. I'll help you navigate to the document upload page."];
        }
      };
      
      // Function to open IndexedDB for directory handles
      const openDirectoryHandlesDB = async (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open('JarvisDirectoryHandles', 1);
          
          request.onerror = (event) => {
            console.error("IndexedDB error:", event);
            reject("Couldn't open directory handles database");
          };
          
          request.onsuccess = (event) => {
            // @ts-ignore - event.target.result is the database
            resolve(event.target.result);
          };
          
          request.onupgradeneeded = (event) => {
            // @ts-ignore - event.target.result is the database
            const db = event.target.result;
            if (!db.objectStoreNames.contains('directoryHandles')) {
              db.createObjectStore('directoryHandles', { keyPath: 'locationKey' });
              console.log("Created directoryHandles object store");
            }
          };
        });
      };
      
      // Function to store a directory handle in IndexedDB
      const storeDirectoryHandle = async (locationKey: string, handle: any) => {
        try {
          const db = await openDirectoryHandlesDB();
          const transaction = db.transaction('directoryHandles', 'readwrite');
          const store = transaction.objectStore('directoryHandles');
          
          // Serialize the handle
          // @ts-ignore - toJSON() not in TypeScript yet
          const serializedHandle = await handle.toJSON();
          
          store.put({
            locationKey,
            serializedHandle,
            timestamp: Date.now()
          });
          
          return new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => {
              console.log(`Directory handle stored for ${locationKey}`);
              resolve();
            };
            transaction.onerror = () => {
              console.error(`Failed to store directory handle for ${locationKey}`);
              reject();
            };
          });
        } catch (err) {
          console.error('Error storing directory handle:', err);
          throw err;
        }
      };
      
      // Function to get a stored directory handle from IndexedDB
      const getStoredDirectoryHandle = async (locationKey: string): Promise<any> => {
        try {
          const db = await openDirectoryHandlesDB();
          const transaction = db.transaction('directoryHandles', 'readonly');
          const store = transaction.objectStore('directoryHandles');
          const request = store.get(locationKey);
          
          return new Promise((resolve, reject) => {
            request.onsuccess = async () => {
              if (request.result) {
                try {
                  // @ts-ignore - fromJSON() not in TypeScript yet
                  const handle = await FileSystemHandle.fromJSON(request.result.serializedHandle);
                  resolve(handle);
                } catch (err) {
                  console.error(`Error deserializing handle for ${locationKey}:`, err);
                  resolve(null);
                }
              } else {
                console.log(`No stored handle found for ${locationKey}`);
                resolve(null);
              }
            };
            request.onerror = () => {
              console.error(`Error retrieving handle for ${locationKey}`);
              reject(request.error);
            };
          });
        } catch (err) {
          console.error('Error getting stored directory handle:', err);
          return null;
        }
      };

      // Helper function to handle file uploads
      const handleFileUpload = async (fileDescription: string, specificFile?: string, location?: string): Promise<string> => {
        try {
          // If a specific file was mentioned, try to access it directly
          if (specificFile && location) {
            try {
              console.log(`Attempting to find ${specificFile} in ${location}`);

              // Handle special locations like "downloads", "documents", "desktop", etc.
              let directoryHandle;
              const locationKey = location.toLowerCase();
              
              // Map common location phrases to storage keys and picker start points
              const locationMapping: {[key: string]: {storageKey: string, startIn: string}} = {
                'download': {storageKey: 'downloads', startIn: 'downloads'},
                'downloads': {storageKey: 'downloads', startIn: 'downloads'},
                'document': {storageKey: 'documents', startIn: 'documents'},
                'documents': {storageKey: 'documents', startIn: 'documents'},
                'desktop': {storageKey: 'desktop', startIn: 'desktop'},
                'picture': {storageKey: 'pictures', startIn: 'pictures'},
                'pictures': {storageKey: 'pictures', startIn: 'pictures'},
                'music': {storageKey: 'music', startIn: 'music'}
              };
              
              // Find the matching location key
              const matchedLocation = Object.keys(locationMapping).find(key => locationKey.includes(key));
              
              if (matchedLocation) {
                const { storageKey, startIn } = locationMapping[matchedLocation];
                try {
                  // Request access to directory if File System Access API is supported
                  if ('showDirectoryPicker' in window) {
                    // Log the file search attempt
                    console.log(`Attempting to access ${matchedLocation} folder to find: ${specificFile}`);
                    
                    // Try to get stored directory handle from IndexedDB
                    let storedHandle = null;
                    try {
                      storedHandle = await getStoredDirectoryHandle(storageKey);
                      
                      if (storedHandle) {
                        // Verify permission is still valid
                        // @ts-ignore - queryPermission() not in TypeScript yet
                        const permission = await storedHandle.queryPermission({ mode: 'read' });
                        
                        if (permission === 'granted') {
                          console.log(`Reusing stored ${matchedLocation} directory access permission`);
                          directoryHandle = storedHandle;
                        } else {
                          console.log('Stored permission expired, requesting again');
                          storedHandle = null;
                        }
                      }
                    } catch (err) {
                      console.error(`Error accessing stored ${matchedLocation} directory handle:`, err);
                      storedHandle = null;
                    }
                    
                    // If no stored handle or permission denied, request fresh access
                    if (!storedHandle) {
                      // Show a message to the user that we're requesting file access
                      const folderName = matchedLocation.charAt(0).toUpperCase() + matchedLocation.slice(1);
                      
                      // Only need to show this the first time
                      const confirmationMessage: ConversationMessage = { 
                        role: 'jarvis', 
                        content: `I'll need permission to access your ${folderName} folder. Please select it in the dialog that appears. This will be saved for future use.`
                      };
                      setConversation(prev => [...prev, confirmationMessage]);
                      
                      // Speak the message
                      const utterance = new SpeechSynthesisUtterance(`I'll need permission to access your ${folderName} folder. Please select it in the dialog that appears. This will be saved for future use.`);
                      utterance.rate = 1.0;
                      utterance.pitch = 1.0;
                      utterance.volume = 0.8;
                      window.speechSynthesis.speak(utterance);
                      
                      // @ts-ignore - TypeScript doesn't recognize showDirectoryPicker yet
                      directoryHandle = await window.showDirectoryPicker({
                        id: storageKey,
                        startIn: startIn
                      });
                      
                      // Request persistent access permission
                      try {
                        // @ts-ignore - requestPermission() not in TypeScript yet
                        const permission = await directoryHandle.requestPermission({ mode: 'read' });
                        
                        if (permission === 'granted') {
                          // Store the directory handle in IndexedDB for future use
                          try {
                            await storeDirectoryHandle(storageKey, directoryHandle);
                            console.log(`Directory handle for ${matchedLocation} saved for future use`);
                          } catch (serializeErr) {
                            console.error(`Failed to store ${matchedLocation} directory handle:`, serializeErr);
                          }
                        }
                      } catch (permissionErr) {
                        console.error('Failed to request persistent permission:', permissionErr);
                      }
                    }
                    
                    // Try to find the file in the directory
                    // Check if the filename has the extension, if not add it
                    const fileName = specificFile.toLowerCase().endsWith('.pdf') ? specificFile : 
                                    specificFile.toLowerCase().endsWith('.docx') ? specificFile : 
                                    specificFile.toLowerCase().endsWith('.txt') ? specificFile : 
                                    specificFile.toLowerCase().endsWith('.pptx') ? specificFile : 
                                    specificFile.toLowerCase().endsWith('.xlsx') ? specificFile :
                                    specificFile.toLowerCase().endsWith('.csv') ? specificFile :
                                    specificFile.toLowerCase().endsWith('.xls') ? specificFile :
                                    `${specificFile}.pdf`; // Default to PDF if no extension
                    
                    // Function to normalize accents in strings for better matching
                    const normalizeText = (text: string) => {
                      return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    };
                    
                    // Try different variations of the filename - expanded to handle accented characters
                    const possibleNames = [
                      fileName,
                      `${specificFile}.pdf`,
                      `${specificFile}.docx`, 
                      `${specificFile}.txt`,
                      `${specificFile}.xlsx`,
                      `${specificFile}.csv`,
                      `${specificFile}.xls`,
                      specificFile.toLowerCase(),
                      `${specificFile.toLowerCase()}.pdf`,
                      `${specificFile.toLowerCase()}.docx`,
                      `${specificFile.toLowerCase()}.txt`,
                      `${specificFile.toLowerCase()}.xlsx`,
                      `${specificFile.toLowerCase()}.csv`,
                      `${specificFile.toLowerCase()}.xls`,
                      // Add normalized versions without accents
                      normalizeText(specificFile),
                      `${normalizeText(specificFile)}.pdf`,
                      `${normalizeText(specificFile)}.docx`,
                      normalizeText(specificFile).toLowerCase(),
                      `${normalizeText(specificFile).toLowerCase()}.pdf`,
                      `${normalizeText(specificFile).toLowerCase()}.docx`
                    ];
                    
                    let fileFound = false;
                    let file;
                    
                    // Get all files in the directory first
                    console.log("Scanning directory for matching files...");
                    try {
                      // List all files in the directory
                      const allFiles = [];
                      for await (const entry of directoryHandle.values()) {
                        if (entry.kind === 'file') {
                          console.log(`Found file in directory: ${entry.name}`);
                          allFiles.push(entry);
                        }
                      }
                      
                      // Create a function to normalize text for better matching with accents
                      const normalizeForComparison = (text: string) => {
                        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                      };
                      
                      console.log(`Looking for file matching: ${specificFile} (normalized: ${normalizeForComparison(specificFile)})`);
                      console.log(`Files in directory: ${allFiles.map(f => f.name).join(', ')}`);
                      
                      // Look for exact matches first including accented characters
                      for (const name of possibleNames) {
                        const matchingEntry = allFiles.find(entry => {
                          // Try direct case-insensitive comparison
                          if (entry.name.toLowerCase() === name.toLowerCase()) {
                            return true;
                          }
                          // Try normalized comparison (remove accents)
                          if (normalizeForComparison(entry.name) === normalizeForComparison(name)) {
                            return true;
                          }
                          return false;
                        });
                        
                        if (matchingEntry) {
                          const fileHandle = await directoryHandle.getFileHandle(matchingEntry.name);
                          file = await fileHandle.getFile();
                          fileFound = true;
                          console.log(`Found exact match: ${matchingEntry.name}`);
                          break;
                        }
                      }
                      
                      // If no exact match, look for partial matches with special handling for accents
                      if (!fileFound) {
                        for (const entry of allFiles) {
                          // Check if the entry name includes the search term (with or without accents)
                          const normalizedEntryName = normalizeForComparison(entry.name);
                          const normalizedSearchTerm = normalizeForComparison(specificFile);
                          
                          if (normalizedEntryName.includes(normalizedSearchTerm)) {
                            const fileHandle = await directoryHandle.getFileHandle(entry.name);
                            file = await fileHandle.getFile();
                            fileFound = true;
                            console.log(`Found partial match: ${entry.name} using normalized comparison`);
                            break;
                          }
                        }
                      }
                      
                    } catch (dirErr) {
                      console.error("Error scanning directory:", dirErr);
                      console.log("Looking for file:", specificFile);
                      console.log("In location:", location);
                      
                      // Fall back to direct file access attempts
                      for (const name of possibleNames) {
                        try {
                          // Try to get the file directly
                          const fileHandle = await directoryHandle.getFileHandle(name);
                          file = await fileHandle.getFile();
                          fileFound = true;
                          console.log(`Found file via direct access: ${name}`);
                          break;
                        } catch (e) {
                          // File not found with this name, try next
                          console.log(`File not found: ${name}`);
                        }
                      }
                    }
                    
                    if (fileFound && file) {
                      // Store file in a local variable before navigation
                      const uploadedFileName = file.name;
                      const uploadedFileObj = file;
                      
                      // Add a confirmation message to the conversation first
                      const confirmationMessage: ConversationMessage = { 
                        role: 'jarvis', 
                        content: `I found "${file.name}" in your ${location} folder. Uploading it now...`
                      };
                      setConversation(prev => [...prev, confirmationMessage]);
                      
                      // Set the file in context before navigation to ensure it's available
                      setUploadedFile(uploadedFileObj);
                      console.log("📄 File set in context before navigation:", uploadedFileName);
                      
                      // Navigate to the deaf assistance page
                      router.push('/deaf').then(() => {
                        // Small delay to ensure page has loaded
                        setTimeout(() => {
                          // Create and trigger a custom event to notify the Deafassistance component
                          try {
                            const fileUploadEvent = new CustomEvent('jarvis-file-uploaded', { 
                              detail: { fileName: uploadedFileName } 
                            });
                            window.dispatchEvent(fileUploadEvent);
                            console.log("🔔 File upload event dispatched");
                          } catch (eventErr) {
                            console.error("Failed to dispatch file upload event:", eventErr);
                          }
                        }, 500);
                      });
                      
                      setLastNavigatedTo('Deaf Assistance');
                      
                      return `I've uploaded "${file.name}" from your ${location} folder and navigated to the document portal. You can now generate quizzes, summaries, or flashcards.`;
                    } else {
                      // Show detailed error with searched locations
                      console.log(`Failed to find file: ${specificFile} in ${location}. Searched for variations:`, possibleNames);
                      return `I couldn't find a file named "${specificFile}" in your ${location} folder. Please check if the file exists and try again, or upload it manually.`;
                    }
                  }
                } catch (err) {
                  console.error(`Error accessing ${matchedLocation} directory:`, err);
                  return `I couldn't access your ${location} folder. This might be due to security restrictions. Would you like to select the file manually instead?`;
                }
              } else {
                console.error(`Unrecognized location: ${location}`);
                return `I don't recognize "${location}" as a known folder location. I can access downloads, documents, desktop, pictures, or music folders. Would you like to select the file manually instead?`;
              }
            } catch (err) {
              console.error("Error accessing specific file:", err);
              return `I couldn't access "${specificFile}" from your ${location} folder. This might be due to security restrictions. Would you like to select the file manually instead?`;
            }
          }
          
          // Standard file picking flow (fallback or if no specific file was mentioned)
          // Create a file input element
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.accept = '.pdf,.docx,.txt,.pptx'; // Accept common document formats
          
          // Use the File System Access API if available (modern browsers)
          if ('showOpenFilePicker' in window) {
            try {
              const opts = {
                types: [
                  {
                    description: 'Documents',
                    accept: {
                      'application/pdf': ['.pdf'],
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                      'text/plain': ['.txt'],
                      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
                    }
                  }
                ]
              };
              
              // Show file picker and get file handles
              // @ts-ignore - TypeScript doesn't recognize showOpenFilePicker yet
              const [fileHandle] = await window.showOpenFilePicker(opts);
              const file = await fileHandle.getFile();
              
              // Set the file in the context
              setUploadedFile(file);
              
              // Create a function to handle file persistence across page navigation
              const navigateWithFile = async () => {
                try {
                  // Navigate to the deaf assistance page where document processing happens
                  await router.push('/deaf');
                  setLastNavigatedTo('Deaf Assistance');
                  
                  // After navigation completes, ensure the file is properly set in the UI
                  setTimeout(() => {
                    try {
                      // Find the file input on the deaf page
                      const deafPageFileInput = document.getElementById('file-upload') as HTMLInputElement;
                      if (deafPageFileInput) {
                        console.log("Found file input element on deaf page, setting file...");
                        
                        // Use DataTransfer to set the file on the input
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(file);
                        deafPageFileInput.files = dataTransfer.files;
                        
                        // Dispatch a change event to trigger the onChange handler
                        const event = new Event('change', { bubbles: true });
                        deafPageFileInput.dispatchEvent(event);
                        
                        console.log("Successfully set file on deaf page input");
                      } else {
                        console.error("Could not find file-upload input on deaf page");
                      }
                    } catch (err) {
                      console.error("Error setting file on deaf page:", err);
                    }
                  }, 800); // Give the page time to fully render
                } catch (navErr) {
                  console.error("Navigation error:", navErr);
                }
              };
              
              // Execute navigation with file
              await navigateWithFile();
              
              return `I've uploaded "${file.name}" and navigated to the document portal. You can now generate quizzes, summaries, or flashcards.`;
            } catch (err) {
              // User canceled or API not supported
              console.error("File picker API error:", err);
              // Fall back to regular file input
            }
          }
          
          // Fall back to regular file input click if File System Access API failed or isn't available
          return new Promise((resolve) => {
            fileInput.addEventListener('change', (e: Event) => {
              const target = e.target as HTMLInputElement;
              if (target.files && target.files[0]) {
                const file = target.files[0];
                setUploadedFile(file);
                
                // Create a function to handle file persistence across page navigation
                const navigateWithFile = async () => {
                  try {
                    // Navigate to the deaf assistance page where document processing happens
                    await router.push('/deaf');
                    setLastNavigatedTo('Deaf Assistance');
                    
                    // After navigation completes, dispatch a custom event to notify the document portal
                    setTimeout(() => {
                      // Dispatch custom event to notify Deafassistance component
                      const customEvent = new CustomEvent('jarvis-file-uploaded', {
                        detail: { fileName: file.name }
                      });
                      window.dispatchEvent(customEvent);
                      console.log("Dispatched jarvis-file-uploaded event for:", file.name);
                    }, 800); // Give the page time to fully render
                  } catch (navErr) {
                    console.error("Navigation error:", navErr);
                  }
                };
                
                // Execute navigation with file
                navigateWithFile();
                
                resolve(`I've uploaded "${file.name}" and navigated to the document portal. You can now generate quizzes, summaries, or flashcards.`);
              } else {
                resolve("No file was selected. Please try again by saying 'Jarvis upload document'.");
              }
            });
            
            // Trigger the file input click
            fileInput.click();
          });
        } catch (error) {
          console.error("Error in file upload:", error);
          return "I encountered an error trying to upload the file. Please try again or upload manually on the document portal.";
        }
      };
      
      // Client-side response generator - optimized for speed
      const generateLocalResponse = (input: string): string => {
        // Convert to lowercase for easier matching - do this once
        const lowerInput = input.toLowerCase();
        
        // SPEED OPTIMIZATION: Check for common keywords first to quickly filter options
        // Document upload command - Using our new helper
        const fileCommand = detectFileUploadCommand(lowerInput);
        
        if (fileCommand.isFileUpload) {
          const { fileName, location } = fileCommand;
          
          // This function will be called asynchronously, but we need to return something immediately
          setTimeout(() => {
            fileUploadHelper.handleNamedFileUpload(
              fileName || "document", 
              location || "downloads",
              (statusMessage) => {
                // Add status updates to the conversation
                const statusUpdate: ConversationMessage = { 
                  role: 'jarvis', 
                  content: statusMessage
                };
                setConversation(prev => [...prev, statusUpdate]);
                
                // Speak the status
                const utterance = new SpeechSynthesisUtterance(statusMessage);
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 0.8;
                window.speechSynthesis.speak(utterance);
              }
            ).then((response) => {
              // Add the final response to the conversation
              const confirmationMessage: ConversationMessage = { 
                role: 'jarvis', 
                content: response
              };
              setConversation(prev => [...prev, confirmationMessage]);
              
              // Speak the response
              const utterance = new SpeechSynthesisUtterance(response);
              utterance.rate = 1.0;
              utterance.pitch = 1.0;
              utterance.volume = 0.8;
              window.speechSynthesis.speak(utterance);
            });
          }, 500);
          
          if (fileName && location) {
            return `Looking for "${fileName}" in your ${location} folder...`;
          } else if (fileName) {
            return `Looking for "${fileName}"...`;
          } else {
            return "Opening file picker to select a document...";
          }
        }
        
        // Deaf assistance - quick check
        if (lowerInput.includes('deaf')) {
          return navigateTo('/deaf', 'Deaf Assistance');
        } 
        
        // Blind assistance - quick check
        if (lowerInput.includes('blind') || lowerInput.includes('voice assistant')) {
          return navigateTo('/voice-assistant', 'Blind Assistance');
        }
        
        // Handle simple document upload commands
        if ((lowerInput.includes('upload') && !lowerInput.includes('pdf') && !lowerInput.includes('docx')) || 
            (lowerInput.includes('document') && lowerInput.includes('portal'))) {
          // Either navigate to document portal or trigger file upload
          if (lowerInput.includes('navigate') || lowerInput.includes('go to') || lowerInput.includes('open') || lowerInput.includes('portal')) {
            return navigateTo('/deaf', 'Document Portal');
          } else {
            // Try to detect any filename pattern even in simpler commands
            let fileName = null;
            let location = "downloads"; // Default to downloads
            
            // Check for simple patterns like "upload my notes"
            const simpleFilePattern = /upload\s+(?:my\s+)?([^"'\s]+(?:\s+[^"'\s]+)*)/i;
            const simpleMatch = lowerInput.match(simpleFilePattern);
            
            if (simpleMatch && simpleMatch.length >= 2 && !['document', 'file', 'something'].includes(simpleMatch[1].toLowerCase())) {
              fileName = simpleMatch[1].trim();
              console.log(`Detected simple file reference: "${fileName}"`);
            }
            
            // Trigger file upload using our new helper
            setTimeout(() => {
              fileUploadHelper.handleNamedFileUpload(
                fileName || "document", 
                location,
                (statusMessage) => {
                  // Add status updates to the conversation
                  const statusUpdate: ConversationMessage = { 
                    role: 'jarvis', 
                    content: statusMessage
                  };
                  setConversation(prev => [...prev, statusUpdate]);
                  
                  // Speak the status
                  const utterance = new SpeechSynthesisUtterance(statusMessage);
                  utterance.rate = 1.0;
                  utterance.pitch = 1.0;
                  utterance.volume = 0.8;
                  window.speechSynthesis.speak(utterance);
                }
              ).then((response) => {
                const confirmationMessage: ConversationMessage = { 
                  role: 'jarvis', 
                  content: response
                };
                setConversation(prev => [...prev, confirmationMessage]);
                
                const utterance = new SpeechSynthesisUtterance(response);
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 0.8;
                window.speechSynthesis.speak(utterance);
              });
            }, 500);
            
            if (fileName) {
              return `Looking for "${fileName}"...`;
            } else {
              return "Opening file picker to select a document...";
            }
          }
        }
        
        // Topic explorer - quick check
        if (lowerInput.includes('personalized') || lowerInput.includes('topic explorer')) {
          return navigateTo('/topic-explorer', 'Personalized Learning');
        }
        // Topic recommendation intent
        else if (lowerInput.includes('recommend topic') || 
                 lowerInput.includes('suggest topic') || 
                 lowerInput.includes('new topic') ||
                 lowerInput.includes('topic idea') ||
                 lowerInput.includes('what should i learn') ||
                 lowerInput.includes('recommend new topics') ||
                 lowerInput.includes('suggest something to learn')) {
          return "I can help you discover new topics to learn about. " + navigateTo('/topic-explorer', 'Topic Explorer');
        }
        else if (lowerInput.includes('go to features') || 
                 lowerInput.includes('open features') || 
                 lowerInput.includes('show features') || 
                 lowerInput.includes('all features') ||
                 lowerInput.includes('what features') ||
                 lowerInput.includes('available features')) {
          return navigateTo('/features', 'Features Page');
        }
        // Quiz generation intent
        else if (lowerInput.includes('quiz') || 
                 lowerInput.includes('question') || 
                 lowerInput.includes('test me') ||
                 lowerInput.includes('assessment') ||
                 lowerInput.includes('exam')) {
          const [hasDocumentAccess, documentMessage] = checkForDocumentAccess();
          if (hasDocumentAccess) {
            speakForBlindUsers("Opening quiz generator. When loaded, keyboard navigation instructions will be provided.", false);
            return "Opening quiz generator..." + navigateTo('/quizz', 'Quiz Generator');
          }
          
          // Announce to blind users that a document is needed and we're navigating to upload
          speakForBlindUsers("You need to upload a document first to create a quiz. Navigating to document upload page.", true);
          
          // Navigate to document portal immediately
          setTimeout(() => {
            router.push('/deaf');
          }, 500);
          
          return "You need to upload a document first to create a quiz. Navigating to the document portal...";
        }
        // Flashcard generation intent
        else if (lowerInput.includes('flashcard') || 
                 lowerInput.includes('flash card') || 
                 lowerInput.includes('study card') ||
                 lowerInput.includes('make card') ||
                 lowerInput.includes('create card')) {
          const [hasDocumentAccess, documentMessage] = checkForDocumentAccess();
          if (hasDocumentAccess) {
            speakForBlindUsers("Opening flashcard generator. When loaded, keyboard navigation instructions will be provided.", false);
            return "Opening flashcard generator..." + navigateTo('/flash', 'Flashcard Generator');
          }
          
          // Announce to blind users that a document is needed and we're navigating to upload
          speakForBlindUsers("You need to upload a document first to create flashcards. Navigating to document upload page.", true);
          
          // Navigate to document portal immediately
          setTimeout(() => {
            router.push('/deaf');
          }, 500);
          
          return "You need to upload a document first to create flashcards. Navigating to the document portal...";
        }
        // Summary generation intent
        else if (lowerInput.includes('summar') || 
                 lowerInput.includes('condense') || 
                 lowerInput.includes('shorten') ||
                 lowerInput.includes('brief')) {
          const [hasDocumentAccess, documentMessage] = checkForDocumentAccess();
          if (hasDocumentAccess) {
            speakForBlindUsers("Opening document summarizer.", false);
            return "Opening document summarizer..." + navigateTo('/summary', 'Summary Tool');
          }
          
          // Announce to blind users that a document is needed and we're navigating to upload
          speakForBlindUsers("You need to upload a document first to create a summary. Navigating to document upload page.", true);
          
          // Navigate to document portal immediately
          setTimeout(() => {
            router.push('/deaf');
          }, 500);
          
          return "You need to upload a document first to create a summary. Navigating to the document portal...";
        }
        else if (lowerInput.includes('go to home') || 
                 lowerInput.includes('open home') || 
                 lowerInput.includes('go back home') ||
                 lowerInput.includes('homepage') ||
                 lowerInput.includes('main page')) {
          return navigateTo('/', 'Home Page');
        }
        else if (lowerInput.includes('go to sign language') || 
                 lowerInput.includes('open sign language') || 
                 lowerInput.includes('sign language translator')) {
          return navigateTo('/sign', 'Sign Language Translator');
        }
        else if (lowerInput.includes('go to summary') || 
                 lowerInput.includes('open summary') ||
                 lowerInput.includes('summarize') || 
                 lowerInput.includes('summarization')) {
          return navigateTo('/summary', 'Summary Tool');
        }
        
        // Simple response mapping based on keywords
        if (lowerInput.includes('hello') || lowerInput.includes('hi jarvis') || lowerInput === 'hi') {
          return "Hello! How can I assist you today?";
        } else if (lowerInput.includes('how are you')) {
          return "I'm functioning well, thank you for asking. How may I help you?";
        } else if (lowerInput.includes('weather')) {
          return "I don't have access to real-time weather data, but I'd be happy to discuss other topics.";
        } else if (lowerInput.includes('time') || lowerInput.includes('date')) {
          return `The current time is ${new Date().toLocaleTimeString()} and the date is ${new Date().toLocaleDateString()}.`;
        } else if (lowerInput.includes('help') || lowerInput.includes('assist')) {
          return "I can assist with navigation and document uploads. Try saying 'Go to deaf assistance', 'Upload document', or 'Create flashcards'. You can also say 'Jarvis upload a PDF' to select and upload a file.";
        } else if (lowerInput.includes('thank')) {
          return "You're welcome! Feel free to ask if you need anything else.";
        } else if (lowerInput.includes('bye') || lowerInput.includes('goodbye')) {
          return "Goodbye! Have a great day!";
        } else if (lowerInput.includes('name')) {
          return "I am Jarvis, your virtual assistant.";
        } else if (lowerInput.includes('what can you do') || lowerInput.includes('capabilities') || lowerInput.includes('functions')) {
          return "I can help you navigate the application, upload documents, and access learning tools. Try saying: 'Upload a document', 'Generate a quiz', 'Create flashcards', or 'Summarize my document'.";
        } else if (lowerInput.includes('sign language') || lowerInput.includes('asl')) {
          return "I can help you with sign language translation. Would you like me to navigate to our sign language translator?";
        } else if (lowerInput.includes('joke') || lowerInput.includes('funny')) {
          const jokes = [
            "Why don't scientists trust atoms? Because they make up everything!",
            "I told my wife she was drawing her eyebrows too high. She looked surprised.",
            "What do you call fake spaghetti? An impasta!",
            "Why did the scarecrow win an award? Because he was outstanding in his field!",
            "I'm reading a book about anti-gravity. It's impossible to put down!"
          ];
          return jokes[Math.floor(Math.random() * jokes.length)];
        } else if (lowerInput.includes('sign language') || lowerInput.includes('asl')) {
          return "I can help with sign language. Would you like me to navigate to our sign language features? Say 'Go to sign language'.";
        } else if (lowerInput.includes('clear') || lowerInput.includes('reset')) {
          // Clear conversation
          setConversation([]);
          localStorage.removeItem('jarvis_conversation');
          return "I've cleared our conversation history.";
        } else if (lowerInput.includes('quiet') || lowerInput.includes('silent') || lowerInput.includes('mute')) {
          // Toggle assistant visibility
          setShowAssistant(false);
          return "Minimizing assistant window.";
        }
        
        // Topic-based responses
        if (lowerInput.includes('education') || lowerInput.includes('learn') || lowerInput.includes('study')) {
          return "Education is our focus! We offer various tools for accessible learning. Would you like to navigate to personalized learning? Just say 'Go to personalized learning'.";
        } else if (lowerInput.includes('feature') || lowerInput.includes('tool') || lowerInput.includes('function')) {
          return "Our platform includes features for different needs. You can say 'Go to features' to see all available tools.";
        } else if (lowerInput.includes('deaf') || lowerInput.includes('hearing')) {
          return "We provide tools specifically designed for the deaf and hard of hearing community. Say 'Go to deaf assistance' to explore these features.";
        }
        
        // Default responses
        const defaultResponses = [
          "I'm here to assist you. What would you like to know?",
          "That's interesting! Tell me more about what you're looking for.",
          "I'm working in offline mode right now. You can ask me to navigate to specific pages like 'Go to deaf assistance'.",
          "I understand. Is there anything specific you'd like to discuss?",
          "I'm currently operating in local mode. I can help you navigate to different features, just say where you'd like to go."
        ];
        
        // Return a random default response
        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
      };
      
      // Generate user message for conversation if not already present
      if (!currentConversation.some(msg => msg.role === 'user' && msg.content === inputText)) {
        const userMessage: ConversationMessage = { 
          role: 'user', 
          content: inputText 
        };
        currentConversation = [...currentConversation, userMessage];
      }
      
      // Generate response
      const responseMessage = generateLocalResponse(inputText);
      
      // Add assistant response to conversation (matching VoiceAssistant.js format)
      const assistantResponse: ConversationMessage = { 
        role: 'jarvis', 
        content: responseMessage 
      };
      
      setConversation([...currentConversation, assistantResponse]);
      setResponseText(responseMessage);
      setWhisperTranscript(inputText);
      
    } catch (err) {
      console.error('Error getting assistant response:', err);
      setError(`Error getting assistant response: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      // Reset trigger state to allow new wake word
      setTriggered(false);
      
      // Note: isReady will be set to true after audio chunks are played
      // or immediately if there are no audio chunks
      if (!processingChunks) {
        setIsReady(true);
        
        // Try to restart recognition
        setTimeout(() => {
          if (recognitionRef.current && !isRecognitionActive && isReady && recognitionInitialized) {
            safelyStartRecognition("after getting response");
          }
        }, 1000);
      }
    }
  };

  const toggleAssistant = () => {
    setShowAssistant(!showAssistant);
  };

  // Add clear conversation functionality
  const clearConversation = () => {
    setConversation([]);
    localStorage.removeItem('jarvis_conversation');
    setError('Conversation history cleared');
    setTimeout(() => setError(''), 3000);
  };

  // Check if browser transcript contains command to clear conversation
  useEffect(() => {
    if (browserTranscript.toLowerCase().includes('jarvis clear') || 
        browserTranscript.toLowerCase().includes('jarvis reset') ||
        browserTranscript.toLowerCase().includes('clear conversation')) {
      clearConversation();
      setBrowserTranscript('');
    }
  }, [browserTranscript]);

  // Handle post-navigation announcements
  useEffect(() => {
    const announcePageArrival = () => {
      if (lastNavigatedTo && isReady && !isListening && !triggered && !processingChunks) {
        console.log(`Announcing arrival at ${lastNavigatedTo}`);
        
        // Create a confirmation message
        const confirmationMessage: ConversationMessage = { 
          role: 'jarvis', 
          content: `You are now on the ${lastNavigatedTo} page.`
        };
        
        // Add to conversation
        setConversation(prev => [...prev, confirmationMessage]);
        
        // Use speech synthesis to announce it
        const utterance = new SpeechSynthesisUtterance(`You are now on the ${lastNavigatedTo} page.`);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        window.speechSynthesis.speak(utterance);
        
        // Clear the lastNavigatedTo so we don't announce it again
        setLastNavigatedTo('');
      }
    };
    
    // Delay the announcement a bit to allow the page to render
    if (lastNavigatedTo) {
      const announcementTimer = setTimeout(() => {
        announcePageArrival();
      }, 1500);
      
      return () => clearTimeout(announcementTimer);
    }
  }, [lastNavigatedTo, isReady, isListening, triggered, processingChunks, setConversation]);

  // Handle visibility and speech recognition based on current page
  useEffect(() => {
    const isHomePage = router.pathname === '/';
    const isVoiceAssistantPage = router.pathname === '/voice-assistant';
    setIsButtonVisible(!isHomePage && !isVoiceAssistantPage);
    
    // We want speech recognition active on all pages except home and voice-assistant
    if (!isHomePage && !isVoiceAssistantPage) {
      // Initialize speech recognition if needed
      if (!recognitionRef.current || !recognitionInitialized) {
        // Initialize recognition for this page
        try {
          const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = 'en-US';
          
          // Set up event handlers (these are defined in the main useEffect but need to be re-attached)
          // We're re-adding minimal handlers here to avoid duplicating all the logic
          recognitionRef.current.onresult = (event: any) => {
            if (isReady) {
              try {
                const transcript = Array.from(event.results)
                  .map((result: any) => result[0])
                  .map((result: any) => result.transcript)
                  .join('');
                
                setBrowserTranscript(transcript);
                
                // Check for wake word
                if (transcript.toLowerCase().includes('jarvis')) {
                  console.log("✓ WAKE WORD DETECTED on page:", router.pathname);
                  
                  if (recognitionRef.current && isRecognitionActive) {
                    try {
                      recognitionRef.current.stop();
                      setIsRecognitionActive(false);
                    } catch (e) {
                      console.error("Error stopping recognition after wake word:", e);
                    }
                  }
                  
                  setShowAssistant(true);
                  
                  setTimeout(() => {
                    setTriggered(true);
                    startRecording();
                  }, 300);
                }
              } catch (err) {
                console.error("Error processing speech recognition results:", err);
              }
            }
          };
          
          recognitionRef.current.onerror = (event: any) => {
            console.log("Speech recognition error:", event.error);
            setIsRecognitionActive(false);
          };
          
          recognitionRef.current.onend = () => {
            console.log("Recognition ended");
            setIsRecognitionActive(false);
            
            // Restart if needed
            if (isReady && !triggered) {
              setTimeout(() => {
                if (recognitionRef.current && !isRecognitionActive && isReady && !triggered) {
                  safelyStartRecognition("after end event");
                }
              }, 1000);
            }
          };
          
          console.log("Recognition initialized on page:", router.pathname);
          setRecognitionInitialized(true);
        } catch (err) {
          console.error("Failed to initialize speech recognition on page change:", err);
          return;
        }
      }
      
      // Start the recognition if it's not already active
      setTimeout(() => {
        if (recognitionRef.current && !isRecognitionActive && recognitionInitialized) {
          safelyStartRecognition(`on page ${router.pathname}`);
        }
        
        console.log("Setting ready state after page change");
        setIsReady(true);
      }, 1000);
    } else {
      // On home or voice assistant pages, stop recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.log("Error stopping recognition on excluded page:", err);
        }
        setIsRecognitionActive(false);
      }
    }
  }, [router.pathname, isReady, triggered]);

  if (!isButtonVisible) return null;

  return (
    <>
      {/* Floating button */}
      <div 
        className="floating-jarvis-button"
        onClick={toggleAssistant}
        title={isRecognitionActive ? "Say 'Jarvis' or click to open" : "Recognition starting..."}
      >
        <img 
          src="/images/jarvis-icon.png" 
          alt="Jarvis" 
          width={40} 
          height={40}
          onError={(e) => {
            // Fallback if image doesn't exist
            e.currentTarget.style.backgroundColor = '#0070f3';
            e.currentTarget.alt = 'J';
            e.currentTarget.onerror = null;
          }}
        />
      </div>

      {/* Assistant dialog */}
      {showAssistant && (
        <div className="jarvis-assistant-panel">
          <div className="jarvis-header">
            <h3>Jarvis Assistant</h3>
            <button onClick={toggleAssistant} className="close-button">×</button>
          </div>
          
          <div className="jarvis-conversation" ref={chatContainerRef}>
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
          
          <div className="jarvis-controls">
            <div className="status-indicator">
              {isListening ? 'Listening...' : 
               triggered ? 'Processing...' : 
               isRecognitionActive ? 'Say "Jarvis" to activate' : 'Starting recognition...'}
            </div>
            <button 
              className="record-button"
              onClick={isListening ? stopRecording : startRecording}
              disabled={!isReady}
            >
              {isListening ? 'Stop' : 'Record'}
            </button>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
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
        </div>
      )}
      
      {/* Hidden audio element for playing responses */}
      <audio 
        ref={audioRef} 
        onEnded={handleAudioEnded} 
        style={{ display: 'none' }} 
      />

      <style jsx>{`
        .floating-jarvis-button {
          position: fixed;
          bottom: 20px;
          right: 160px; /* Moved further right to avoid overlapping with home button */
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background-color: #0070f3;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
          z-index: 1000;
          transition: all 0.3s ease;
          animation: ${isListening ? 'pulse 1.5s infinite' : 'none'};
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(0, 112, 243, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(0, 112, 243, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 112, 243, 0);
          }
        }

        .floating-jarvis-button:hover {
          transform: scale(1.1);
        }
        
        .floating-jarvis-button::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background-color: ${isRecognitionActive ? '#4CAF50' : triggered ? '#ff9800' : '#ccc'};
          border: 2px solid white;
          transition: background-color 0.3s ease;
        }

        .jarvis-assistant-panel {
          position: fixed;
          bottom: 80px;
          right: 160px; /* Match button position */
          width: 350px;
          height: 500px;
          background-color: white;
          border-radius: 10px;
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1001;
        }

        @media (max-width: 500px) {
          .jarvis-assistant-panel {
            right: 10px;
            width: calc(100vw - 20px);
            max-width: 350px;
          }
          
          .floating-jarvis-button {
            right: 140px; /* Maintain distance from edge on mobile */
          }
        }

        .jarvis-header {
          padding: 15px;
          background-color: #0070f3;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .jarvis-header h3 {
          margin: 0;
        }

        .close-button {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
        }

        .jarvis-conversation {
          flex: 1;
          padding: 15px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* Chat message styles matching the VoiceAssistant */
        .chat-message {
          margin-bottom: 15px;
          display: flex;
          flex-direction: column;
        }
        
        .chat-message.user {
          align-items: flex-end;
        }
        
        .chat-message.jarvis {
          align-items: flex-start;
        }
        
        .chat-bubble {
          max-width: 80%;
          padding: 12px 18px;
          border-radius: 18px;
          position: relative;
          margin-top: 5px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        
        .chat-message.user .chat-bubble {
          background-color: #0070f3;
          color: white;
          border-bottom-right-radius: 4px;
        }
        
        .chat-message.jarvis .chat-bubble {
          background-color: #2d2d2d;
          color: #00ffff;
          border-bottom-left-radius: 4px;
        }
        
        .chat-bubble strong {
          display: block;
          margin-bottom: 5px;
          font-size: 0.85em;
          letter-spacing: 1px;
        }
        
        .chat-message.user .chat-bubble strong {
          color: rgba(255,255,255,0.8);
        }
        
        .chat-message.jarvis .chat-bubble strong {
          color: #4fc3f7;
        }
        
        .chat-empty {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: #666;
          font-style: italic;
        }

        .jarvis-controls {
          padding: 15px;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .status-indicator {
          font-size: 14px;
          color: #666;
        }

        .record-button {
          background-color: #0070f3;
          color: white;
          border: none;
          padding: 8px 15px;
          border-radius: 5px;
          cursor: pointer;
        }

        .record-button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }

        .error-message {
          color: red;
          padding: 5px 15px;
          font-size: 12px;
          text-align: center;
        }
        
        .clear-button-container {
          display: flex;
          justify-content: center;
          padding: 5px 0 10px;
        }
        
        .clear-button {
          background-color: #ff5252;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
        
        .clear-button:hover {
          background-color: #ff1744;
        }
      `}</style>
    </>
  );
};

export default JarvisFloatingButton;
