import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const BackToFeatureButton = () => {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  
  useEffect(() => {
    // Only show the button if not on the features page
    setIsVisible(router.pathname !== '/features');
  }, [router.pathname]);
  
  if (!isVisible) return null;
  
  return (
    <div className="back-to-feature-container">
      <div 
        className={`tooltip ${showTooltip ? 'tooltip-visible' : ''}`}
        aria-hidden={!showTooltip}
      >
        Return to Features
      </div>
      
      <Link 
        href="/features" 
        className="back-to-feature-button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label="Return to features page"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          className="feature-icon"
        >
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"></path>
        </svg>
      </Link>
      
      <style jsx global>{`
        .back-to-feature-container {
          position: fixed;
          bottom: 30px;
          right: 30px;
          z-index: 999;
        }
        
        .back-to-feature-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--primary, #4361ee);
          box-shadow: 0 4px 14px rgba(67, 97, 238, 0.3);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1.0);
        }
        
        .back-to-feature-button:hover {
          transform: scale(1.1);
          box-shadow: 0 8px 20px rgba(67, 97, 238, 0.4);
        }
        
        .back-to-feature-button:active {
          transform: scale(0.95);
        }
        
        .feature-icon {
          width: 24px;
          height: 24px;
          color: white;
        }
        
        .tooltip {
          position: absolute;
          top: -40px;
          right: 0;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 5px 12px;
          border-radius: 6px;
          font-size: 14px;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.3s ease, transform 0.3s ease;
          pointer-events: none;
          white-space: nowrap;
        }
        
        .tooltip:after {
          content: '';
          position: absolute;
          bottom: -6px;
          right: 22px;
          border-width: 6px 6px 0;
          border-style: solid;
          border-color: rgba(0, 0, 0, 0.7) transparent transparent;
        }
        
        .tooltip-visible {
          opacity: 1;
          transform: translateY(0);
        }
        
        @media (max-width: 768px) {
          .back-to-feature-container {
            bottom: 20px;
            right: 20px;
          }
          
          .back-to-feature-button {
            width: 50px;
            height: 50px;
          }
        }
      `}</style>
    </div>
  );
};

export default BackToFeatureButton;
