import React from 'react';
import { useTranslation } from 'react-i18next';

interface FloatingTaskbarProps {
  setCurrentPortal: (portal: string) => void;
  activeTab: string;
}

const FloatingTaskbar: React.FC<FloatingTaskbarProps> = ({ setCurrentPortal, activeTab }) => {
  const { t } = useTranslation();

  return (
    <div className="floating-taskbar">
      <button
        className={`tab-button ${activeTab === 'learningHub' ? 'active' : ''}`}
        onClick={() => setCurrentPortal('learningHub')}
      >
        {t("learning_hub")}
      </button>
      <button
        className={`tab-button ${activeTab === 'assistiveTools' ? 'active' : ''}`}
        onClick={() => setCurrentPortal('assistiveTools')}
      >
        {t("assistive_tools")}
      </button>
      <button><a href="http://www.example.com/page2">{t("entertainment")}</a></button>
    </div>
  );
};

export default FloatingTaskbar;