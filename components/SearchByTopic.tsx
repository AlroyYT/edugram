import React, { useState } from "react";
import axios from "axios";
import { backend_url } from '../components/config';
const SearchByTopic: React.FC = () => {
  const [topic, setTopic] = useState("");
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!topic.trim()) {
      alert("Please enter a topic name");
      return;
    }
    setLoading(true);
    setError(null);
    setVideoURL(null);

    try {
      console.log("Making request for topic:", topic);
      
      const response = await axios.get(`${backend_url}/api/search-topic/`, {
        params: { topic },
        responseType: 'blob'
      });

      console.log("Response received:", response);
      
      const videoBlob = new Blob([response.data], { type: 'video/mp4' });
      const url = URL.createObjectURL(videoBlob);
      console.log("Created video URL:", url);
      setVideoURL(url);

    } catch (error) {
      console.error("Error:", error);
      setError("An error occurred while getting the video");
    } finally {
      setLoading(false);
    }
  };

  // Clean up blob URL when component unmounts
  React.useEffect(() => {
    return () => {
      if (videoURL) {
        URL.revokeObjectURL(videoURL);
      }
    };
  }, [videoURL]);

  return (
    <div className="search-topic-container">
      <div className="search-box">
        <h2>Search by Topic</h2>
        <p>Please enter the topic name you want to learn:</p>
        <div className="search-topic-bar">
          <input
            type="text"
            placeholder="Enter topic name"
            className="search-topic-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <button 
            className="search-topic-button" 
            onClick={handleSearch} 
            disabled={loading}
          >
            {loading ? "Loading..." : <i className="search-icon">&#128269;</i>}
          </button>
        </div>

        <div className="video-display-box">
          {loading && <p>Generating video, please wait...</p>}
          {error && <p className="error-message">{error}</p>}
          {videoURL && (
            <video 
              controls
              autoPlay
              className="video-player"
              key={videoURL}
            >
              <source src={videoURL} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
          {!loading && !videoURL && !error && (
            <p className="video-placeholder">Video will appear here after generation</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchByTopic;