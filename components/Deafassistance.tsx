import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import SearchByTopic from "./SearchByTopic"; 

const StudyUpload = () => {
  const [currentView, setCurrentView] = useState<string>("default"); // Track which view to show
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");

  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setFileName(e.target.files[0].name); // Display the file name
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus("Error: No file selected");
      return;
    }
    setUploadStatus("Uploading...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/upload/", // Your Django API URL for file upload
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setUploadStatus("Successfully uploaded");
    } catch (error) {
      setUploadStatus("Error in uploading");
      console.error(error);
    }
  };

  const handleGenerateMCQs = async () => {
    router.push("/quizz");
  };

  const handleSummarize = async () => {
    if (!file) {
      setUploadStatus("Error: No file selected for summarization");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/summarize/", // Your API endpoint for summarization
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      router.push({
        pathname: "/summary", // Navigate to the summary page
        query: { summary: response.data.summary }, // Pass the summary as query param
      });
    } catch (error) {
      setUploadStatus("Error generating summary");
      console.error(error);
    }
  };

  const handleGenerateFlashcards = async () => {
    router.push("/flash");
  };

  const renderContent = () => {
    switch (currentView) {
      case "searchByTopic":
        return <SearchByTopic />; // Show SearchByTopic content
      case "docs":
        return (
          <div className="upload-interface">
            <h3>Submit Your Document</h3>
            <label htmlFor="file-upload" className="custom-file-upload">
              Choose File
            </label>
            <input
              id="file-upload"
              type="file"
              className="file-input"
              onChange={handleFileChange}
            />
            <br />
            {fileName && <p>Selected File: {fileName}</p>} {/* Display selected file name */}
            <br />
            <button className="upload-action-btn" onClick={handleUpload}>
              Upload
            </button>
            {uploadStatus && <p className="upload-status">{uploadStatus}</p>}

            <div className="upload-tools">
              <div className="tool-card">
                <button className="tool-btn" onClick={handleGenerateMCQs}>
                  Practice MCQs
                </button>
              </div>
              <div className="tool-card">
                <button className="tool-btn" onClick={handleSummarize}>
                  Summarize
                </button>
              </div>
              <div className="tool-card">
                <button className="tool-btn" onClick={handleGenerateFlashcards}>
                  Create Flashcards
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return <p>Unknown view</p>;
    }
  };

  return (
    <div className="study-upload-container">
      <div className="header">
        <span>Welcome to Your Learning Hub</span>
      </div>

      <div className="upload-sidebar">
        <div className="sidebar-title">
          <div className="status-indicator"></div>
          <span>Learning Panel</span>
        </div>
        <div className="sidebar-buttons">
          <button
            className="sidebar-btn"
            onClick={() => setCurrentView("searchByTopic")}
          >
            Search by Topic
          </button>
          <button className="sidebar-btn">Bookmarks</button>
          <button className="sidebar-btn" onClick={() => setCurrentView("docs")}>
            Document Upload
          </button>
        </div>
      </div>

      <div className="upload-content">{renderContent()}</div>

      <div className="recommendations-panel">
        <span>Suggestions</span>
      </div>
    </div>
  );
};

export default StudyUpload;