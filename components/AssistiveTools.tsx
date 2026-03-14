import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { useTranslation } from 'react-i18next';
import SearchByTopic from "./SearchByTopic";

const AssistiveTools = () => {
  const [currentView, setCurrentView] = useState<string>("default"); // Track which view to show
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const { t } = useTranslation();

  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setFileName(e.target.files[0].name); // Display the file name
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus(t("no_file_selected"));
      return;
    }
    setUploadStatus(t("uploading"));

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
      setUploadStatus(t("upload_success"));
    } catch (error) {
      setUploadStatus(t("upload_error"));
      console.error(error);
    }
  };

  const handleGenerateMCQs = async () => {
    if (!file) {
      setUploadStatus(t("no_file_mcqs"));
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
      setUploadStatus(t("error_mcqs"));
      console.error(error);
    }
  };

  const handleSummarize = async () => {
    if (!file) {
      setUploadStatus(t("no_file_summary"));
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
      setUploadStatus(t("error_summary"));
      console.error(error);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (!file) {
      setUploadStatus(t("no_file_flashcards"));
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
      setUploadStatus(t("error_flashcards"));
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
            <h3>{t("upload_transcription")}</h3>
            <label htmlFor="file-upload" className="custom-file-upload">
              {t("choose_file")}
            </label>
            <input
              id="file-upload"
              type="file"
              className="file-input"
              onChange={handleFileChange}
            />
            <br />
            {fileName && <p>{t("selected_file")} {fileName}</p>} {/* Display selected file name */}
            <br />
            <button className="upload-action-btn" onClick={handleUpload}>
              {t("upload")}
            </button>
            {uploadStatus && <p className="upload-status">{uploadStatus}</p>}
          </div>
        );
      default:
        return <p>{t("unknown_view")}</p>;
    }
  };

  return (
    <div className="study-upload-container">
      <div className="header">
        <span>{t("welcome_assistive")}</span>
      </div>

      <div className="upload-sidebar">
        <div className="sidebar-title">
          <div className="status-indicator"></div>
          <span>{t("learning_panel")}</span>
        </div>
        <div className="sidebar-buttons">
          <button
            className="sidebar-btn"
            onClick={() => setCurrentView("searchByTopic")}
          >
            {t("audio_video_transcriber")}
          </button>
          <button className="sidebar-btn">{t("voice_to_gesture")}</button>
          <button className="sidebar-btn" onClick={() => setCurrentView("transcription")}>
            {t("sign_language_dictionary")}
          </button>
        </div>
      </div>

      <div className="upload-content">{renderContent()}</div>

    </div>
  );
};

export default AssistiveTools;