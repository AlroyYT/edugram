import React from 'react';
import { signIn } from 'next-auth/react';
import Head from 'next/head';

const Landing = () => {
  return (
    <>
      <Head>
        <title>EDUGRAM | Your AI-Powered Learning Platform</title>
        <meta name="description" content="Personalized learning experiences with EDUGRAM's AI technology" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="edu-landing-container">
        {/* Background shapes */}
        <div className="edu-bg-shape-1"></div>
        <div className="edu-bg-shape-2"></div>
        <div className="edu-bg-shape-3"></div>

        <div className="edu-landing-content-wrapper">
          <div className="edu-landing-content">
            <h1>Transform Learning with <span>EDUGRAM</span></h1>
            <p>
              Experience personalized education powered by advanced AI. Join thousands of students elevating their learning journey with our cutting-edge platform.
            </p>

            <button onClick={() => signIn('google')} className="edu-google-sign-in-btn">
              <img src="/images/google-icon-logo-svgrepo-com.svg" alt="Google" />
              Sign in with Google
            </button>

            <div className="edu-benefit-cards">
              <div className="edu-benefit-card">
                <div className="edu-benefit-icon">🎯</div>
                <h3>Personalized Learning</h3>
                <p>AI-driven content tailored to your unique learning style and pace</p>
              </div>
              <div className="edu-benefit-card">
                <div className="edu-benefit-icon">🔍</div>
                <h3>Smart Study Tools</h3>
                <p>Interactive study materials that adapt to your progress</p>
              </div>
              <div className="edu-benefit-card">
                <div className="edu-benefit-icon">📊</div>
                <h3>Progress Tracking</h3>
                <p>Visualize your learning journey with detailed analytics</p>
              </div>
            </div>
          </div>

          <div className="edu-landing-image">
            <img src="/images/edugramlogo.png" alt="EDUGRAM Learning Platform" />
          </div>
        </div>
      </div>
    </>
  );
};

export default Landing;