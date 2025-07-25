import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { useFileContext } from "../context/FileContext";
import { useRouter } from "next/router";
import { jsPDF } from 'jspdf';
import SignLanguageAnimation from "../components/SignLanguageAnimation";

const QuizExperience = () => {
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [activeProblemIndex, setActiveProblemIndex] = useState(0);
  const [chosenAnswer, setChosenAnswer] = useState<string | null>(null);
  const [revealSolution, setRevealSolution] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [timerActive, setTimerActive] = useState(false);
  const [scoreData, setScoreData] = useState({ correct: 0, total: 0 });
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();
  const [animateQuestion, setAnimateQuestion] = useState(true);
  const { uploadedFile } = useFileContext();
  const router = useRouter();
  
  useEffect(() => {
    if (!uploadedFile) {
      router.push("/deaf");
      return;
    }
    
    const generateQuiz = async () => {
      setProcessingFile(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append("file", uploadedFile);

      try {
        const response = await axios.post("http://127.0.0.1:8000/api/generate-mcqs/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (response.status === 200) {
          setQuizQuestions(response.data.mcqs);
          setScoreData({ correct: 0, total: response.data.mcqs.length });
          setTimerActive(true);
        } else {
          setUploadError("Failed to generate quiz questions. Please try again.");
        }
      } catch (err) {
        setUploadError("An error occurred while processing your document.");
      } finally {
        setProcessingFile(false);
      }
    };

    generateQuiz();
  }, [uploadedFile, router]);

  useEffect(() => {
    let countdown: NodeJS.Timeout;
    if (timerActive && timeRemaining > 0) {
      countdown = setTimeout(() => {
        setTimeRemaining(time => time - 1);
      }, 1000);
    } else if (timeRemaining === 0 && timerActive) {
      handleNextProblem();
    }
    
    return () => {
      if (countdown) clearTimeout(countdown);
    };
  }, [timeRemaining, timerActive]);
  
  useEffect(() => {
    if (quizQuestions.length > 0) {
      setTimerActive(true);
      setTimeRemaining(60);
    }
  }, [quizQuestions, activeProblemIndex]);

  const handleAnswerSelection = (option: string) => {
    setChosenAnswer(option);
    setRevealSolution(true);
    setTimerActive(false);
    
    if (option === quizQuestions[activeProblemIndex].correct_answer) {
      setScoreData(prev => ({ ...prev, correct: prev.correct + 1 }));
    }
    
    if (activeProblemIndex === quizQuestions.length - 1) {
      setTimeout(() => {
        setQuizCompleted(true);
        setShowConfetti(true);
      }, 1500);
    }
  };

  const handleNextProblem = () => {
    if (activeProblemIndex < quizQuestions.length - 1) {
      setAnimateQuestion(false);
      setTimeout(() => {
        setActiveProblemIndex(activeProblemIndex + 1);
        setChosenAnswer(null);
        setRevealSolution(false);
        setAnimateQuestion(true);
      }, 300);
    }
  };

  const handlePreviousProblem = () => {
    if (activeProblemIndex > 0) {
      setAnimateQuestion(false);
      setTimeout(() => {
        setActiveProblemIndex(activeProblemIndex - 1);
        setChosenAnswer(null);
        setRevealSolution(false);
        setAnimateQuestion(true);
      }, 300);
    }
  };
  
  const saveQuizToPDF = async () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const originalFileName = uploadedFile?.name?.split('.')[0] || 'quiz';

    try {
      // Set initial margins and line height
      const margin = 20;
      const lineHeight = 7;
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let y = margin;

      // Add title and metadata
      doc.setFontSize(16);
      doc.text("Quiz Results", margin, y);
      y += lineHeight * 2;

      doc.setFontSize(12);
      doc.text(`File: ${originalFileName}`, margin, y);
      y += lineHeight;
      doc.text(`Date: ${date}`, margin, y);
      y += lineHeight * 2;

      // Add score information
      doc.setFontSize(14);
      doc.text(`Score: ${scoreData.correct}/${scoreData.total}`, margin, y);
      y += lineHeight * 2;

      // Add questions
      doc.setFontSize(12);
      quizQuestions.forEach((question, index) => {
        // Check if we need a new page
        if (y > pageHeight - margin - (lineHeight * 10)) {
          doc.addPage();
          y = margin;
        }

        // Add question number and text
        const questionText = `Question ${index + 1}: ${question.question}`;
        const splitQuestion = doc.splitTextToSize(questionText, pageWidth - (margin * 2));
        doc.text(splitQuestion, margin, y);
        y += lineHeight * (splitQuestion.length + 1);

        // Add options
        question.options.forEach((option: string, optIndex: number) => {
          const prefix = String.fromCharCode(65 + optIndex);
          const isCorrect = option === question.correct_answer;
          const isChosen = option === chosenAnswer;
          
          doc.setFontSize(10);
          if (isCorrect) {
            doc.setTextColor(0, 128, 0); // Green for correct answer
          } else if (isChosen) {
            doc.setTextColor(255, 0, 0); // Red for wrong answer
          }
          
          const optionText = `${prefix}. ${option}`;
          const splitOption = doc.splitTextToSize(optionText, pageWidth - (margin * 2) - 20);
          doc.text(splitOption, margin + 10, y);
          y += lineHeight * splitOption.length;
          
          doc.setTextColor(0, 0, 0); // Reset color
        });

        // Add explanation
        y += lineHeight;
        doc.setFontSize(10);
        const explanationText = `Explanation: ${question.explanation}`;
        const splitExplanation = doc.splitTextToSize(explanationText, pageWidth - (margin * 2));
        doc.text(splitExplanation, margin, y);
        y += lineHeight * (splitExplanation.length + 2);

        // Add some space between questions
        y += lineHeight;
      });

      // Convert PDF to blob
      const pdfBlob = doc.output('blob');

      // Create FormData and append the PDF
      const formData = new FormData();
      formData.append('file', pdfBlob, `${originalFileName}_quiz.pdf`);
      formData.append('type', 'quiz');
      formData.append('content', JSON.stringify({
        score: scoreData,
        questions: quizQuestions,
        date: date
      }));
      formData.append('fileName', `${originalFileName}_quiz`);

      // Send to backend using the save-material endpoint
      const response = await axios.post('http://127.0.0.1:8000/api/save-material/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.status === 'success') {
        console.log('Quiz PDF saved successfully:', response.data.file_path);
      }
    } catch (error) {
      console.error('Error saving PDF:', error);
    }
  };

  const restartQuiz = async () => {
    if (quizCompleted) {
      await saveQuizToPDF();
    }
    setQuizCompleted(false);
    setShowConfetti(false);
    setQuizQuestions([]);
    setActiveProblemIndex(0);
    setChosenAnswer(null);
    setRevealSolution(false);
    setScoreData({ correct: 0, total: 0 });
    router.push("/deaf");
  };

  const currentQuestion = quizQuestions[activeProblemIndex];
  const cleanText = currentQuestion?.question?.replace(/[^a-zA-Z0-9\s]/g, "").trim() || "";
  
  return (
    <div className="quizMasterContainer">
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} />}
      
      <div className="quizInnerWrapper">
        <motion.h1 
          className="quizHeadline"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Intelligent Quiz Creator
        </motion.h1>

        {processingFile && (
          <motion.div 
            className="quizProcessingIndicator"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="quizSpinner"></div>
            <p>Analyzing your document and generating questions...</p>
          </motion.div>
        )}
        
        {uploadError && (
          <motion.div 
            className="quizErrorMessage"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>{uploadError}</p>
          </motion.div>
        )}

        {quizQuestions.length > 0 && !quizCompleted && !processingFile && (
          <div className="quizGamePanel">
            <div className="quizProgressTracker">
              <div className="quizProgressBar">
                <div 
                  className="quizProgressFill" 
                  style={{ width: `${(activeProblemIndex + 1) / quizQuestions.length * 100}%` }}
                ></div>
              </div>
              <span className="quizProgressText">
                Question {activeProblemIndex + 1} of {quizQuestions.length}
              </span>
              
              <div className="quizTimer">
                <div className="quizTimerCircle">
                  <CircularProgressbar
                    value={timeRemaining}
                    maxValue={60}
                    text={`${timeRemaining}`}
                    styles={buildStyles({
                      textSize: '30px',
                      pathTransitionDuration: 0.5,
                      pathColor: timeRemaining > 30 ? '#4caf50' : timeRemaining > 10 ? '#ff9800' : '#f44336',
                      textColor: timeRemaining > 30 ? '#4caf50' : timeRemaining > 10 ? '#ff9800' : '#f44336',
                      trailColor: '#d6d6d6',
                    })}
                  />
                </div>
              </div>
            </div>
            
            <AnimatePresence mode="wait">
              {animateQuestion && (
                <motion.div
                  key={activeProblemIndex}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                  className="quizQuestionContainer"
                >
                  <div className="quizContentGrid">
                    <div className="quizQuestionLeft">
                      <h2 className="quizQuestionText">{currentQuestion.question}</h2>
                      <div className="quizOptionsGrid">
                        {currentQuestion.options.map((option: string, index: number) => (
                          <motion.button
                            key={index}
                            className={`quizOptionButton ${
                              chosenAnswer
                                ? option === currentQuestion.correct_answer
                                  ? "quizCorrectOption"
                                  : chosenAnswer === option
                                  ? "quizWrongOption"
                                  : "quizNeutralOption"
                                : ""
                            }`}
                            onClick={() => !chosenAnswer && handleAnswerSelection(option)}
                            disabled={!!chosenAnswer}
                            whileHover={{ scale: chosenAnswer ? 1 : 1.02 }}
                            whileTap={{ scale: chosenAnswer ? 1 : 0.98 }}
                          >
                            <span className="quizOptionLetter">{String.fromCharCode(65 + index)}</span>
                            <span className="quizOptionText">{option}</span>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    <div className="quizAnimationRight">
                      <SignLanguageAnimation text={cleanText} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {revealSolution && (
              <motion.div 
                className="quizExplanationBox"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h3 className="quizExplanationHeading">
                  {chosenAnswer === quizQuestions[activeProblemIndex].correct_answer 
                    ? "Correct! 🎉" 
                    : "Not quite right"
                  }
                </h3>
                <div className="quizExplanationContent">
                  <p>{quizQuestions[activeProblemIndex].explanation}</p>
                </div>
              </motion.div>
            )}
            
            <div className="quizNavButtons">
              <motion.button
                className="quizNavButton quizPrevButton"
                onClick={handlePreviousProblem}
                disabled={activeProblemIndex === 0}
                whileHover={{ scale: activeProblemIndex === 0 ? 1 : 1.05 }}
                whileTap={{ scale: activeProblemIndex === 0 ? 1 : 0.95 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Previous
              </motion.button>
              
              {chosenAnswer && (
                <motion.button
                  className="quizNavButton quizNextButton"
                  onClick={handleNextProblem}
                  disabled={activeProblemIndex === quizQuestions.length - 1}
                  whileHover={{ scale: activeProblemIndex === quizQuestions.length - 1 ? 1 : 1.05 }}
                  whileTap={{ scale: activeProblemIndex === quizQuestions.length - 1 ? 1 : 0.95 }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  {activeProblemIndex === quizQuestions.length - 1 ? "Finish" : "Next"}
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                    <polyline points="12 5 19 12 12 19"></polyline>
                  </svg>
                </motion.button>
              )}
            </div>
          </div>
        )}
        
        {quizCompleted && (
          <motion.div 
            className="quizResultsPanel"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="quizResultsHeading">Quiz Completed!</h2>
            
            <div className="quizScoreDisplay">
              <div className="quizScoreCircle">
                <CircularProgressbar
                  value={(scoreData.correct / scoreData.total) * 100}
                  text={`${Math.round((scoreData.correct / scoreData.total) * 100)}%`}
                  styles={buildStyles({
                    textSize: '16px',
                    pathColor: 
                      (scoreData.correct / scoreData.total) >= 0.8 ? '#4caf50' : 
                      (scoreData.correct / scoreData.total) >= 0.6 ? '#8bc34a' : 
                      (scoreData.correct / scoreData.total) >= 0.4 ? '#ffeb3b' : 
                      '#f44336',
                    textColor: '#333',
                    trailColor: '#d6d6d6',
                  })}
                />
              </div>
              
              <div className="quizScoreDetails">
                <p>You scored <strong>{scoreData.correct}</strong> out of <strong>{scoreData.total}</strong></p>
                {(scoreData.correct / scoreData.total) >= 0.8 && <p className="quizPerformanceText">Excellent work! You've mastered this material.</p>}
                {(scoreData.correct / scoreData.total) >= 0.6 && (scoreData.correct / scoreData.total) < 0.8 && <p className="quizPerformanceText">Good job! You have a solid understanding.</p>}
                {(scoreData.correct / scoreData.total) >= 0.4 && (scoreData.correct / scoreData.total) < 0.6 && <p className="quizPerformanceText">Not bad! With a bit more study, you'll improve.</p>}
                {(scoreData.correct / scoreData.total) < 0.4 && <p className="quizPerformanceText">Keep practicing! You'll get better with time.</p>}
              </div>
            </div>
            
            <div className="quizActionButtons">
              <motion.button 
                className="quizRestartButton"
                onClick={restartQuiz}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Try Another Quiz
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default QuizExperience;