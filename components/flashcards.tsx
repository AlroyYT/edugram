import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useFileContext } from '../context/FileContext';
import { useRouter } from 'next/router';

const FlashcardsEnhanced: React.FC = () => {
  const [fcrd84StudyCards, setFcrd84StudyCards] = useState<{ question: string; answer: string }[]>([]);
  const [fcrd84CardIndex, setFcrd84CardIndex] = useState(0);
  const [fcrd84ProcessingStatus, setFcrd84ProcessingStatus] = useState(false);
  const [fcrd84StatusMessage, setFcrd84StatusMessage] = useState('');
  const [fcrd84IsCardFlipped, setFcrd84IsCardFlipped] = useState(false);
  const [fcrd84UploadProgress, setFcrd84UploadProgress] = useState(0);
  const [fcrd84ShowProgressIndicator, setFcrd84ShowProgressIndicator] = useState(false);
  const { uploadedFile } = useFileContext();
  const router = useRouter();

  useEffect(() => {
    if (!uploadedFile) {
      router.push("/deaf");
      return;
    }

    const generateFlashcards = async () => {
      setFcrd84ProcessingStatus(true);
      setFcrd84StatusMessage('');
      setFcrd84ShowProgressIndicator(true);
      setFcrd84UploadProgress(0);

      const formData = new FormData();
      formData.append('file', uploadedFile);

      try {
        const response = await axios.post(
          'http://127.0.0.1:8000/api/generate-flashcards/',
          formData,
          { 
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              const percentComplete = progressEvent.total 
                ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                : 0;
              setFcrd84UploadProgress(percentComplete);
            }
          }
        );

        if (response.data.flashcards && response.data.flashcards.length > 0) {
          setFcrd84StudyCards(response.data.flashcards);
          setFcrd84CardIndex(0);
          setFcrd84IsCardFlipped(false);
        } else {
          setFcrd84StatusMessage('No flashcards could be generated from this document. Please try a different file.');
        }
      } catch (error) {
        console.error('Error generating flashcards:', error);
        setFcrd84StatusMessage('We encountered an issue processing your document. Please try again.');
      } finally {
        setFcrd84ProcessingStatus(false);
        setFcrd84ShowProgressIndicator(false);
      }
    };

    generateFlashcards();
  }, [uploadedFile, router]);

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

  const handleBackToUpload = () => {
    router.push("/deaf");
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

        {fcrd84ProcessingStatus && (
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
              <h3>No flashcards generated</h3>
              <p>Please try uploading a different document</p>
              <button 
                className="fcrd84_back_button"
                onClick={handleBackToUpload}
              >
                Back to Upload
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default FlashcardsEnhanced;