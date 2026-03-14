import React, { useState } from "react";
import axios from "axios";
import { useTranslation } from 'react-i18next';
import { backend_url } from '../components/config';

const SearchByTopic: React.FC = () => {
  const [topic, setTopic] = useState("");
  const [videoURL, setVideoURL] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleSearch = async () => {
    if (!topic.trim()) {
      alert(t("enter_topic_alert"));
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
      setError(t("video_error"));
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
        <h2>{t("search_by_topic")}</h2>
        <p>{t("enter_topic_prompt")}</p>
        <div className="search-topic-bar">
          <input
            type="text"
            placeholder={t("enter_topic_placeholder")}
            className="search-topic-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <button
            className="search-topic-button"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? t("loading") : <i className="search-icon">&#128269;</i>}
          </button>
        </div>

        <div className="video-display-box">
          {loading && <p>{t("generating_video")}</p>}
          {error && <p className="error-message">{error}</p>}
          {videoURL && (
            <video
              controls
              autoPlay
              className="video-player"
              key={videoURL}
            >
              <source src={videoURL} type="video/mp4" />
              {t("browser_no_video")}
            </video>
          )}
          {!loading && !videoURL && !error && (
            <p className="video-placeholder">{t("video_placeholder")}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchByTopic;