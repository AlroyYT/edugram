import React, { useState } from 'react';
import SignLanguage from '../components/sign2';
import SignToText from '../components/signToText';

const Sign: React.FC = () => {
  const [mode, setMode] = useState<'text-to-sign' | 'sign-to-text'>(
    'text-to-sign'
  );

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1rem',
          margin: '20px 0',
        }}
      >
        <button
          onClick={() => setMode('text-to-sign')}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            background:
              mode === 'text-to-sign'
                ? '#7c3aed'
                : '#d1d5db',
            color:
              mode === 'text-to-sign'
                ? '#fff'
                : '#000',
          }}
        >
          Text → Sign
        </button>

        <button
          onClick={() => setMode('sign-to-text')}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 600,
            background:
              mode === 'sign-to-text'
                ? '#7c3aed'
                : '#d1d5db',
            color:
              mode === 'sign-to-text'
                ? '#fff'
                : '#000',
          }}
        >
          Sign → Text
        </button>
      </div>

      {mode === 'text-to-sign' ? (
        <SignLanguage />
      ) : (
        <SignToText />
      )}
    </div>
  );
};

export default Sign;