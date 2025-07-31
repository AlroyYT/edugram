// pages/index.js
import Head from 'next/head';
import VoiceAssistant from '../components/VoiceAssistant';

import { useEffect } from 'react';

export default function Home() {
  // No longer needed as we're using predefined particles
  // But you can still use this if you want to generate dynamic particles
  /*
  useEffect(() => {
    const particlesContainer = document.querySelector('.particles');
    if (particlesContainer) {
      for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particlesContainer.appendChild(particle);
      }
    }
  }, []);
  */

  return (
    <div className="container1">
      <Head>
        <title>Educational Voice Assistant</title>
        <meta name="description" content="Voice assistant for blind education platform" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Add web font for that tech look */}
        <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600&display=swap" rel="stylesheet" />
      </Head>
      
      {/* Background animation elements */}
      <div className="holo-elements">
        <div className="holo-circle"></div>
        <div className="holo-circle"></div>
        <div className="holo-circle"></div>
        <div className="holo-circle"></div>
        <div className="holo-circle"></div>
        <div className="data-stream"></div>
        <div className="data-stream"></div>
        <div className="data-stream"></div>
        <div className="data-stream"></div>
      </div>
      
      <div className="radar-scan"></div>
      <div className="scan-line"></div>
      
      <div className="particles">
        {/* Use static particles defined in CSS */}
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>

      <main className="main">
        <h1 className="title">
          Educational Voice Assistant
        </h1>
        
        <p className="description1">
          An accessible learning experience for all
        </p>

        <VoiceAssistant />
      </main>

      <footer className="footer">
        <p>Powered by AI - Built for accessibility</p>
      </footer>
      
    </div>
  );
}