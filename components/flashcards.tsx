import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useFileContext } from '../context/FileContext';
import { useRouter } from 'next/router';
import { jsPDF } from 'jspdf';
import SignLanguageAnimation from '../components/SignLanguageAnimation';

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
      setFcrd84StatusMessage('Processing your document...');
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
              setFcrd84StatusMessage(`Uploading... ${percentComplete}%`);
            }
          }
        );

        setFcrd84StatusMessage('Generating flashcards...');

        if (response.data.flashcards && response.data.flashcards.length > 0) {
          setFcrd84StudyCards(response.data.flashcards);
          setFcrd84CardIndex(0);
          setFcrd84IsCardFlipped(false);
          setFcrd84StatusMessage('');
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

  const handleDone = async () => {
    await saveFlashcardsToPDF();
    router.push("/deaf");
  };

  const saveFlashcardsToPDF = async () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const originalFileName = uploadedFile?.name?.split('.')[0] || 'flashcards';

    try {
      const margin = 20;
      const lineHeight = 7;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let y = margin;

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

      fcrd84StudyCards.forEach((card, index) => {
        if (y > pageHeight - margin - (lineHeight * 10)) {
          doc.addPage();
          y = margin;
        }

        doc.setFontSize(14);
        doc.text(`Card ${index + 1}/${fcrd84StudyCards.length}`, margin, y);
        y += lineHeight * 2;

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 139);
        const questionText = `Q: ${card.question}`;
        const splitQuestion = doc.splitTextToSize(questionText, pageWidth - (margin * 2));
        doc.text(splitQuestion, margin, y);
        y += lineHeight * (splitQuestion.length + 1);

        doc.setTextColor(0, 100, 0);
        const answerText = `A: ${card.answer}`;
        const splitAnswer = doc.splitTextToSize(answerText, pageWidth - (margin * 2));
        doc.text(splitAnswer, margin, y);
        y += lineHeight * (splitAnswer.length + 2);

        doc.setTextColor(0, 0, 0);
        y += lineHeight * 2;
      });

      const pdfBlob = doc.output('blob');
      const formData = new FormData();
      formData.append('file', pdfBlob, `${originalFileName}_flashcards.pdf`);
      formData.append('type', 'flashcards');
      formData.append('content', JSON.stringify({ cards: fcrd84StudyCards, date }));
      formData.append('fileName', `${originalFileName}_flashcards`);

      const response = await axios.post('http://127.0.0.1:8000/api/save-material/', formData, {
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

  const cleanText = fcrd84StudyCards[fcrd84CardIndex]?.question?.replace(/[^a-zA-Z0-9\s]/g, '').trim() || '';
  

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

        <div className="fcrd84_flex_wrap">
          {/* Left Side - Flashcard or Processing Status */}
          <div className="fcrd84_card_left">
            <AnimatePresence mode="wait">
              {fcrd84ProcessingStatus ? (
                <motion.div
                  key="processing"
                  className="fcrd84_processing_container"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="fcrd84_processing_card">
                    <div className="fcrd84_loading_spinner"></div>
                    <h3>{fcrd84StatusMessage}</h3>
                    {fcrd84ShowProgressIndicator && (
                      <div className="fcrd84_progress_container">
                        <div className="fcrd84_progress_bar">
                          <div 
                            className="fcrd84_progress_fill" 
                            style={{ width: `${fcrd84UploadProgress}%` }}
                          ></div>
                        </div>
                        <span className="fcrd84_progress_text">{fcrd84UploadProgress}%</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : fcrd84StudyCards.length > 0 ? (
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
                    <button onClick={fcrd84NavigatePrevious} disabled={fcrd84CardIndex === 0} className="fcrd84_nav_button fcrd84_prev_button">Previous</button>
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
                      <button onClick={handleDone} className="fcrd84_nav_button fcrd84_done_button">Done</button>
                    ) : (
                      <button onClick={fcrd84NavigateNext} className="fcrd84_nav_button fcrd84_next_button">Next</button>
                    )}
                  </div>
                </motion.div>
              ) : fcrd84StatusMessage ? (
                <motion.div
                  key="error-message"
                  className="fcrd84_error_container"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="fcrd84_error_card">
                    <h3>Error</h3>
                    <p>{fcrd84StatusMessage}</p>
                    <button onClick={() => router.push("/deaf")} className="fcrd84_nav_button">
                      Go Back
                    </button>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          {/* Right Side - Sign Language */}
          <div className="fcrd84_signlang_box">
            <SignLanguageAnimation text={cleanText} />
          </div>
        </div>
      </div>

      <style jsx>{`
        .fcrd84_processing_container,
        .fcrd84_error_container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        .fcrd84_processing_card,
        .fcrd84_error_card {
          background: white;
          border-radius: 15px;
          padding: 40px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 400px;
          width: 100%;
        }

        .fcrd84_loading_spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .fcrd84_progress_container {
          margin-top: 20px;
        }

        .fcrd84_progress_bar {
          width: 100%;
          height: 8px;
          background-color: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .fcrd84_progress_fill {
          height: 100%;
          background-color: #007bff;
          transition: width 0.3s ease;
        }

        .fcrd84_progress_text {
          font-size: 14px;
          color: #666;
        }

        .fcrd84_processing_card h3,
        .fcrd84_error_card h3 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 18px;
        }

        .fcrd84_error_card p {
          color: #666;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
};

export default FlashcardsEnhanced;