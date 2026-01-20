import { useEffect, useRef, useState } from "react";

export const useTextToSpeech = () => {
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const speakText = (text: string) => {
    if (!voiceEnabled || !text) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    speechRef.current = utterance;

    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find(v => v.lang.startsWith("en") && v.name.includes("Google")) ||
      voices.find(v => v.lang.startsWith("en"));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const toggleVoice = () => {
    if (voiceEnabled) stopSpeech();
    setVoiceEnabled(prev => !prev);
  };

  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () =>
        window.speechSynthesis.getVoices();
    }

    return () => stopSpeech();
  }, []);

  return {
    speakText,
    stopSpeech,
    toggleVoice,
    isSpeaking,
    voiceEnabled,
  };
};
