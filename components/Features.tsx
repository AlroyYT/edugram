import React, { useState, useRef } from "react";
import Link from "next/link"; // Import Link from next/link for navigation

const Features = () => {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const lastUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const handleSpeak = (message: string) => {
    if ("speechSynthesis" in window) {
      if (lastUtteranceRef.current) {
        window.speechSynthesis.cancel();
        lastUtteranceRef.current = null;
      }

      const utterance = new SpeechSynthesisUtterance(message);
      const voices = window.speechSynthesis.getVoices();

      const femaleVoice = voices.find((voice) =>
        voice.name.toLowerCase().includes("female") || voice.name.toLowerCase().includes("woman")
      );

      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }

      lastUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } else {
      console.error("Speech synthesis not supported in this browser.");
    }
  };

  const handleMouseEnter = (message: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      handleSpeak(message);
    }, 300); 
    setDebounceTimer(timer);
  };

  const handleMouseLeave = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
  };

  return (
    <div className="features-page">
      <div className="features-header">
        <h1>Key Features</h1>
        <p>Discover the power of EmpowerLearn's innovative features.</p>
      </div>
      <div className="features-grid">
        <div
          className="feature-card"
          onMouseEnter={() => handleMouseEnter("This is blind assistance")}
          onMouseLeave={handleMouseLeave}
        >
          <div className="feature-icon">Blind Assistance Icon</div>
          <h2>Blind Assistance</h2>
          <p>Support tailored for visually impaired users.</p>
        </div>
        
        {/* Deaf Assistance Card with navigation */}
        <Link href="/deaf">
          <div
            className="feature-card"
            onMouseEnter={() => handleMouseEnter("This is deaf assistance")}
            onMouseLeave={handleMouseLeave}
          >
            <div className="feature-icon">Deaf Assistance Icon</div>
            <h2>Deaf Assistance</h2>
            <p>Tools designed for hearing-impaired individuals.</p>
          </div>
        </Link>

        <div
          className="feature-card"
          onMouseEnter={() => handleMouseEnter("THIS IS AUTISM SUPPORT")}
          onMouseLeave={handleMouseLeave}
        >
          <div className="feature-icon">Autism Support Icon</div>
          <h2>Autism Support</h2>
          <p>Features to support autism spectrum learning.</p>
        </div>
        <div
          className="feature-card"
          onMouseEnter={() => handleMouseEnter("THIS IS PERSONALIZED LEARNING")}
          onMouseLeave={handleMouseLeave}
        >
          <div className="feature-icon">Personalized Learning Icon</div>
          <h2>Personalized Learning</h2>
          <p>Quizzes, flashcards, and more for all users.</p>
        </div>
      </div>
    </div>
  );
};

export default Features;
