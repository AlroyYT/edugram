"use client";

import { useState } from "react";
import { backend_url } from "@/components/config";

export default function Home() {
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateVideo = async () => {
    if (!topic.trim()) {
      setError("Please enter a topic");
      return;
    }

    setLoading(true);
    setError(null);
    setVideoUrl(null);

    try {
      const response = await fetch(
        `${backend_url}/api/generate-video/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ topic }),
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Video generation failed");
      }

      const data = await response.json();
      setVideoUrl(data.video_url);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>🎥 AI Educational Video Generator</h1>
      <p>
        Generates script, images, voiceover, and stitches them into a video.
      </p>

      <input
        type="text"
        placeholder="Enter a topic (e.g. Black Holes)"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        style={{
          padding: "10px",
          width: "100%",
          marginTop: "10px",
          marginBottom: "10px",
        }}
      />

      <button
        onClick={handleGenerateVideo}
        disabled={loading}
        style={{
          padding: "10px 20px",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Generating Video..." : "Generate Video"}
      </button>

      {loading && (
        <p style={{ marginTop: "15px" }}>
          ⏳ Processing… this may take a few minutes.
        </p>
      )}

      {error && (
        <p style={{ color: "red", marginTop: "15px" }}>
          ❌ {error}
        </p>
      )}

      {videoUrl && (
        <div style={{ marginTop: "30px" }}>
          <h3>✅ Video Ready</h3>
          <video
            src={videoUrl}
            controls
            style={{ width: "100%", borderRadius: "8px" }}
          />
        </div>
      )}
    </main>
  );
}
