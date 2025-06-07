import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useFileContext } from '../context/FileContext';
import { useRouter } from 'next/router';
import { jsPDF } from 'jspdf';
import { BACKEND_URL } from "./config";


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
          `${BACKEND_URL}/api/generate-flashcards/`,
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

  const saveFlashcardsToPDF = async () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const originalFileName = uploadedFile?.name?.split('.')[0] || 'flashcards';

    try {
      // Set initial margins and line height
      const margin = 20;
      const lineHeight = 7;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let y = margin;

      // Add title and metadata
      doc.setFontSize(16);
      doc.text("Flashcards", margin, y);
      y += lineHeight * 2;

      doc.setFontSize(12);
      doc.text(`File: ${originalFileName}`, margin, y);
      y += lineHeight;
      doc.text(`Date: ${date}`, margin, y);
      y += lineHeight;
      doc.text(`Total Cards: ${fcrd84StudyCards.length}`, margin, y);
      y += lineHeight * 2;

      // Add flashcards
      doc.setFontSize(12);
      fcrd84StudyCards.forEach((card, index) => {
        // Check if we need a new page
        if (y > pageHeight - margin - (lineHeight * 10)) {
          doc.addPage();
          y = margin;
        }

        // Add card number
        doc.setFontSize(14);
        doc.text(`Card ${index + 1}/${fcrd84StudyCards.length}`, margin, y);
        y += lineHeight * 2;

        // Add question
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 139); // Dark blue for question
        const questionText = `Q: ${card.question}`;
        const splitQuestion = doc.splitTextToSize(questionText, pageWidth - (margin * 2));
        doc.text(splitQuestion, margin, y);
        y += lineHeight * (splitQuestion.length + 1);

        // Add answer
        doc.setTextColor(0, 100, 0); // Dark green for answer
        const answerText = `A: ${card.answer}`;
        const splitAnswer = doc.splitTextToSize(answerText, pageWidth - (margin * 2));
        doc.text(splitAnswer, margin, y);
        y += lineHeight * (splitAnswer.length + 2);

        // Reset color
        doc.setTextColor(0, 0, 0);

        // Add some space between cards
        y += lineHeight * 2;
      });

      // Convert PDF to blob
      const pdfBlob = doc.output('blob');

      // Create FormData and append the PDF
      const formData = new FormData();
      formData.append('file', pdfBlob, `${originalFileName}_flashcards.pdf`);
      formData.append('type', 'flashcards');
      formData.append('content', JSON.stringify({
        cards: fcrd84StudyCards,
        date: date
      }));
      formData.append('fileName', `${originalFileName}_flashcards`);

      // Send to backend using the save-material endpoint
      const response = await axios.post(`${BACKEND_URL}/api/save-material/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.status === 'success') {
        console.log('Flashcards PDF saved successfully:', response.data.file_path);
      }
    } catch (error) {
      console.error('Error saving PDF:', error);
    }
  };

  const handleDone = async () => {
    await saveFlashcardsToPDF();
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
                
                {fcrd84CardIndex === fcrd84StudyCards.length - 1 ? (
                  <button 
                    onClick={handleDone}
                    className="fcrd84_nav_button fcrd84_done_button"
                  >
                    Done
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                ) : (
                  <button 
                    onClick={fcrd84NavigateNext} 
                    className="fcrd84_nav_button fcrd84_next_button"
                  >
                    Next
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
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
                onClick={handleDone}
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