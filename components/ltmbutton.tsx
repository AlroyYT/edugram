import React from 'react';


interface LtmButtonProps {
  ltm?: string;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}

const LtmButton: React.FC<LtmButtonProps> = ({ 
  ltm = "Go to Features", 
  className = "", 
  disabled = false,
  onClick 
}) => {
  const handleLtmClick = () => {
    if (!disabled) {
      if (onClick) {
        onClick();
      } else {
        // Fallback to window.location if no onClick provided
        window.location.href = '/features';
      }
    }
  };

  return (
    <button
      className={`ltm-button ${className}`}
      onClick={handleLtmClick}
      disabled={disabled}
      type="button"
    >
      {ltm}
    </button>
  );
};

export default LtmButton;