import React, { useState, useRef } from 'react';
import Head from 'next/head';

interface AnalysisResult {
  success: boolean;
  description?: string;
  filename?: string;
  size?: number;
  content_type?: string;
  error?: string;
}

const ImageAnalyzer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setAnalysis(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // Analyze image
  const analyzeImage = async () => {
    if (!selectedFile) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      console.log('Sending request to analyze image...');
      
      // Updated URL - adjust based on your Django setup
      const response = await fetch('http://edugram-574544346633.asia-south1.run.app/api/analyze-image/', {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: AnalysisResult = await response.json();
      console.log('Analysis result:', result);
      setAnalysis(result);
    } catch (error) {
      console.error('Error analyzing image:', error);
      setAnalysis({
        success: false,
        error: `Failed to connect to the server: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Test connection
  const testConnection = async () => {
    try {
      const response = await fetch('http://edugram-574544346633.asia-south1.run.app/api/health/', {
        method: 'GET',
      });
      const result = await response.json();
      console.log('Health check result:', result);
      alert(`Server status: ${result.status}`);
    } catch (error) {
      console.error('Health check failed:', error);
      alert('Failed to connect to server');
    }
  };

  // Reset everything
  const reset = () => {
    setSelectedFile(null);
    setPreview(null);
    setAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Head>
        <title>AI Image Analyzer</title>
        <meta name="description" content="Upload an image and get AI-powered description" />
      </Head>
      
      <div className="container">
        <div className="main-content">
          <h1 className="title">AI Image Analyzer</h1>
          <p className="subtitle">Upload an image and get an AI-powered detailed description</p>

          {/* Test Connection Button */}
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <button onClick={testConnection} className="test-btn">
              Test Server Connection
            </button>
          </div>

          {/* Upload Area */}
          <div 
            className={`upload-area ${dragOver ? 'drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <div className="preview-container">
                <img src={preview} alt="Preview" className="preview-image" />
                <div className="file-info">
                  <p><strong>{selectedFile?.name}</strong></p>
                  <p>{(selectedFile?.size! / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            ) : (
              <div className="upload-placeholder">
                <div className="upload-icon">📸</div>
                <p>Click here or drag and drop an image</p>
                <p className="upload-hint">Supports: JPEG, PNG, GIF, BMP, WebP (Max: 10MB)</p>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="file-input"
            />
          </div>

          {/* Action Buttons */}
          {selectedFile && (
            <div className="action-buttons">
              <button 
                onClick={analyzeImage} 
                disabled={loading}
                className="analyze-btn"
              >
                {loading ? 'Analyzing...' : 'Analyze Image'}
              </button>
              <button onClick={reset} className="reset-btn">
                Reset
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Analyzing your image with AI...</p>
            </div>
          )}

          {/* Analysis Result */}
          {analysis && (
            <div className={`result ${analysis.success ? 'success' : 'error'}`}>
              {analysis.success ? (
                <div>
                  <h3>🎯 Analysis Result</h3>
                  <p className="description">{analysis.description}</p>
                  <div className="file-details">
                    <small>
                      File: {analysis.filename} | 
                      Size: {((analysis.size || 0) / 1024 / 1024).toFixed(2)} MB | 
                      Type: {analysis.content_type}
                    </small>
                  </div>
                </div>
              ) : (
                <div>
                  <h3>❌ Error</h3>
                  <p>{analysis.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default ImageAnalyzer;