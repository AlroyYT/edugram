import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const FlashcardsEnhanced: React.FC = () => {
  const [fcrd84StudyCards, setFcrd84StudyCards] = useState<{ question: string; answer: string }[]>([]);
  const [fcrd84CardIndex, setFcrd84CardIndex] = useState(0);
  const [fcrd84ProcessingStatus, setFcrd84ProcessingStatus] = useState(false);
  const [fcrd84StatusMessage, setFcrd84StatusMessage] = useState('');
  const [fcrd84UploadedFile, setFcrd84UploadedFile] = useState<string>('');
  const [fcrd84IsCardFlipped, setFcrd84IsCardFlipped] = useState(false);
  const [fcrd84UploadProgress, setFcrd84UploadProgress] = useState(0);
  const [fcrd84ShowProgressIndicator, setFcrd84ShowProgressIndicator] = useState(false);
  const fcrd84FileInputRef = useRef<HTMLInputElement>(null);
  const fcrd84ProgressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (fcrd84ProgressIntervalRef.current) {
        clearInterval(fcrd84ProgressIntervalRef.current);
      }
    };
  }, []);

  const fcrd84SimulateProgressIndicator = () => {
    setFcrd84ShowProgressIndicator(true);
    setFcrd84UploadProgress(0);
    
    fcrd84ProgressIntervalRef.current = setInterval(() => {
      setFcrd84UploadProgress(prev => {
        if (prev >= 90) {
          return prev;
        }
        const increment = Math.random() * 10;
        return Math.min(prev + increment, 90);
      });
    }, 500);
  };

  const fcrd84CompleteProgressIndicator = () => {
    if (fcrd84ProgressIntervalRef.current) {
      clearInterval(fcrd84ProgressIntervalRef.current);
    }
    setFcrd84UploadProgress(100);
    setTimeout(() => {
      setFcrd84ShowProgressIndicator(false);
    }, 600);
  };

  const fcrd84HandleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setFcrd84ProcessingStatus(true);
      setFcrd84StatusMessage('');
      const file = event.target.files?.[0];
      
      if (!file) {
        setFcrd84StatusMessage('Please select a valid document to generate flashcards.');
        setFcrd84ProcessingStatus(false);
        return;
      }

      setFcrd84UploadedFile(file.name);
      fcrd84SimulateProgressIndicator();

      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        'http://127.0.0.1:8000/api/generate-flashcards/',
        formData,
        { 
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentComplete = progressEvent.total 
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            
            if (percentComplete === 100) {
              // API processing now, keep progress bar moving
            }
          }
        }
      );

      fcrd84CompleteProgressIndicator();
      
      if (response.data.flashcards && response.data.flashcards.length > 0) {
        setFcrd84StudyCards(response.data.flashcards);
        setFcrd84CardIndex(0);
        setFcrd84IsCardFlipped(false);
      } else {
        setFcrd84StatusMessage('No flashcards could be generated from this document. Please try a different file.');
      }

      // Reset the file input
      if (fcrd84FileInputRef.current) {
        fcrd84FileInputRef.current.value = '';
      }
    } catch (error) {
      fcrd84CompleteProgressIndicator();
      console.error('Error generating flashcards:', error);
      setFcrd84StatusMessage('We encountered an issue processing your document. Please try again.');
    } finally {
      setFcrd84ProcessingStatus(false);
    }
  };

  const fcrd84NavigateNext = () => {
    if (fcrd84CardIndex < fcrd84StudyCards.length - 1) {
      setFcrd84IsCardFlipped(false);
      setTimeout(() => {
        setFcrd84CardIndex(fcrd84CardIndex + 1);
      }, 300);
    }
  };

  const fcrd84NavigatePrevious = () => {
    if (fcrd84CardIndex > 0) {
      setFcrd84IsCardFlipped(false);
      setTimeout(() => {
        setFcrd84CardIndex(fcrd84CardIndex - 1);
      }, 300);
    }
  };

  const fcrd84ToggleCardFlip = () => {
    setFcrd84IsCardFlipped(!fcrd84IsCardFlipped);
  };

  const fcrd84TriggerFileUpload = () => {
    if (fcrd84FileInputRef.current) {
      fcrd84FileInputRef.current.click();
    }
  };

  return (
    <div className="fcrd84_studycard_dashboard">
      <div className="fcrd84_studycard_container">
        <motion.h1 
          className="fcrd84_studycard_title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Flashcards
        </motion.h1>

        <motion.div 
          className="fcrd84_upload_container"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <button 
            className="fcrd84_upload_button"
            onClick={fcrd84TriggerFileUpload}
            disabled={fcrd84ProcessingStatus}
          >
            <span className="fcrd84_upload_icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 15V3M12 3L7 8M12 3L17 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M3 17V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            Choose a File
          </button>
          
          <input
            ref={fcrd84FileInputRef}
            id="fcrd84_document_upload"
            type="file"
            accept=".pdf,.pptx"
            onChange={fcrd84HandleFileUpload}
            disabled={fcrd84ProcessingStatus}
            className="fcrd84_file_input_hidden"
          />
          
          {fcrd84UploadedFile && (
            <motion.p 
              className="fcrd84_selected_file"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              Selected file: <span>{fcrd84UploadedFile}</span>
            </motion.p>
          )}
          
          {fcrd84ShowProgressIndicator && (
            <motion.div 
              className="fcrd84_progress_container"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="fcrd84_progress_bar_outer">
                <motion.div 
                  className="fcrd84_progress_bar_inner"
                  initial={{ width: '0%' }}
                  animate={{ width: `${fcrd84UploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="fcrd84_progress_text">Processing document...</span>
            </motion.div>
          )}
          
          {fcrd84StatusMessage && (
            <motion.p 
              className="fcrd84_status_message"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {fcrd84StatusMessage}
            </motion.p>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {fcrd84StudyCards.length > 0 && !fcrd84ProcessingStatus && (
            <motion.div
              key="card-view"
              className="fcrd84_card_view_container"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <div 
                className={`fcrd84_flashcard ${fcrd84IsCardFlipped ? 'fcrd84_flipped' : ''}`}
                onClick={fcrd84ToggleCardFlip}
              >
                <div className="fcrd84_flashcard_inner">
                  <div className="fcrd84_flashcard_front">
                    <h2>{fcrd84StudyCards[fcrd84CardIndex].question}</h2>
                    <div className="fcrd84_card_hint">Click to reveal answer</div>
                  </div>
                  <div className="fcrd84_flashcard_back">
                    <p>{fcrd84StudyCards[fcrd84CardIndex].answer}</p>
                  </div>
                </div>
              </div>
              
              <div className="fcrd84_navigation_controls">
                <button 
                  onClick={fcrd84NavigatePrevious} 
                  disabled={fcrd84CardIndex === 0}
                  className="fcrd84_nav_button fcrd84_prev_button"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Previous
                </button>
                
                <div className="fcrd84_card_counter">
                  <motion.span
                    key={fcrd84CardIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    Flashcard {fcrd84CardIndex + 1} of {fcrd84StudyCards.length}
                  </motion.span>
                </div>
                
                <button 
                  onClick={fcrd84NavigateNext} 
                  disabled={fcrd84CardIndex === fcrd84StudyCards.length - 1}
                  className="fcrd84_nav_button fcrd84_next_button"
                >
                  Next
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </motion.div>
          )}
          
          {fcrd84StudyCards.length === 0 && !fcrd84ProcessingStatus && !fcrd84StatusMessage && (
            <motion.div 
              className="fcrd84_empty_state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <div className="fcrd84_empty_state_icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M9 9H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M9 12H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M9 15H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h3>No flashcards yet</h3>
              <p>Upload a PDF or PPTX file to generate interactive flashcards</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FlashcardsEnhanced;