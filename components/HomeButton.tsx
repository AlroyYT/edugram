import React, { useState } from 'react';
import Link from 'next/link';

const HomeButton: React.FC = () => {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <Link href="/features">
      <div 
        className="fixed transition-all duration-300 ease-out transform hover:scale-110 active:scale-95"
        style={{
          position: 'fixed',
          bottom: '100px',
          right: '50px',
          zIndex: 9999,
          cursor: 'pointer'
        }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: isPressed 
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isPressed
              ? '0 8px 32px rgba(79, 70, 229, 0.6), 0 0 0 0 rgba(79, 70, 229, 0.4)'
              : '0 20px 40px rgba(79, 70, 229, 0.3), 0 0 0 0 rgba(79, 70, 229, 0.4)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Shine effect */}
          <div
            style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              width: '200%',
              height: '200%',
              background: 'linear-gradient(45deg, transparent 30%, rgba(255, 255, 255, 0.3) 50%, transparent 70%)',
              transform: isPressed ? 'translateX(100%)' : 'translateX(-100%)',
              transition: 'transform 0.6s ease-in-out',
              pointerEvents: 'none'
            }}
          />
          
          {/* Ripple effect */}
          {isPressed && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '0',
                height: '0',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.4)',
                transform: 'translate(-50%, -50%)',
                animation: 'benoRipple 0.6s ease-out forwards'
              }}
            />
          )}
          
          {/* Home icon */}
          <span 
            style={{ 
              fontSize: '24px',
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
              transform: isPressed ? 'scale(0.9)' : 'scale(1)',
              transition: 'transform 0.1s ease-in-out'
            }}
          >
            🏠
          </span>
        </div>
        
        {/* Glow effect */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: isPressed ? '120px' : '80px',
            height: isPressed ? '120px' : '80px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(79, 70, 229, 0.4) 0%, transparent 70%)',
            transform: 'translate(-50%, -50%)',
            transition: 'all 0.3s ease-out',
            pointerEvents: 'none',
            zIndex: -1,
            filter: 'blur(20px)'
          }}
        />
        
        {/* CSS keyframes for ripple animation */}
        <style jsx>{`
          @keyframes benoRipple {
            to {
              width: 100px;
              height: 100px;
              opacity: 0;
            }
          }
          
          @keyframes benoPulse {
            0%, 100% {
              transform: translate(-50%, -50%) scale(1);
            }
            50% {
              transform: translate(-50%, -50%) scale(1.1);
            }
          }
        `}</style>
      </div>
    </Link>
  );
};

export default HomeButton;