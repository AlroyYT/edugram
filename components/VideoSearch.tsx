// components/VideoSearch.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";

// Define types for video results
interface VideoResult {
  id: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  description: string;
}

interface VideoSearchProps {
  initialQuery?: string;
}

const VideoSearch: React.FC<VideoSearchProps> = ({ initialQuery = "" }) => {
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<VideoResult[]>([]);
  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [notificationText, setNotificationText] = useState<string>("");

  useEffect(() => {
    if (initialQuery) {
      setSearchQuery(initialQuery);
      handleSearch();
    }
  }, [initialQuery]);

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

  const displayNotification = (message: string) => {
    setNotificationText(message);
    setShowNotification(true);
    setTimeout(() => {
      setShowNotification(false);
    }, 3000);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      displayNotification("Please enter a search term");
      return;
    }

    try {
      setIsSearching(true);
      
      // Make API call to your Django backend
      const response = await axios.get("https://edugram-574544346633.asia-south1.run.app/api/youtube-search/", {
        params: {
          query: searchQuery + " tutorial",
          max_results: 6
        }
      });
      
      setSearchResults(response.data.items);
      setIsSearching(false);
    } catch (error) {
      console.error("Error searching videos:", error);
      displayNotification("Failed to fetch video results");
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <motion.div 
      className="video-search-container"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants} className="search-box">
        <input 
          type="text" 
          placeholder="Search for educational videos..." 
          className="video-search-input"
          value={searchQuery}
          onChange={handleSearchInputChange}
          onKeyPress={handleKeyPress}
        />
        <button 
          className="video-search-button"
          onClick={handleSearch}
          disabled={isSearching}
          aria-label="Search videos"
        >
          {isSearching ? (
            <span className="loading-spinner"></span>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
          )}
        </button>
      </motion.div>

      {/* YouTube Video Results */}
      {searchResults.length > 0 && (
        <motion.div 
          className="video-results-container"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="results-title">Educational Videos for "{searchQuery}"</h3>
          <div className="video-grid">
            {searchResults.map((video) => (
              <motion.div 
                key={video.id}
                className="video-card"
                whileHover={{ 
                  scale: 1.05, 
                  boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)" 
                }}
                onClick={() => window.open(`https://www.youtube.com/watch?v=${video.id}`, '_blank')}
              >
                <div className="video-thumbnail">
                  <img src={video.thumbnail} alt={video.title} />
                  <div className="play-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                      <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                    </svg>
                  </div>
                </div>
                <div className="video-info">
                  <h4 className="video-title">{video.title}</h4>
                  <p className="video-channel">{video.channelTitle}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* No results message */}
      {searchQuery && !isSearching && searchResults.length === 0 && (
        <motion.div 
          className="no-results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p>No videos found for "{searchQuery}". Try another search term.</p>
        </motion.div>
      )}

      {/* Notification component */}
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
    </motion.div>
  );
};

export default VideoSearch;