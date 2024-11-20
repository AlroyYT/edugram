import React from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';

const SignInPage = () => {
  const router = useRouter();

  const handleSignIn = () => {
    signIn('google')
      .then(() => {
        router.push('/'); 
      })
      .catch((err) => {
        console.error('Error signing in:', err);
      });
  };

  return (
    <div className="signin-container">
      <h1>Sign In to AI Study Buddy</h1>
      <button onClick={handleSignIn} className="google-sign-in-btn">
        Sign in with Google
      </button>
    </div>
  );
};

export default SignInPage;
