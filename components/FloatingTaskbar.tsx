import React from 'react';

interface FloatingTaskbarProps {
  setCurrentPortal: (portal: string) => void;
  activeTab: string;
}

const FloatingTaskbar: React.FC<FloatingTaskbarProps> = ({ setCurrentPortal, activeTab }) => {
  return (
    <div className="floating-taskbar">
      <button
        className={`tab-button ${activeTab === 'learningHub' ? 'active' : ''}`}
        onClick={() => setCurrentPortal('learningHub')}
      >
        Learning Hub
      </button>
      <button
        className={`tab-button ${activeTab === 'assistiveTools' ? 'active' : ''}`}
        onClick={() => setCurrentPortal('assistiveTools')}
      >
        Assistive Tools
      </button>
      <button><a href="http://www.example.com/page2">Entertainment</a></button>
    </div>
  );
};

export default FloatingTaskbar;