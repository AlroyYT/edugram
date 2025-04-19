import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";

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

  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setProcessingFile(true);
    setUploadError(null);

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

  const handleAnswerSelection = (option: string) => {
    setChosenAnswer(option);
    setRevealSolution(true);
    setTimerActive(false);
    
    // Update score
    if (option === quizQuestions[activeProblemIndex].correct_answer) {
      setScoreData(prev => ({ ...prev, correct: prev.correct + 1 }));
    }
    
    // Check if quiz is completed
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
  
  const restartQuiz = () => {
    setQuizCompleted(false);
    setShowConfetti(false);
    setQuizQuestions([]);
    setActiveProblemIndex(0);
    setChosenAnswer(null);
    setRevealSolution(false);
    setScoreData({ correct: 0, total: 0 });
  };

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

        {/* File Upload Section */}
        {!quizQuestions.length && (
          <motion.div 
            className="quizUploadPanel"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="quizUploadContent">
              <h2>Transform Your PDF into an Interactive Quiz</h2>
              <p>Upload your document and get instant quiz questions with explanations.</p>
              
              <label className="quizFileInputLabel">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleDocumentUpload}
                  className="quizFileInput"
                />
                <span className="quizUploadButton">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Select PDF
                </span>
              </label>
              
              {processingFile && (
                <div className="quizProcessingIndicator">
                  <div className="quizSpinner"></div>
                  <p>Analyzing your document and generating questions...</p>
                </div>
              )}
              
              {uploadError && (
                <div className="quizErrorMessage">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                  <p>{uploadError}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Quiz Section */}
        {quizQuestions.length > 0 && !quizCompleted && (
          <div className="quizGamePanel">
            {/* Progress Bar */}
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
            
            {/* Question */}
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
                  <h2 className="quizQuestionText">{quizQuestions[activeProblemIndex].question}</h2>
                  
                  {/* Answer Options */}
                  <div className="quizOptionsGrid">
                    {quizQuestions[activeProblemIndex].options.map((option: string, index: number) => (
                      <motion.button
                        key={index}
                        className={`quizOptionButton ${
                          chosenAnswer
                            ? option === quizQuestions[activeProblemIndex].correct_answer
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
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <span className="quizOptionLetter">{String.fromCharCode(65 + index)}</span>
                        <span className="quizOptionText">{option}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Answer Explanation */}
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
            
            {/* Navigation Buttons */}
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
        
        {/* Quiz Completion Screen */}
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
              
              <motion.button 
                className="quizShareButton"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                Share Results
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default QuizExperience;