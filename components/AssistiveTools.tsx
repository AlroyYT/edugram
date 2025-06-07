import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import SearchByTopic from "./SearchByTopic"; 
import { BACKEND_URL } from "./config"; 

const AssistiveTools = () => {
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
        `${BACKEND_URL}/api/upload/`, // Your Django API URL for file upload
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
    if (!file) {
      setUploadStatus("Error: No file selected for MCQs generation");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/generate-mcqs/`, // Your API endpoint for MCQs
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      router.push("/mcqs"); // Navigate to the MCQs page after generation
    } catch (error) {
      setUploadStatus("Error generating MCQs");
      console.error(error);
    }
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
        `${BACKEND_URL}/api/summarize/`, // Your API endpoint for summarization
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
    if (!file) {
      setUploadStatus("Error: No file selected for flashcards generation");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        `${BACKEND_URL}/api/generate-flashcards/`, // Your API endpoint for flashcards
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      router.push("/flash"); // Navigate to the flashcards page after generation
    } catch (error) {
      setUploadStatus("Error generating flashcards");
      console.error(error);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case "searchByTopic":
        return <SearchByTopic />; // Show SearchByTopic content
      case "transcription":
        return (
          <div className="upload-interface">
            <h3>Upload an audio or video file to get transcription</h3>
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
          </div>
        );
      default:
        return <p>Unknown view</p>;
    }
  };

  return (
    <div className="study-upload-container">
      <div className="header">
        <span>Welcome to Assistive Tools</span>
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
            Audio/Video Transcriber
          </button>
          <button className="sidebar-btn">Voice-to-Gesture</button>
          <button className="sidebar-btn" onClick={() => setCurrentView("transcription")}>
            Sign Language Dictionary
          </button>
        </div>
      </div>

      <div className="upload-content">{renderContent()}</div>

    </div>
  );
};

export default AssistiveTools;