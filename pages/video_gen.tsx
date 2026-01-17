"use client";

import { useState, useEffect } from "react";
import { backend_url } from "@/components/config";

interface Video {
  id: number;
  topic: string;
  filename: string;
  video_url: string;
  created_at: string;
  duration: number | null;
}

export default function Home() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch all videos on component mount
  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const response = await fetch(`${backend_url}/api/videos/`);
      if (response.ok) {
        const data = await response.json();
        setVideos(data);
      }
    } catch (err) {
      console.error("Failed to fetch videos:", err);
    }
  };

  const handleGenerateVideo = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${backend_url}/api/generate-video/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Video generation failed");
      }

      const data = await response.json();
      
      // Add new video to the list
      setVideos([data.video, ...videos]);
      setTopic(""); // Clear input
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVideo = async (videoId: number) => {
    if (!confirm("Are you sure you want to delete this video?")) {
      return;
    }

    try {
      const response = await fetch(`${backend_url}/api/videos/${videoId}/`, {
        method: "DELETE",
      });

      if (response.ok) {
        setVideos(videos.filter((v) => v.id !== videoId));
      }
    } catch (err) {
      console.error("Failed to delete video:", err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <main style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1>🎥 AI Educational Video Generator</h1>
      <p>
        Generates script, images, voiceover, and stitches them into a video.
      </p>

      <div style={{ marginTop: "20px", marginBottom: "40px" }}>
        <input
          type="text"
          placeholder="Enter a topic (e.g. Black Holes)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleGenerateVideo()}
          style={{
            padding: "12px",
            width: "70%",
            marginRight: "10px",
            fontSize: "16px",
            borderRadius: "4px",
            border: "1px solid #ccc",
          }}
        />

        <button
          onClick={handleGenerateVideo}
          disabled={loading}
          style={{
            padding: "12px 24px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "16px",
            borderRadius: "4px",
            border: "none",
            backgroundColor: loading ? "#ccc" : "#007bff",
            color: "white",
          }}
        >
          {loading ? "Generating..." : "Generate Video"}
        </button>
      </div>

      {loading && (
        <p style={{ marginTop: "15px", color: "#007bff" }}>
          ⏳ Processing… this may take a few minutes.
        </p>
      )}

      {error && (
        <p style={{ color: "red", marginTop: "15px" }}>❌ {error}</p>
      )}

      <hr style={{ margin: "40px 0" }} />

      <h2>📚 Video Library ({videos.length})</h2>

      {videos.length === 0 && !loading && (
        <p style={{ color: "#666", fontStyle: "italic" }}>
          No videos generated yet. Create your first video above!
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
          gap: "20px",
          marginTop: "20px",
        }}
      >
        {videos.map((video) => (
          <div
            key={video.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: "8px",
              padding: "15px",
              backgroundColor: "#f9f9f9",
            }}
          >
            <h3 style={{ marginTop: 0, fontSize: "18px" }}>{video.topic}</h3>
            
            <video
              src={video.video_url}
              controls
              style={{
                width: "100%",
                borderRadius: "6px",
                marginBottom: "10px",
              }}
            />

            <div style={{ fontSize: "14px", color: "#666" }}>
              <p style={{ margin: "5px 0" }}>
                📅 {formatDate(video.created_at)}
              </p>
              <p style={{ margin: "5px 0" }}>
                ⏱️ Duration: {formatDuration(video.duration)}
              </p>
            </div>

            <button
              onClick={() => handleDeleteVideo(video.id)}
              style={{
                marginTop: "10px",
                padding: "8px 16px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              🗑️ Delete
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}