import React, { useEffect, useRef, useState } from 'react';
import { backend_url } from '../components/config';

type WordData = { word: string; format: "mp4" | "webp" | "none" };

const SignLanguageAnimation: React.FC<{ text: string }> = ({ text }) => {
  const [animationData, setAnimationData] = useState<WordData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isValidWord = (word: string) =>
    /^[a-zA-Z\s]+$/.test(word.replace(/[.,!?;:'"()[\]{}\\-_]/g, '').trim());

  const shouldAnimateWord = (w: WordData) =>
    w.format !== "none" && isValidWord(w.word);

  // Fetch animation data when `text` changes
  useEffect(() => {
    if (!text) return;

    const fetchAnimation = async () => {
      try {
        const formData = new FormData();
        formData.append('sen', text);
        const res = await fetch(`${backend_url}/api/animation_view/`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        const validWords = (data.words || []).filter(shouldAnimateWord);
        setAnimationData(validWords);
        setCurrentIndex(0);
      } catch (error) {
        console.error("Failed to fetch animation data", error);
      }
    };

    fetchAnimation();
  }, [text]);

  // Automatically play the video on current word
  useEffect(() => {
    const video = videoRef.current;
    if (video && animationData[currentIndex]?.format === "mp4") {
      video.load();
      video.play().catch(console.error);
    }
  }, [currentIndex, animationData]);

  // Advance to the next valid word
  const handleNext = () => {
    if (currentIndex + 1 < animationData.length) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (animationData.length === 0) return null;

  const word = animationData[currentIndex];
  const mediaSrc = `${backend_url}/static/animations/${word.format}/${word.word}.${word.format}`;

  return (
    <div className="sign-animation-box">
      {word.format === "mp4" ? (
        <video
          ref={videoRef}
          muted
          onEnded={handleNext}
          onError={handleNext}
          style={{ width: 350, height: 350, borderRadius: 16 }}
        >
          <source src={mediaSrc} type="video/mp4" />
        </video>
      ) : (
        <img
          src={mediaSrc}
          alt={word.word}
          onLoad={() => {
            setTimeout(handleNext, 1000); // Auto next after 1s
          }}
          onError={handleNext}
          style={{ width: 200, height: 200, borderRadius: 16 }}
        />
      )}
    </div>
  );
};

export default SignLanguageAnimation;