import React, { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { useFileContext } from "../context/FileContext";

import { backend_url } from '../components/config';


const DeafSupportHub = () => {
  const [activeSection, setActiveSection] = useState<string>("documentPortal");
  const [assetLabel, setAssetLabel] = useState<string>("");
  const [processStatus, setProcessStatus] = useState<string>("");
  const [animatedView, setAnimatedView] = useState<boolean>(false);
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [notificationText, setNotificationText] = useState<string>("");
  const [savedMaterials, setSavedMaterials] = useState<any[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
  const { uploadedFile, setUploadedFile } = useFileContext();

  const navigator = useRouter();

  useEffect(() => {
    // Initial animation
    const timer = setTimeout(() => {
      setAnimatedView(true);
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  const displayNotification = (message: string) => {
    setNotificationText(message);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  const handleAssetSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFile(e.target.files[0]);
      setAssetLabel(e.target.files[0].name);
      displayNotification(`Selected: ${e.target.files[0].name}`);
    }
  };

  const handleAssetUpload = async () => {
    if (!uploadedFile) {
      displayNotification("Please select a file first");
      return;
    }
    
    setProcessStatus("Processing...");
    displayNotification("File uploaded successfully");
    setProcessStatus("");
  };

  const launchQuizModule = () => {
    if (!uploadedFile) {
      displayNotification("Please upload a file first");
      return;
    }
    navigator.push("/quizz");
  };

  const generateDocSummary = async () => {
    if (!uploadedFile) {
      displayNotification("Please upload a file first");
      return;
    }

    setProcessStatus("Generating summary...");
    
    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      const response = await axios.post(
        `${backend_url}/api/summarize/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setProcessStatus("");
      navigator.push({
        pathname: "/summary",
        query: { summary: response.data.summary },
      });
    } catch (error) {
      setProcessStatus("");
      displayNotification("Summary generation failed");
      console.error(error);
    }
  };

  const launchFlashcardModule = () => {
    if (!uploadedFile) {
      displayNotification("Please upload a file first");
      return;
    }
    navigator.push("/flash");
  };

  const fetchSavedMaterials = async () => {
    setIsLoadingMaterials(true);
    try {
      const response = await axios.get(`${backend_url}/api/saved-materials/`);
      setSavedMaterials(response.data.materials);
    } catch (error) {
      console.error('Error fetching saved materials:', error);
      displayNotification('Failed to load saved materials');
    } finally {
      setIsLoadingMaterials(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'savedBookmarks') {
      fetchSavedMaterials();
    }
  }, [activeSection]);

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      setProcessStatus("Downloading...");
      
      // Log the download attempt
      console.log('Attempting to download file:', fileName);
      
      // Use the download endpoint instead of direct media URL
      const response = await axios({
        method: 'get',
        url: `${backend_url}/api/download/${encodeURIComponent(fileName)}/`,
        responseType: 'blob',
        headers: {
          'Accept': 'application/pdf,application/octet-stream',
        }
      });
      
      // Create a blob from the response data
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      displayNotification('File downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading file:', error);
      if (error.response) {
        displayNotification(error.response.data.message || 'Failed to download file');
      } else if (error.request) {
        displayNotification('No response from server. Please check your connection.');
      } else {
        displayNotification(error.message || 'Failed to download file');
      }
    } finally {
      setProcessStatus("");
    }
  };

  const handleDelete = async (material: any) => {
  if (!material || !material.fileName) {
    displayNotification('Invalid material');
    return;
  }
  
  setProcessStatus("Deleting...");
  
  try {
    // Simple axios DELETE request
    const response = await axios.delete(
      `${backend_url}/api/saved-materials/${encodeURIComponent(material.fileName)}/`
    );
    
    console.log('Delete response:', response.data);
    
    // Update local state
    setSavedMaterials(prevMaterials => 
      prevMaterials.filter(m => m.fileName !== material.fileName)
    );
    displayNotification('Material deleted successfully');
    
  } catch (error: any) {
    console.error('Delete error:', error);
    if (error.response) {
      displayNotification(`Error: ${error.response.status} - ${error.response.data?.message || 'Delete failed'}`);
    } else {
      displayNotification('Network error - please try again');
    }
  } finally {
    setProcessStatus("");
  }
};
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  const cardVariants = {
    rest: { scale: 1, boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)" },
    hover: { 
      scale: 1.05, 
      boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
      transition: { type: "spring", stiffness: 400, damping: 10 }
    }
  };

  const renderContentPanel = () => {
    switch (activeSection) {
      case "topicExplorer":
        return (
          <motion.div 
            className="content-explorer"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.h2 variants={itemVariants} className="content-title">
              Explore by Topic
            </motion.h2>
            <motion.div variants={itemVariants} className="search-container">
              <input 
                type="text" 
                placeholder="Search topics..." 
                className="topic-search-input"
              />
              <button className="topic-search-button">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
              </button>
            </motion.div>
            <motion.div variants={itemVariants} className="topic-categories">
              <div className="category-row">
                {["Mathematics", "Science", "History", "Language"].map((category) => (
                  <motion.div 
                    key={category}
                    className="category-card"
                    variants={cardVariants}
                    initial="rest"
                    whileHover="hover"
                  >
                    {category}
                  </motion.div>
                ))}
              </div>
              <div className="category-row">
                {["Computing", "Arts", "Engineering", "Social Studies"].map((category) => (
                  <motion.div 
                    key={category}
                    className="category-card"
                    variants={cardVariants}
                    initial="rest"
                    whileHover="hover"
                  >
                    {category}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        );
      
      case "savedBookmarks":
        return (
          <motion.div 
            className="bookmarks-panel"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.h2 variants={itemVariants} className="content-title">
              Your Saved Materials
            </motion.h2>
            
            {isLoadingMaterials ? (
              <motion.div 
                className="loading-state"
                variants={itemVariants}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="loading-spinner"></div>
                <p>Loading your materials...</p>
              </motion.div>
            ) : savedMaterials.length > 0 ? (
              <motion.div 
                className="materials-grid"
                variants={itemVariants}
              >
                {savedMaterials.map((material, index) => (
                  <motion.div
                  key={material.id}
                  className="material-card"
                  variants={cardVariants}
                  initial="rest"
                  whileHover="hover"
                  custom={index}
                >
                  <div className="material-icon">
                    {/* Your existing icon code */}
                  </div>
                  <div className="material-info">
                    <h3>{material.fileName}</h3>
                    <p className="material-type">{material.type.charAt(0).toUpperCase() + material.type.slice(1)}</p>
                    <p className="material-date">{new Date(material.date).toLocaleDateString()}</p>
                  </div>
                  <div className="material-actions">
                    <button 
                      onClick={() => handleDownload(material.filePath, material.fileName)}
                      className="download-button"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Download
                    </button>
                    <button 
                      onClick={() => handleDelete(material)}
                      className="delete-button"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                      </svg>
                      Delete
                    </button>
                  </div>
                </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                className="empty-state"
                variants={itemVariants}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="empty-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
                  </svg>
                </div>
                <p>No saved materials yet. Your generated content will appear here.</p>
                <button className="action-button" onClick={() => setActiveSection("documentPortal")}>
                  Generate Content
                </button>
              </motion.div>
            )}
          </motion.div>
        );
      
      case "documentPortal":
      default:
        return (
          <motion.div 
            className="document-portal"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.h2 variants={itemVariants} className="content-title">
              Knowledge Portal
            </motion.h2>
            
            <motion.div variants={itemVariants} className="upload-container">
              <div className="file-drop-area">
                <div className="file-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                    <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                  </svg>
                </div>
                <h3>Upload Your Document</h3>
                <p>Drop your file here or click to browse</p>
                <label htmlFor="file-upload" className="file-upload-button">
                  Select File
                </label>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden-file-input"
                  onChange={handleAssetSelection}
                />
                {assetLabel && (
                  <div className="selected-file">
                    <span className="file-name">{assetLabel}</span>
                    <button className="upload-now-button" onClick={handleAssetUpload}>
                      Upload Now
                    </button>
                  </div>
                )}
                {processStatus && <p className="process-status">{processStatus}</p>}
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants} className="learning-tools">
              <motion.div 
                className="tool-card"
                variants={cardVariants}
                initial="rest"
                whileHover="hover"
                onClick={launchQuizModule}
              >
                <div className="tool-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
                    <path d="M8.646 6.646a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L10.293 9 8.646 7.354a.5.5 0 0 1 0-.708zm-1.292 0a.5.5 0 0 0-.708 0l-2 2a.5.5 0 0 0 0 .708l2 2a.5.5 0 0 0 .708-.708L5.707 9l1.647-1.646a.5.5 0 0 0 0-.708z"/>
                  </svg>
                </div>
                <h4>Interactive Quiz</h4>
                <p>Practice with multiple choice questions generated from your material</p>
              </motion.div>
              
              <motion.div 
                className="tool-card"
                variants={cardVariants}
                initial="rest"
                whileHover="hover"
                onClick={generateDocSummary}
              >
                <div className="tool-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/>
                  </svg>
                </div>
                <h4>Smart Summary</h4>
                <p>Get a concise summary of key points from your document</p>
              </motion.div>
              
              <motion.div 
                className="tool-card"
                variants={cardVariants}
                initial="rest"
                whileHover="hover"
                onClick={launchFlashcardModule}
              >
                <div className="tool-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm8.93 4.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM8 5.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
                  </svg>
                </div>
                <h4>Memory Flashcards</h4>
                <p>Create interactive flashcards to reinforce learning</p>
              </motion.div>
            </motion.div>
          </motion.div>
        );
    }
  };

  return (
    <div className="learningHub-masterContainer">
      {/* Animated notification */}
      <AnimatePresence>
        {showNotification && (
          <motion.div 
            className="floating-notification"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
          >
            {notificationText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* App header */}
      <motion.header 
        className="appHeader"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 10 }}
      >
        <div className="header-content">
          <div className="logo-container">
            <div className="logo-pulse"></div>
            <h1>AccessLearn Hub</h1>
          </div>
          <nav className="headerNav">
            
            <button className="nav-button active">Learning Hub</button>
            
            <button className="nav-button">Accessibility Tools</button>
            <button className="nav-button" onClick={() => navigator.push("/sign2")}>Sign Language Resources</button>
          </nav>
          <div className="user-actions">
            <button className="theme-toggle">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
              </svg>
            </button>
            <button className="profile-button">
              <div className="avatar"></div>
            </button>
          </div>
        </div>
      </motion.header>

      <div className="appBody">
        {/* Side navigation */}
        <motion.aside 
          className="navSidebar"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
        >
          <div className="sidebar-header">
            <div className="status-indicator"></div>
            <span>Learning Tools</span>
          </div>
          
          <ul className="nav-options">
            <motion.li 
              whileHover={{ x: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <button 
                className={`nav-item ${activeSection === "topicExplorer" ? "active" : ""}`}
                onClick={() => setActiveSection("topicExplorer")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                <span>Topic Explorer</span>
              </button>
            </motion.li>
            
            <motion.li 
              whileHover={{ x: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <button 
                className={`nav-item ${activeSection === "savedBookmarks" ? "active" : ""}`}
                onClick={() => setActiveSection("savedBookmarks")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M2 2v13.5a.5.5 0 0 0 .74.439L8 13.069l5.26 2.87A.5.5 0 0 0 14 15.5V2a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/>
                </svg>
                <span>Saved Materials</span>
              </button>
            </motion.li>
            
            <motion.li 
              whileHover={{ x: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              <button 
                className={`nav-item ${activeSection === "documentPortal" ? "active" : ""}`}
                onClick={() => setActiveSection("documentPortal")}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M14.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h13zm-13-1A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13z"/>
                  <path d="M3 5.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zM3 8a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9A.5.5 0 0 1 3 8zm0 2.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z"/>
                </svg>
                <span>Document Portal</span>
              </button>
            </motion.li>
          </ul>
          
          <div className="sidebar-footer">
            <div className="usage-stats">
              <span>Storage</span>
              <div className="progress-bar">
                <div className="progress" style={{ width: "35%" }}></div>
              </div>
              <span className="usage-text">35% used</span>
            </div>
          </div>
        </motion.aside>

        {/* Main content area */}
        <main className="mainContent">
          {renderContentPanel()}
        </main>
        
        {/* Right sidebar - Recommendations */}
        <motion.aside 
          className="recommendPanel"
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100, delay: 0.4 }}
        >
          <h3 className="panel-title">Personalized For You</h3>
          
          <div className="recommendation-list">
            <motion.div 
              className="recommendation-item"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.03 }}
            >
              <div className="rec-icon study"></div>
              <div className="rec-content">
                <h4>Study Guide: Accessibility</h4>
                <p>Best practices for deaf-friendly learning</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="recommendation-item"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.03 }}
            >
              <div className="rec-icon video"></div>
              <div className="rec-content">
                <h4>ASL Tutorial Videos</h4>
                <p>Learn common educational phrases</p>
              </div>
            </motion.div>
            
            <motion.div 
              className="recommendation-item"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.03 }}
            >
              <div className="rec-icon community"></div>
              <div className="rec-content">
                <h4>Learning Community</h4>
                <p>Connect with other students</p>
              </div>
            </motion.div>
          </div>
          
          <div className="upcoming-events">
            <h3 className="panel-subtitle">Upcoming Sessions</h3>
            
            <motion.div 
              className="event-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="event-date">
                <span className="day">15</span>
                <span className="month">APR</span>
              </div>
              <div className="event-info">
                <h4>ASL Study Group</h4>
                <p>Virtual · 3:00 PM</p>
              </div>
            </motion.div>
          </div>
        </motion.aside>
        

      </div>
    </div>
    
  );
};

export default DeafSupportHub;