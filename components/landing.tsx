import React from 'react';
import { signIn } from 'next-auth/react';

const Landing = () => {
  return (
    <div className="landing-container">
      <div className="landing-content">
        <h1>Welcome to AI Study Buddy</h1>
        <p>Sign in to start your personalized learning journey</p>
        <button onClick={() => signIn('google')} className="google-sign-in-btn">
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default Landing;
