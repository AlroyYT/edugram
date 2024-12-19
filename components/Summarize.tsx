import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";

const Summarize = ({ file }: { file: File | null }) => {
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const router = useRouter();

  const handleSummarize = async () => {
    if (!file) {
      setUploadStatus("Error: No file selected for summarization");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setIsLoading(true);

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/summarize/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Summary response:", response.data);

      if (response.data?.summary) {
        setUploadStatus("");
        router.push({
          pathname: "/summary",
          query: { summary: response.data.summary },
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      setUploadStatus("Error generating summary");
      console.error("Error generating summary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleSummarize} disabled={isLoading || !file}>
        {isLoading ? "Processing..." : "Summarize"}
      </button>
      {uploadStatus && <p>{uploadStatus}</p>}
    </div>
  );
};

export default Summarize;
