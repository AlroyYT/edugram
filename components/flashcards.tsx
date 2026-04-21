import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useFileContext } from '../context/FileContext';
import { useRouter } from 'next/router';
import { jsPDF } from 'jspdf';
import SignLanguageAnimation from '../components/SignLanguageAnimation';
import { backend_url } from '../components/config';

// ---------------------------------------------------------------------------
// Language config — code, display label, BCP-47 tag for SpeechSynthesis
// ---------------------------------------------------------------------------
const LANGUAGES = [
  { code: 'en', label: 'English',    nativeLabel: 'English',    ttsLang: 'en-US' },
  { code: 'hi', label: 'Hindi',      nativeLabel: 'हिंदी',      ttsLang: 'hi-IN' },
  { code: 'kn', label: 'Kannada',    nativeLabel: 'ಕನ್ನಡ',      ttsLang: 'kn-IN' },
  { code: 'ta', label: 'Tamil',      nativeLabel: 'தமிழ்',      ttsLang: 'ta-IN' },
  { code: 'ml', label: 'Malayalam',  nativeLabel: 'മലയാളം',     ttsLang: 'ml-IN' },
  { code: 'te', label: 'Telugu',     nativeLabel: 'తెలుగు',     ttsLang: 'te-IN' },
  { code: 'bn', label: 'Bengali',    nativeLabel: 'বাংলা',      ttsLang: 'bn-IN' },
  { code: 'mr', label: 'Marathi',    nativeLabel: 'मराठी',      ttsLang: 'mr-IN' },
  { code: 'pa', label: 'Punjabi',    nativeLabel: 'ਪੰਜਾਬੀ',     ttsLang: 'pa-IN' },
  { code: 'gu', label: 'Gujarati',   nativeLabel: 'ગુજરાતી',    ttsLang: 'gu-IN' },
];

