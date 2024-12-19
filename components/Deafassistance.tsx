  import React, { useState } from "react";
  import axios from "axios";
  import { useRouter } from "next/router";

  const StudyUpload = () => {
    const [showSubjects, setShowSubjects] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [uploadStatus, setUploadStatus] = useState<string>("");
    const [fileName, setFileName] = useState<string>("");

    const router = useRouter();

    const toggleSubjects = () => {
      setShowSubjects((prev) => !prev);
    };

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
        // Send the file to the backend API
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
      if (!file) {
        setUploadStatus("Error: No file selected for MCQs generation");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await axios.post(
          "http://127.0.0.1:8000/api/generate-mcqs/", // Your API endpoint for MCQs
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
          "http://127.0.0.1:8000/api/summarize/", // Your API endpoint for summarization
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        // Navigate to the summary page and pass the summary via query
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
          "http://127.0.0.1:8000/api/generate-flashcards/", // Your API endpoint for flashcards
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

    return (
      <div className="study-upload-container">
        <div className="header">
          <span>Welcome to Your Learning Panel</span>
        </div>

        <div className="upload-sidebar">
          <div className="sidebar-title">
            <div className="status-indicator"></div>
            <span>Learning Panel</span>
          </div>
          <div className="sidebar-buttons">
            <button className="sidebar-btn" onClick={toggleSubjects}>
              Categories
            </button>
            {showSubjects && (
              <ul className="subjects-list">
                <li>Physics</li>
                <li>Chemistry</li>
                <li>Mathematics</li>
                <li>Biology</li>
                <li>History</li>
                <li>Economics</li>
              </ul>
            )}
            <button className="sidebar-btn">Progress Overview</button>
            <button className="sidebar-btn">Bookmarks</button>
            <button className="sidebar-btn">Document Upload</button>
          </div>
        </div>

        <div className="upload-content">
          <div className="upload-search">
            <input
              type="text"
              placeholder="Search"
              className="upload-searchbar"
            />
            <button className="search-btn">
              Search
            </button>
          </div>

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

          <div className="content-footer">
            <span>Back to Home</span>
            <span>Support</span>
            <span>Contact</span>
          </div>
        </div>

        <div className="recommendations-panel">
          <span>Suggestions</span>
        </div>
      </div>
    );
  };

  export default StudyUpload;
