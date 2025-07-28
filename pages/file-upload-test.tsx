import React from 'react';
import { FileProvider } from '../context/FileContext';
import FileUploadTester from '../components/FileUploadTester';

const TestPage = () => {
  return (
    <FileProvider>
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow p-4">
          <h1 className="text-2xl font-bold text-gray-900">File Upload Testing</h1>
        </header>
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <FileUploadTester />
        </main>
        <footer className="bg-white shadow p-4 mt-8 text-center">
          <p>Use this tool to test file uploads and diagnose issues</p>
        </footer>
      </div>
    </FileProvider>
  );
};

export default TestPage;
