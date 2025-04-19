// pages/index.js
import Head from 'next/head';
import VoiceAssistant from '../components/VoiceAssistant';

export default function Home() {
  return (
    <div className="container1">
      <Head>
        <title>Educational Voice Assistant</title>
        <meta name="description" content="Voice assistant for blind education platform" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="main">
        <h1 className="title">
          Educational Voice Assistant
        </h1>
        
        <p className="description">
          An accessible learning experience for all
        </p>

        <VoiceAssistant />
      </main>
      
      <footer className="footer">
        <p>Powered by AI - Built for accessibility</p>
      </footer>
    </div>
  );
}