const FlashcardsEnhanced: React.FC = () => {
  const [fcrd84StudyCards, setFcrd84StudyCards] = useState<{ question: string; answer: string }[]>([]);
  const [fcrd84CardIndex, setFcrd84CardIndex] = useState(0);
  const [fcrd84ProcessingStatus, setFcrd84ProcessingStatus] = useState(false);
  const [fcrd84StatusMessage, setFcrd84StatusMessage] = useState('');
  const [fcrd84IsCardFlipped, setFcrd84IsCardFlipped] = useState(false);
  const [fcrd84UploadProgress, setFcrd84UploadProgress] = useState(0);
  const [fcrd84ShowProgressIndicator, setFcrd84ShowProgressIndicator] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  // NEW — language state; persisted in sessionStorage so it survives hot-reloads
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('fcrd_language') || 'en';
    }
    return 'en';
  });
  // Whether cards have already been requested for the current file
  const [cardsGenerated, setCardsGenerated] = useState(false);

  const { uploadedFile } = useFileContext();
  const router = useRouter();
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Persist language choice
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('fcrd_language', selectedLanguage);
    }
  }, [selectedLanguage]);

  // ---------------------------------------------------------------------------
  // Text-to-Speech — picks a voice matching the selected language's BCP-47 tag
  // ---------------------------------------------------------------------------
  const getTtsLang = (code: string) =>
    LANGUAGES.find(l => l.code === code)?.ttsLang || 'en-US';

  const speakText = (text: string) => {
    if (!voiceEnabled) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    speechRef.current = utterance;

    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const targetLangBCP47 = getTtsLang(selectedLanguage);
    const voices = window.speechSynthesis.getVoices();

    // Priority: exact BCP-47 match → language prefix match → any English voice
    const preferredVoice =
      voices.find(v => v.lang === targetLangBCP47) ||
      voices.find(v => v.lang.startsWith(selectedLanguage)) ||
      voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Microsoft'))) ||
      voices.find(v => v.lang.startsWith('en'));

    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend   = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Load voices (Chrome fires onvoiceschanged asynchronously)
  useEffect(() => {
    const loadVoices = () => { window.speechSynthesis.getVoices(); };
    if (window.speechSynthesis) {
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => { stopSpeech(); };
  }, []);

  // Speak when card changes or flips
  useEffect(() => {
    if (fcrd84StudyCards.length > 0 && voiceEnabled) {
      const card = fcrd84StudyCards[fcrd84CardIndex];
      if (card) {
        const textToSpeak = fcrd84IsCardFlipped
          ? `Answer: ${card.answer}`
          : `Question: ${card.question}`;
        setTimeout(() => speakText(textToSpeak), 300);
      }
    }
    return () => { stopSpeech(); };
  }, [fcrd84CardIndex, fcrd84IsCardFlipped, fcrd84StudyCards, voiceEnabled]);

  // ---------------------------------------------------------------------------
  // Generate flashcards on mount (after user picks a language and triggers)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!uploadedFile) {
      router.push("/deaf");
      return;
    }
    // Don't auto-generate — wait for the user to press "Generate"
  }, [uploadedFile, router]);

  const generateFlashcards = async () => {
    if (!uploadedFile) return;

    setCardsGenerated(true);
    setFcrd84ProcessingStatus(true);
    setFcrd84StatusMessage('Processing your document...');
    setFcrd84ShowProgressIndicator(true);
    setFcrd84UploadProgress(0);
    setFcrd84StudyCards([]);
    setFcrd84CardIndex(0);
    setFcrd84IsCardFlipped(false);

    const formData = new FormData();
    formData.append('file', uploadedFile);
    formData.append('language', selectedLanguage);  // ← send language code to backend

    try {
      const response = await axios.post(
        `${backend_url}/api/generate-flashcards/`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentComplete = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;
            setFcrd84UploadProgress(percentComplete);
            setFcrd84StatusMessage(`Uploading... ${percentComplete}%`);
          },
        }
      );

      setFcrd84StatusMessage('Generating flashcards...');

      if (response.data.flashcards && response.data.flashcards.length > 0) {
        setFcrd84StudyCards(response.data.flashcards);
        setFcrd84CardIndex(0);
        setFcrd84IsCardFlipped(false);
        setFcrd84StatusMessage('');
      } else {
        setFcrd84StatusMessage('No flashcards could be generated from this document. Please try a different file.');
      }
    } catch (error) {
      console.error('Error generating flashcards:', error);
      setFcrd84StatusMessage('We encountered an issue processing your document. Please try again.');
    } finally {
      setFcrd84ProcessingStatus(false);
      setFcrd84ShowProgressIndicator(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const fcrd84NavigateNext = () => {
    if (fcrd84CardIndex < fcrd84StudyCards.length - 1) {
      stopSpeech();
      setFcrd84IsCardFlipped(false);
      setTimeout(() => { setFcrd84CardIndex(fcrd84CardIndex + 1); }, 300);
    }
  };

  const fcrd84NavigatePrevious = () => {
    if (fcrd84CardIndex > 0) {
      stopSpeech();
      setFcrd84IsCardFlipped(false);
      setTimeout(() => { setFcrd84CardIndex(fcrd84CardIndex - 1); }, 300);
    }
  };

  const fcrd84ToggleCardFlip = () => {
    stopSpeech();
    setFcrd84IsCardFlipped(!fcrd84IsCardFlipped);
  };

  const toggleVoice = () => {
    if (voiceEnabled) stopSpeech();
    setVoiceEnabled(!voiceEnabled);
  };

  // ---------------------------------------------------------------------------
  // Done — save to PDF and navigate back
  // ---------------------------------------------------------------------------
  const handleDone = async () => {
    stopSpeech();
    await saveFlashcardsToPDF();
    router.push("/deaf");
  };

  const saveFlashcardsToPDF = async () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('en-GB').replace(/\//g, '-');
    const originalFileName = uploadedFile?.name?.split('.')[0] || 'flashcards';
    const langLabel = LANGUAGES.find(l => l.code === selectedLanguage)?.label || 'English';

    try {
      const margin     = 20;
      const lineHeight = 7;
      const pageWidth  = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let y = margin;

      doc.setFontSize(16);
      doc.text("Flashcards", margin, y);
      y += lineHeight * 2;

      doc.setFontSize(12);
      doc.text(`File: ${originalFileName}`, margin, y);     y += lineHeight;
      doc.text(`Date: ${date}`, margin, y);                 y += lineHeight;
      doc.text(`Language: ${langLabel}`, margin, y);        y += lineHeight;  // ← NEW
      doc.text(`Total Cards: ${fcrd84StudyCards.length}`, margin, y); y += lineHeight * 2;

      fcrd84StudyCards.forEach((card, index) => {
        if (y > pageHeight - margin - lineHeight * 10) {
          doc.addPage();
          y = margin;
        }

        doc.setFontSize(14);
        doc.text(`Card ${index + 1}/${fcrd84StudyCards.length}`, margin, y);
        y += lineHeight * 2;

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 139);
        const splitQuestion = doc.splitTextToSize(`Q: ${card.question}`, pageWidth - margin * 2);
        doc.text(splitQuestion, margin, y);
        y += lineHeight * (splitQuestion.length + 1);

        doc.setTextColor(0, 100, 0);
        const splitAnswer = doc.splitTextToSize(`A: ${card.answer}`, pageWidth - margin * 2);
        doc.text(splitAnswer, margin, y);
        y += lineHeight * (splitAnswer.length + 2);

        doc.setTextColor(0, 0, 0);
        y += lineHeight * 2;
      });

      const pdfBlob = doc.output('blob');
      const formData = new FormData();
      formData.append('file', pdfBlob, `${originalFileName}_flashcards.pdf`);
      formData.append('type', 'flashcards');
      formData.append('content', JSON.stringify({ cards: fcrd84StudyCards, date, language: selectedLanguage }));
      formData.append('fileName', `${originalFileName}_flashcards`);

      const response = await axios.post(`${backend_url}/api/save-material/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.status === 'success') {
        console.log('Flashcards PDF saved successfully:', response.data.file_path);
      }
    } catch (error) {
      console.error('Error saving PDF:', error);
    }
  };

  const cleanText = fcrd84StudyCards[fcrd84CardIndex]?.question?.replace(/[^a-zA-Z0-9\s]/g, '').trim() || '';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="fcrd84_studycard_dashboard">
      <div className="fcrd84_studycard_container">

        {/* ── Header row ── */}
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <motion.h1
            className="fcrd84_studycard_title"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Flashcards
          </motion.h1>

          {fcrd84StudyCards.length > 0 && (
            <button
              onClick={toggleVoice}
              className="fcrd84_voice_toggle"
              title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
              style={{ position: 'absolute', top: '0', right: '0' }}
            >
              {voiceEnabled ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
              )}
              {isSpeaking && <span className="fcrd84_speaking_pulse"></span>}
            </button>
          )}
        </div>

        {/* ── Language selector — shown only before cards are generated ── */}
        {!cardsGenerated && !fcrd84ProcessingStatus && (
          <motion.div
            className="fcrd84_lang_selector_wrapper"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="fcrd84_lang_label">Choose the language for your flashcards:</p>

            <div className="fcrd84_lang_grid">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={`fcrd84_lang_btn ${selectedLanguage === lang.code ? 'fcrd84_lang_btn_active' : ''}`}
                >
                  <span className="fcrd84_lang_native">{lang.nativeLabel}</span>
                  <span className="fcrd84_lang_english">{lang.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={generateFlashcards}
              className="fcrd84_generate_btn"
            >
              Generate Flashcards
            </button>
          </motion.div>
        )}

        {/* ── Main content ── */}
        {cardsGenerated && (
          <div className="fcrd84_flex_wrap">
            {/* Left — card or status */}
            <div className="fcrd84_card_left">
              <AnimatePresence mode="wait">
                {fcrd84ProcessingStatus ? (
                  <motion.div
                    key="processing"
                    className="fcrd84_processing_container"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="fcrd84_processing_card">
                      <div className="fcrd84_loading_spinner"></div>
                      <h3>{fcrd84StatusMessage}</h3>
                      {fcrd84ShowProgressIndicator && (
                        <div className="fcrd84_progress_container">
                          <div className="fcrd84_progress_bar">
                            <div
                              className="fcrd84_progress_fill"
                              style={{ width: `${fcrd84UploadProgress}%` }}
                            ></div>
                          </div>
                          <span className="fcrd84_progress_text">{fcrd84UploadProgress}%</span>
                        </div>
                      )}
                    </div>
                  </motion.div>

                ) : fcrd84StudyCards.length > 0 ? (
                  <motion.div
                    key="card-view"
                    className="fcrd84_card_view_container"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    {/* Language badge on the active card session */}
                    <div className="fcrd84_active_lang_badge">
                      {LANGUAGES.find(l => l.code === selectedLanguage)?.nativeLabel}
                      {' · '}
                      {LANGUAGES.find(l => l.code === selectedLanguage)?.label}
                    </div>

                    <div
                      className={`fcrd84_flashcard ${fcrd84IsCardFlipped ? 'fcrd84_flipped' : ''}`}
                      onClick={fcrd84ToggleCardFlip}
                    >
                      <div className="fcrd84_flashcard_inner">
                        <div className="fcrd84_flashcard_front">
                          <div className="fcrd84_card_content_scrollable">
                            <h2>{fcrd84StudyCards[fcrd84CardIndex].question}</h2>
                          </div>
                          <div className="fcrd84_card_hint">Click to reveal answer</div>
                        </div>
                        <div className="fcrd84_flashcard_back">
                          <div className="fcrd84_card_content_scrollable">
                            <p>{fcrd84StudyCards[fcrd84CardIndex].answer}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="fcrd84_navigation_controls">
                      <button
                        onClick={fcrd84NavigatePrevious}
                        disabled={fcrd84CardIndex === 0}
                        className="fcrd84_nav_button fcrd84_prev_button"
                      >
                        Previous
                      </button>
                      <div className="fcrd84_card_counter">
                        <motion.span
                          key={fcrd84CardIndex}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          Flashcard {fcrd84CardIndex + 1} of {fcrd84StudyCards.length}
                        </motion.span>
                      </div>
                      {fcrd84CardIndex === fcrd84StudyCards.length - 1 ? (
                        <button onClick={handleDone} className="fcrd84_nav_button fcrd84_done_button">Done</button>
                      ) : (
                        <button onClick={fcrd84NavigateNext} className="fcrd84_nav_button fcrd84_next_button">Next</button>
                      )}
                    </div>

                    {/* Allow re-generating in a different language */}
                    <button
                      onClick={() => {
                        stopSpeech();
                        setCardsGenerated(false);
                        setFcrd84StudyCards([]);
                        setFcrd84StatusMessage('');
                      }}
                      className="fcrd84_change_lang_btn"
                    >
                      ↩ Change language &amp; regenerate
                    </button>
                  </motion.div>

                ) : fcrd84StatusMessage ? (
                  <motion.div
                    key="error-message"
                    className="fcrd84_error_container"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="fcrd84_error_card">
                      <h3>Error</h3>
                      <p>{fcrd84StatusMessage}</p>
                      <button
                        onClick={() => { setCardsGenerated(false); setFcrd84StatusMessage(''); }}
                        className="fcrd84_nav_button"
                      >
                        Try again
                      </button>
                      <button onClick={() => router.push("/deaf")} className="fcrd84_nav_button" style={{ marginLeft: 8 }}>
                        Go Back
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Right — Sign Language */}
            <div className="fcrd84_signlang_box">
              <SignLanguageAnimation text={cleanText} />
            </div>
          </div>
        )}
      </div>

      {/* ── Styles ── */}
      <style jsx>{`
        /* ---- language selector ---- */
        .fcrd84_lang_selector_wrapper {
          background: white;
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
          margin-bottom: 24px;
        }

        .fcrd84_lang_label {
          font-size: 15px;
          color: #555;
          margin: 0 0 16px 0;
          font-weight: 500;
        }

        .fcrd84_lang_grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
          gap: 10px;
          margin-bottom: 24px;
        }

        .fcrd84_lang_btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 12px 8px;
          border-radius: 10px;
          border: 2px solid #e2e8f0;
          background: #f8fafc;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .fcrd84_lang_btn:hover {
          border-color: #4f46e5;
          background: #eef2ff;
        }

        .fcrd84_lang_btn_active {
          border-color: #4f46e5;
          background: #eef2ff;
          box-shadow: 0 0 0 3px rgba(79,70,229,0.15);
        }

        .fcrd84_lang_native {
          font-size: 16px;
          font-weight: 600;
          color: #1a202c;
        }

        .fcrd84_lang_english {
          font-size: 11px;
          color: #718096;
        }

        .fcrd84_generate_btn {
          width: 100%;
          padding: 14px;
          background: #4f46e5;
          color: white;
          font-size: 15px;
          font-weight: 600;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.1s ease;
        }

        .fcrd84_generate_btn:hover {
          background: #4338ca;
          transform: translateY(-1px);
        }

        .fcrd84_generate_btn:active {
          transform: translateY(0);
        }

        /* ---- active language badge ---- */
        .fcrd84_active_lang_badge {
          display: inline-block;
          background: #eef2ff;
          color: #4f46e5;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 20px;
          margin-bottom: 12px;
          border: 1px solid #c7d2fe;
        }

        /* ---- change language button ---- */
        .fcrd84_change_lang_btn {
          display: block;
          margin: 12px auto 0;
          background: none;
          border: none;
          color: #4f46e5;
          font-size: 13px;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
          padding: 4px 8px;
          transition: color 0.2s;
        }

        .fcrd84_change_lang_btn:hover {
          color: #4338ca;
        }

        /* ---- voice toggle ---- */
        .fcrd84_studycard_title {
          margin: 0;
        }

        .fcrd84_voice_toggle {
          position: relative;
          width: 50px;
          height: 50px;
          border-radius: 12px;
          border: 2px solid #e2e8f0;
          background: white;
          color: #4f46e5;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .fcrd84_voice_toggle:hover {
          background: #eef2ff;
          border-color: #4f46e5;
        }

        .fcrd84_speaking_pulse {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 12px;
          height: 12px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1);   opacity: 1; }
          50%       { transform: scale(1.2); opacity: 0.7; }
        }

        /* ---- card scrollable content ---- */
        .fcrd84_card_content_scrollable {
          max-height: 350px;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 20px;
          margin: -20px;
          padding-right: 30px;
        }

        .fcrd84_card_content_scrollable::-webkit-scrollbar { width: 8px; }
        .fcrd84_card_content_scrollable::-webkit-scrollbar-track { background: transparent; border-radius: 10px; }
        .fcrd84_card_content_scrollable::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 10px; }
        .fcrd84_card_content_scrollable::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.3); }

        .fcrd84_flashcard_front .fcrd84_card_content_scrollable h2,
        .fcrd84_flashcard_back  .fcrd84_card_content_scrollable p {
          margin: 0;
          word-wrap: break-word;
        }

        /* ---- processing / error containers ---- */
        .fcrd84_processing_container,
        .fcrd84_error_container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
        }

        .fcrd84_processing_card,
        .fcrd84_error_card {
          background: white;
          border-radius: 15px;
          padding: 40px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          text-align: center;
          max-width: 400px;
          width: 100%;
        }

        .fcrd84_loading_spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 20px;
        }

        @keyframes spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .fcrd84_progress_container { margin-top: 20px; }

        .fcrd84_progress_bar {
          width: 100%;
          height: 8px;
          background-color: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .fcrd84_progress_fill {
          height: 100%;
          background-color: #007bff;
          transition: width 0.3s ease;
        }

        .fcrd84_progress_text { font-size: 14px; color: #666; }

        .fcrd84_processing_card h3,
        .fcrd84_error_card h3 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 18px;
        }

        .fcrd84_error_card p {
          color: #666;
          margin-bottom: 20px;
        }
      `}</style>
    </div>
  );
};

export default FlashcardsEnhanced;