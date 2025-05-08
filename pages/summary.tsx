import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from 'axios';
import { jsPDF } from 'jspdf';

const Summary = () => {
  const router = useRouter();
  const [summaryText, setSummaryText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { summary, fileName, type } = router.query;

  // useEffect(() => {
  //   if (summary && fileName && type) {
  //     // Save the content after the page is loaded
  //     const saveContent = async () => {
  //       try {
  //         await axios.post(
  //           "http://127.0.0.1:8000/api/save-material/",
  //           {
  //             type,
  //             content: summary,
  //             fileName,
  //           },
  //           {
  //             headers: {
  //               'Content-Type': 'application/json',
  //             },
  //             withCredentials: true,
  //           }
  //         );
  //       } catch (error) {
  //         console.error("Error saving summary:", error);
  //       }
  //     };

  //     saveContent();
  //   }
  // }, [summary, fileName, type]);

  useEffect(() => {
    const { summary } = router.query;
    
    if (summary) {
      const decodedSummary = typeof summary === 'string' 
        ? decodeURIComponent(summary) 
        : '';
      setSummaryText(decodedSummary);
      setIsLoading(false);
    }
  }, [router.query]);

  const saveSummaryToPDF = async () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const originalFileName = fileName?.toString()?.split('.')[0] || 'summary'; // Get original filename without extension

    try {
      // Clean and format the summary text
      const cleanText = summaryText
        .replace(/[^\w\s.,!?-]/g, ' ') // Remove special characters except basic punctuation
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n\n') // Replace multiple newlines with double newline
        .trim();

      // Add title and file info
      doc.setFontSize(16);
      doc.text("Document Summary", 20, 20);
      doc.setFontSize(12);
      doc.text(`File: ${originalFileName}`, 20, 30);
      doc.text(`Date: ${date}`, 20, 40);

      // Add summary content
      let y = 60;
      const lineHeight = 7;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      const maxWidth = doc.internal.pageSize.width - (margin * 2);

      // Split the summary into paragraphs
      const paragraphs = cleanText.split('\n\n');

      // Add each paragraph to the PDF
      paragraphs.forEach((paragraph: string) => {
        // Split paragraph into lines that fit the page width
        const lines = doc.splitTextToSize(paragraph, maxWidth);

        // Add each line to the PDF
        lines.forEach((line: string) => {
          if (y > pageHeight - margin) {
            doc.addPage();
            y = margin;
          }
          doc.text(line, margin, y);
          y += lineHeight;
        });

        // Add space between paragraphs
        y += lineHeight;
      });

      // Convert PDF to blob
      const pdfBlob = doc.output('blob');

      // Create FormData and append the PDF
      const formData = new FormData();
      formData.append('file', pdfBlob, `${originalFileName}_summary.pdf`);
      formData.append('type', 'summary');
      formData.append('content', cleanText);
      formData.append('fileName', `${originalFileName}_summary`);

      // Send to backend using the save-material endpoint
      const response = await axios.post('http://127.0.0.1:8000/api/save-material/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.status === 'success') {
        console.log('Summary PDF saved successfully:', response.data.file_path);
      }
    } catch (error) {
      console.error('Error saving PDF:', error);
    }
  };

  const handleBackClick = async () => {
    try {
      // Save the summary as PDF before navigating back
      await saveSummaryToPDF();
      // Only navigate after successful save
      router.push('/deaf');
    } catch (error) {
      console.error('Error saving PDF:', error);
      // You can add a notification here if you want to inform the user about the error
    }
  };

  const getWordCount = (text: string): number => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const getSentenceCount = (text: string): number => {
    return text.trim().split(/[.!?]+\s*/).filter(Boolean).length;
  };

  const getReadingTime = (text: string): number => {
    const wordsPerMinute = 200;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  };

  const formatSummaryText = (text: string): string => {
    return text
      .replace(/\*\*/g, '')
      .replace(/###/g, '\n\n')
      .replace(/\s+/g, ' ')
      .replace(/\. /g, '.\n\n')
      .trim();
  };

  const copyToClipboard = () => {
    try {
      navigator.clipboard.writeText(summaryText);
      alert('Summary copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Styles
  const styles = {
    container: {
      minHeight: '100vh',
      padding: '2rem 1rem',
      background: 'linear-gradient(to bottom right, #EEF2FF, #E0E7FF)',
    },
    card: {
      maxWidth: '1000px',
      margin: '0 auto',
      background: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      overflow: 'hidden',
    },
    header: {
      padding: '1.5rem',
      borderBottom: '1px solid #e5e7eb',
      background: 'white',
    },
    statCard: {
      padding: '1.5rem',
      borderRadius: '12px',
      background: '#F3F4F6',
      marginBottom: '1rem',
    },
    button: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.75rem 1.5rem',
      borderRadius: '8px',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      background: '#3B82F6',
      color: 'white',
      border: 'none',
      marginRight: '0.75rem',
    },
    content: {
      padding: '2rem',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1rem',
      marginBottom: '2rem',
    },
    summaryText: {
      color: '#374151',
      lineHeight: '1.7',
      whiteSpace: 'pre-wrap',
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#1F2937' }}>
              Document Summary
            </h1>
            <button
              onClick={handleBackClick}
              style={{ ...styles.button, background: '#E5E7EB', color: '#374151' }}
            >
              ← Back to Upload
            </button>
          </div>
        </div>

        <div style={styles.content}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ 
                width: '4rem',
                height: '4rem',
                border: '4px solid #E5E7EB',
                borderTopColor: '#3B82F6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem'
              }}></div>
              <p style={{ color: '#6B7280' }}>Processing your summary...</p>
            </div>
          ) : (
            <>
              <div style={styles.statsGrid}>
                <div style={{ ...styles.statCard, background: '#EBF5FF' }}>
                  <div style={{ color: '#1E40AF', marginBottom: '0.5rem' }}>Word Count</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1E3A8A' }}>
                    {getWordCount(summaryText)}
                  </div>
                </div>
                <div style={{ ...styles.statCard, background: '#F5F3FF' }}>
                  <div style={{ color: '#5B21B6', marginBottom: '0.5rem' }}>Reading Time</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4C1D95' }}>
                    {getReadingTime(summaryText)} min
                  </div>
                </div>
                <div style={{ ...styles.statCard, background: '#ECFDF5' }}>
                  <div style={{ color: '#065F46', marginBottom: '0.5rem' }}>Sentences</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#064E3B' }}>
                    {getSentenceCount(summaryText)}
                  </div>
                </div>
              </div>

              <div style={{ 
                background: '#F9FAFB', 
                borderRadius: '12px', 
                padding: '1.5rem',
                marginBottom: '2rem' 
              }}>
                <h2 style={{ 
                  fontSize: '1.25rem', 
                  fontWeight: '600', 
                  color: '#111827',
                  marginBottom: '1rem' 
                }}>
                  Summary Content
                </h2>
                <div style={styles.summaryText}>
                  {formatSummaryText(summaryText)}
                </div>
              </div>

              <div style={{ 
                borderTop: '1px solid #E5E7EB', 
                paddingTop: '1.5rem',
                display: 'flex',
                gap: '1rem' 
              }}>
                <button
                  onClick={() => window.print()}
                  style={styles.button}
                >
                  🖨️ Print Summary
                </button>
                <button
                  onClick={copyToClipboard}
                  style={styles.button}
                >
                  📋 Copy to Clipboard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Summary;