import { useEffect, useState } from 'react';
import Link from 'next/link';

const Visuale = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="visuale-container">
      {/* Animated Background Elements */}
      <div className="visuale-bg-elements">
        <div className="visuale-circle visuale-circle-1"></div>
        <div className="visuale-circle visuale-circle-2"></div>
        <div className="visuale-circle visuale-circle-3"></div>
        <div className="visuale-gradient-orb visuale-orb-1"></div>
        <div className="visuale-gradient-orb visuale-orb-2"></div>
        <div className="visuale-gradient-orb visuale-orb-3"></div>
      </div>

      {/* Floating Geometric Shapes */}
      <div className="visuale-floating-shapes">
        <div className="visuale-shape visuale-triangle"></div>
        <div className="visuale-shape visuale-square"></div>
        <div className="visuale-shape visuale-hexagon"></div>
      </div>

      {/* Parallax Cursor Effect */}
      <div 
        className="visuale-cursor-glow"
        style={{
          left: `${mousePosition.x}px`,
          top: `${mousePosition.y}px`,
        }}
      ></div>

      {/* Main Content */}
      <div className="visuale-content">
        <div className="visuale-header">
          <h1 className="visuale-title">
            What Visual Learning
            <span className="visuale-gradient-text"> Experience </span>
            Do You Need Today?
          </h1>
          <p className="visuale-subtitle">
            Choose your preferred learning style and unlock knowledge through immersive visualization
          </p>
        </div>

        <div className="visuale-cards-container">
          {/* Mindmap Card */}
          <Link href="/visual" className="visuale-card-link">
            <div className="visuale-glass-card visuale-card-mindmap">
              <div className="visuale-card-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="18" cy="6" r="2" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="6" cy="18" r="2" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="18" cy="18" r="2" stroke="currentColor" strokeWidth="2"/>
                  <line x1="10.5" y1="10.5" x2="7.5" y2="7.5" stroke="currentColor" strokeWidth="2"/>
                  <line x1="13.5" y1="10.5" x2="16.5" y2="7.5" stroke="currentColor" strokeWidth="2"/>
                  <line x1="10.5" y1="13.5" x2="7.5" y2="16.5" stroke="currentColor" strokeWidth="2"/>
                  <line x1="13.5" y1="13.5" x2="16.5" y2="16.5" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <h2 className="visuale-card-title">Mind Map</h2>
              <p className="visuale-card-description">
                Explore interconnected concepts through intuitive node-based diagrams. Perfect for understanding relationships and hierarchies.
              </p>
              <div className="visuale-card-features">
                <span className="visuale-feature-tag">Interactive</span>
                <span className="visuale-feature-tag">Structured</span>
                <span className="visuale-feature-tag">Hierarchical</span>
              </div>
              <div className="visuale-card-arrow">
                <span>→</span>
              </div>
            </div>
          </Link>

          {/* Animation Card */}
          <Link href="/visual1" className="visuale-card-link">
            <div className="visuale-glass-card visuale-card-animation">
              <div className="visuale-card-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 5L19 12L8 19V5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  <circle cx="8" cy="5" r="2" fill="currentColor"/>
                  <circle cx="8" cy="12" r="2" fill="currentColor"/>
                  <circle cx="8" cy="19" r="2" fill="currentColor"/>
                  <circle cx="19" cy="12" r="2" fill="currentColor"/>
                </svg>
              </div>
              <h2 className="visuale-card-title">Animation Based</h2>
              <p className="visuale-card-description">
                Learn through dynamic, motion-driven content. Watch concepts come alive with smooth transitions and engaging visuals.
              </p>
              <div className="visuale-card-features">
                <span className="visuale-feature-tag">Dynamic</span>
                <span className="visuale-feature-tag">Engaging</span>
                <span className="visuale-feature-tag">Intuitive</span>
              </div>
              <div className="visuale-card-arrow">
                <span>→</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Footer Info */}
        <div className="visuale-footer-info">
          <div className="visuale-info-pill">
            <span className="visuale-pulse-dot"></span>
            Both modes support real-time interaction
          </div>
        </div>
      </div>
    </div>
  );
};

export default Visuale;