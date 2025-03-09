import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/router";

const Summarize = ({ file }: { file: File | null }) => {
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const router = useRouter();

  const handleSummarize = async () => {
    if (!file) {
      setUploadStatus("Error: No file selected for summarization");
      setIsSuccess(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setIsLoading(true);
    setIsSuccess(false);

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

      if (response.data?.summary) {
        setUploadStatus("");
        setIsSuccess(true);
        router.push({
          pathname: "/summary",
          query: { summary: response.data.summary },
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      setUploadStatus("Error generating summary");
      setIsSuccess(false);
      console.error("Error generating summary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-blue-50 rounded-full mb-4">
            📄
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Document Summarizer
          </h1>
          <p className="text-gray-500">
            Upload your document and get an AI-powered summary in seconds
          </p>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6">
          <div className="text-center">
            {file ? (
              <div className="space-y-2">
                <span className="text-2xl">✅</span>
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-2xl">📁</span>
                <p className="text-sm font-medium text-gray-900">
                  No file selected
                </p>
                <p className="text-xs text-gray-500">
                  Please select a file to summarize
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleSummarize}
          disabled={isLoading || !file}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
            isLoading || !file
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
              <span>Processing...</span>
            </div>
          ) : (
            "Generate Summary"
          )}
        </button>

        {uploadStatus && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 flex items-center space-x-2">
            <span className="text-red-500">⚠️</span>
            <p className="text-sm text-red-500">{uploadStatus}</p>
          </div>
        )}

        {isSuccess && (
          <div className="mt-4 p-4 rounded-lg bg-green-50 flex items-center space-x-2">
            <span className="text-green-500">✅</span>
            <p className="text-sm text-green-500">
              Summary generated successfully! Redirecting...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Summarize;