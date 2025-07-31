import DeafAssistance from "../components/Deafassistance";
import FloatingTaskbar from '../components/FloatingTaskbar';
import AssistiveTools from '../components/AssistiveTools';
import JarvisFloatingButton from '../components/JarvisFloatingButton';

import React, { useState } from "react";

const Deaf: React.FC = () => {
  const [currentPortal, setCurrentPortal] = useState('learningHub');

  const renderPortal = () => {
    switch (currentPortal) {
      case 'learningHub':
        return <DeafAssistance />;
      case 'assistiveTools':
        return <AssistiveTools />;
      default:
        return <DeafAssistance />;
    }
  };

  return (
    <div className="deaf-section-container">
      {renderPortal()}
      <FloatingTaskbar setCurrentPortal={setCurrentPortal} activeTab={currentPortal} />
      <JarvisFloatingButton />
    </div>
  );
};

export default Deaf;