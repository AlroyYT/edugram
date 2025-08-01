import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, MessageCircle, Volume2, Home } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'jarvis';
  message: string;
  timestamp: Date;
}

interface NavigationRoute {
  keywords: string[];
  path: string;
  displayName: string;
}

const JarvisVoiceBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isWaitingForCommand, setIsWaitingForCommand] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [micPermission, setMicPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isBackgroundListening, setIsBackgroundListening] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Navigation routes configuration
  const navigationRoutes: NavigationRoute[] = [
    { keywords: ['deaf assistance', 'deaf', 'hearing','def','death'], path: '/deaf', displayName: 'Deaf Assistance' },
    { keywords: ['blind assistance', 'blind', 'visual'], path: '/voice-assistant', displayName: 'Blind Assistance' },
    { keywords: ['home', 'homepage', 'main page', 'home page'], path: '/features', displayName: 'Home Page' },
    { keywords: ['topic explorer', 'explorer', 'topics'], path: '/topic-explorer', displayName: 'Topic Explorer' },
    { keywords: ['speech fluency', 'speech', 'fluency'], path: '/speech', displayName: 'Speech Fluency' },
  ];

  // Initialize and start background listening on component mount
  useEffect(() => {
    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
    }

    // Initialize speech recognition and start background listening
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      setIsInitialized(true);
      
      // Auto-start background listening
      initializeBackgroundListening();
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const initializeBackgroundListening = async () => {
    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission('granted');
      startBackgroundListening();
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setMicPermission('denied');
    }
  };

  const startBackgroundListening = () => {
    if (!recognitionRef.current || isBackgroundListening) return;
    
    try {
      setIsBackgroundListening(true);
      setIsListening(true);
      recognitionRef.current.start();
      console.log('Background speech recognition started');
    } catch (error) {
      console.error('Failed to start background listening:', error);
      setIsBackgroundListening(false);
      setIsListening(false);
    }
  };

  useEffect(() => {
    if (!recognitionRef.current) return;

    recognitionRef.current.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setCurrentTranscript(interimTranscript);

      if (finalTranscript) {
        const lowerTranscript = finalTranscript.toLowerCase().trim();
        
        if (!isWaitingForCommand) {
          // Check for wake word
          if (lowerTranscript.includes('jarvis')) {
            handleWakeWord();
          }
        } else {
          // Process command
          handleCommand(finalTranscript.trim());
        }
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      
      // Handle different error types
      if (event.error === 'not-allowed') {
        setMicPermission('denied');
        setIsBackgroundListening(false);
        setIsListening(false);
        return;
      }
      
      // Restart listening after other errors
      setTimeout(() => {
        if (micPermission === 'granted' && !isWaitingForCommand) {
          restartBackgroundListening();
        }
      }, 1000);
    };

    recognitionRef.current.onend = () => {
      // Auto-restart background listening unless explicitly stopped
      if (isBackgroundListening && micPermission === 'granted') {
        setTimeout(() => {
          if (recognitionRef.current && isBackgroundListening) {
            try {
              recognitionRef.current.start();
            } catch (error) {
              console.error('Error restarting recognition:', error);
            }
          }
        }, 100);
      }
    };
  }, [isBackgroundListening, isWaitingForCommand, micPermission]);

  const restartBackgroundListening = () => {
    if (recognitionRef.current && micPermission === 'granted') {
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          if (recognitionRef.current && isBackgroundListening) {
            recognitionRef.current.start();
          }
        }, 500);
      } catch (error) {
        console.error('Error restarting background listening:', error);
      }
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleWakeWord = () => {
    if (!isOpen) setIsOpen(true);
    setIsWaitingForCommand(true);
    setCurrentTranscript('');
    
    addChatMessage('jarvis', 'Yes?');
    speak('Yes?');
    
    // Set timeout to stop waiting for command
    setTimeout(() => {
      if (isWaitingForCommand) {
        setIsWaitingForCommand(false);
        addChatMessage('jarvis', 'I\'m here when you need me.');
      }
    }, 10000);
  };

  const handleCommand = (command: string) => {
    setIsWaitingForCommand(false);
    setIsProcessing(true);
    setCurrentTranscript('');
    
    addChatMessage('user', command);
    
    const lowerCommand = command.toLowerCase();
    
    // Check for navigation commands
    if (lowerCommand.includes('navigate') || lowerCommand.includes('go to') || lowerCommand.includes('open')) {
      const route = navigationRoutes.find(route => 
        route.keywords.some(keyword => lowerCommand.includes(keyword))
      );
      
      if (route) {
        const response = `Okay, navigating to ${route.displayName} now.`;
        addChatMessage('jarvis', response);
        speak(response);
        
        // Simulate navigation (in real app, use Next.js router)
        setTimeout(() => {
          window.location.href = route.path;
        }, 2000);
      } else {
        const response = 'I\'m not sure which page you want to navigate to. Could you be more specific?';
        addChatMessage('jarvis', response);
        speak(response);
      }
    } else if (lowerCommand.includes('close') || lowerCommand.includes('minimize')) {
      const response = 'Closing the assistant.';
      addChatMessage('jarvis', response);
      speak(response);
      setTimeout(() => setIsOpen(false), 1500);
    } else if (lowerCommand.includes('hello') || lowerCommand.includes('hi')) {
      const response = 'Hello! I\'m here to help you navigate through the platform.';
      addChatMessage('jarvis', response);
      speak(response);
    } else {
      const response = 'I can help you navigate to different pages. Just say "navigate to" followed by the page name.';
      addChatMessage('jarvis', response);
      speak(response);
    }
    
    setIsProcessing(false);
  };

  const speak = async (text: string) => {
    try {
      // Using Google Text-to-Speech API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
      } else {
        // Fallback to browser speech synthesis
        if (synthRef.current) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 0.9;
          utterance.pitch = 1;
          utterance.volume = 0.8;
          synthRef.current.speak(utterance);
        }
      }
    } catch (error) {
      console.error('TTS Error:', error);
      // Fallback to browser speech synthesis
      if (synthRef.current) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;
        synthRef.current.speak(utterance);
      }
    }
  };

  const addChatMessage = (type: 'user' | 'jarvis', message: string) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, newMessage]);
  };

  const toggleBackgroundListening = () => {
    if (isBackgroundListening) {
      // Stop background listening
      setIsBackgroundListening(false);
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      // Start background listening
      if (micPermission === 'granted') {
        startBackgroundListening();
      } else {
        initializeBackgroundListening();
      }
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getButtonColor = () => {
    if (micPermission === 'denied') return '#ef4444';
    if (isWaitingForCommand) return '#f59e0b';
    if (isBackgroundListening) return '#10b981';
    return '#6b7280';
  };

  const getButtonIcon = () => {
    if (micPermission === 'denied') return <MicOff size={24} />;
    if (isOpen) return <X size={24} />;
    return <MessageCircle size={24} />;
  };

  const getStatusText = () => {
    if (micPermission === 'denied') return 'Microphone access denied';
    if (isWaitingForCommand) return 'Listening for command...';
    if (isBackgroundListening) return 'Say "Jarvis" to activate';
    return 'Click to start listening';
  };

  return (
    <div>
      {/* Floating Action Button */}
      <button
        onClick={() => {
          if (isOpen) {
            setIsOpen(false);
          } else if (micPermission === 'denied') {
            initializeBackgroundListening();
          } else {
            setIsOpen(true);
          }
        }}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: getButtonColor(),
          color: 'white',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 9999,
          transition: 'all 0.3s ease',
          transform: isOpen || isWaitingForCommand ? 'scale(1.1)' : 'scale(1)',
          animation: isWaitingForCommand ? 'pulse 1s infinite' : (isBackgroundListening ? 'breathe 3s infinite' : 'none')
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = isOpen || isWaitingForCommand ? 'scale(1.1)' : 'scale(1)';
        }}
        title={getStatusText()}
      >
        {getButtonIcon()}
      </button>

      {/* Background Listening Indicator */}
      {isBackgroundListening && !isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '24px',
            background: 'rgba(16, 185, 129, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            zIndex: 9998,
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            animation: 'fadeInOut 3s infinite'
          }}
        >
          🎤 Listening for "Jarvis"
        </div>
      )}

      {/* Chat Interface */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '104px',
            right: '24px',
            width: '384px',
            height: '384px',
            backgroundColor: '#111827',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid #374151',
            zIndex: 9998
          }}
        >
          {/* Header */}
          <div
            style={{
              background: 'linear-gradient(90deg, #2563eb 0%, #9333ea 100%)',
              padding: '16px',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: isBackgroundListening ? '#34d399' : '#9ca3af',
                  borderRadius: '50%',
                  animation: isBackgroundListening ? 'pulse 2s infinite' : 'none'
                }}
              ></div>
              <h3 style={{ color: 'white', fontWeight: '600', margin: 0 }}>Jarvis Assistant</h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                color: 'white',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Chat Messages */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {chatHistory.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '32px' }}>
                <Volume2 size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                {micPermission === 'denied' ? (
                  <div>
                    <p style={{ fontSize: '14px', margin: '0 0 8px 0', color: '#ef4444' }}>Microphone access denied</p>
                    <p style={{ fontSize: '12px', margin: 0 }}>Please allow microphone access</p>
                  </div>
                ) : !isBackgroundListening ? (
                  <div>
                    <p style={{ fontSize: '14px', margin: '0 0 8px 0' }}>Voice assistant inactive</p>
                    <p style={{ fontSize: '12px', margin: 0 }}>Enable background listening to use voice commands</p>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontSize: '14px', margin: '0 0 8px 0' }}>🎤 Listening in background</p>
                    <p style={{ fontSize: '12px', margin: 0 }}>Say "Jarvis" followed by your command</p>
                  </div>
                )}
              </div>
            )}
            
            {chatHistory.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    maxWidth: '75%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: message.type === 'user' ? '#2563eb' : '#374151',
                    color: '#f3f4f6'
                  }}
                >
                  <p style={{ fontSize: '14px', margin: '0 0 4px 0' }}>{message.message}</p>
                  <span style={{ fontSize: '12px', opacity: 0.7 }}>
                    {formatTime(message.timestamp)}
                  </span>
                </div>
              </div>
            ))}
            
            {currentTranscript && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    maxWidth: '75%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(37, 99, 235, 0.5)',
                    color: 'white',
                    border: '1px solid #3b82f6',
                    fontStyle: 'italic'
                  }}
                >
                  <p style={{ fontSize: '14px', margin: 0 }}>{currentTranscript}</p>
                </div>
              </div>
            )}
            
            {isProcessing && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    backgroundColor: '#374151',
                    color: '#f3f4f6',
                    padding: '12px',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', backgroundColor: '#60a5fa', borderRadius: '50%', animation: 'bounce 1s infinite' }}></div>
                    <div style={{ width: '8px', height: '8px', backgroundColor: '#60a5fa', borderRadius: '50%', animation: 'bounce 1s infinite 0.1s' }}></div>
                    <div style={{ width: '8px', height: '8px', backgroundColor: '#60a5fa', borderRadius: '50%', animation: 'bounce 1s infinite 0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Status Bar */}
          <div
            style={{
              padding: '12px',
              backgroundColor: '#1f2937',
              borderBottomLeftRadius: '12px',
              borderBottomRightRadius: '12px',
              borderTop: '1px solid #374151'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isBackgroundListening ? (
                  <>
                    <Mic size={16} style={{ color: '#34d399' }} />
                    <span style={{ color: '#34d399', fontSize: '12px' }}>
                      {isWaitingForCommand ? 'Waiting for command...' : 'Background listening active'}
                    </span>
                  </>
                ) : (
                  <>
                    <MicOff size={16} style={{ color: '#9ca3af' }} />
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>Voice inactive</span>
                  </>
                )}
              </div>
              
              <button
                onClick={toggleBackgroundListening}
                style={{
                  padding: '8px',
                  borderRadius: '50%',
                  backgroundColor: isBackgroundListening ? '#ef4444' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={isBackgroundListening ? 'Stop background listening' : 'Start background listening'}
              >
                {isBackgroundListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(16, 185, 129, 0.3); }
          50% { transform: scale(1.05); box-shadow: 0 0 30px rgba(16, 185, 129, 0.5); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes fadeInOut {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// Extend Window interface for TypeScript
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface SpeechRecognitionResult {
  [index: number]: {
    transcript: string;
  };
  isFinal: boolean;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

export default JarvisVoiceBot;