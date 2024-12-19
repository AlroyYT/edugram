import React, { useState } from 'react';
import axios from 'axios';

const Flashcards: React.FC = () => {
  const [flashcards, setFlashcards] = useState<{ question: string; answer: string }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const fetchFlashcards = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      const file = event.target.files?.[0];
      if (!file) {
        setErrorMessage('No file selected. Please upload a valid file.');
        return;
      }

      setSelectedFileName(file.name); // Set the selected file name

      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(
        'http://127.0.0.1:8000/api/generate-flashcards/',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.flashcards && response.data.flashcards.length > 0) {
        setFlashcards(response.data.flashcards);
        setCurrentIndex(0);
      } else {
        setErrorMessage('No flashcards generated. Please check the file content.');
      }

      event.target.value = ''; // Reset the file input
    } catch (error) {
      console.error('Error generating flashcards:', error);
      setErrorMessage('Failed to generate flashcards. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  return (
    <div className="flashcards-container">
      <h1 className="title">Flashcards</h1>

      <div className="upload-section">
        {/* Choose file button */}
        <label htmlFor="file-upload" className="file-upload-label">
          Choose a File
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".pdf,.pptx"
          onChange={fetchFlashcards}
          disabled={isLoading}
          className="file-input"
          style={{ display: 'none' }}  // Hide the default file input
        />

        {/* Display the selected file name */}
        {selectedFileName && <p>Selected file: {selectedFileName}</p>}

        {isLoading && <p className="loading-text">Loading flashcards...</p>}
        {errorMessage && <p className="error-text">{errorMessage}</p>}
      </div>

      {/* Display flashcards */}
      {flashcards.length > 0 && !isLoading ? (
        <div className="flashcard-card">
          <h2 className="flashcard-question">{flashcards[currentIndex].question}</h2>
          <p className="flashcard-answer">{flashcards[currentIndex].answer}</p>
          <div className="navigation-buttons">
            <button onClick={handlePrevious} disabled={currentIndex === 0} className="nav-btn">
              Previous
            </button>
            <button onClick={handleNext} disabled={currentIndex === flashcards.length - 1} className="nav-btn">
              Next
            </button>
          </div>
          <p className="flashcard-info">
            Flashcard {currentIndex + 1} of {flashcards.length}
          </p>
        </div>
      ) : (
        !isLoading && <p>No flashcards available. Please upload a valid file.</p>
      )}
    </div>
  );
};

export default Flashcards;
