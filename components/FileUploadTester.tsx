import React, { useState } from 'react';
import { useFileContext } from '../context/FileContext';
import useDirectFileUploader from '../components/DirectFileUploader';

const FileUploadTester: React.FC = () => {
  const { uploadedFile } = useFileContext();
  const [logs, setLogs] = useState<string[]>([]);
  const [fileName, setFileName] = useState('resume.pdf');
  const [location, setLocation] = useState('downloads');
  
  // Log function
  const addLog = (message: string) => {
    setLogs(prev => [
      `[${new Date().toLocaleTimeString()}] ${message}`, 
      ...prev
    ]);
    console.log(message);
  };
  
  // Initialize uploader
  const uploader = useDirectFileUploader({
    onUploadSuccess: (file) => {
      addLog(`✅ Upload success: ${file}`);
    },
    onError: (error) => {
      addLog(`❌ Error: ${error}`);
    },
    onStatusUpdate: (message) => {
      addLog(`ℹ️ Status: ${message}`);
    }
  });
  
  // Handle test upload
  const startTestUpload = async () => {
    addLog(`🔍 Starting test: looking for ${fileName} in ${location}`);
    const result = await uploader.uploadSpecificFile(fileName, location);
    addLog(`📣 Final result: ${result}`);
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">File Upload Test Tool</h1>
      
      <div className="mb-8 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">Current Status</h2>
        <div className="flex flex-col gap-2">
          <p><strong>Is Processing:</strong> {uploader.isProcessing ? 'Yes' : 'No'}</p>
          <p><strong>Status Message:</strong> {uploader.statusMessage}</p>
          <p><strong>Current File in Context:</strong> {uploadedFile ? uploadedFile.name : 'None'}</p>
          {uploadedFile && (
            <p><strong>File Size:</strong> {Math.round(uploadedFile.size / 1024)} KB</p>
          )}
        </div>
      </div>
      
      <div className="mb-8 p-4 border rounded">
        <h2 className="text-xl font-semibold mb-2">Upload Test</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="mb-4">
            <label className="block mb-1">File Name:</label>
            <input 
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="Enter filename to search for"
            />
          </div>
          
          <div className="mb-4">
            <label className="block mb-1">Location:</label>
            <select 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="downloads">Downloads</option>
              <option value="documents">Documents</option>
              <option value="desktop">Desktop</option>
              <option value="pictures">Pictures</option>
              <option value="music">Music</option>
            </select>
          </div>
        </div>
        
        <button 
          onClick={startTestUpload}
          disabled={uploader.isProcessing}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {uploader.isProcessing ? 'Processing...' : 'Start Test Upload'}
        </button>
      </div>
      
      <div className="p-4 border rounded bg-gray-50">
        <h2 className="text-xl font-semibold mb-2">Test Logs</h2>
        <div className="max-h-96 overflow-y-auto border rounded bg-black text-green-400 font-mono p-2">
          {logs.length === 0 ? (
            <p>No logs yet. Run a test to see logs.</p>
          ) : (
            logs.map((log, i) => <div key={i} className="whitespace-pre-wrap">{log}</div>)
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUploadTester;
