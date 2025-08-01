'use client';
import { useEffect, useRef, useState } from 'react';
import styles from '../styles/speech.module.css';

type Difficulty = 'easy' | 'medium' | 'hard';

type Attempt = {
  sentence: string;
  result: string;
  time: number;
  difficulty: Difficulty;
};

export default function SpeechPractice() {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [sentence, setSentence] = useState('');
  const [spokenWords, setSpokenWords] = useState('');
  const [result, setResult] = useState('');
  const [timeTaken, setTimeTaken] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [botSpeed, setBotSpeed] = useState(1.0);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<number | null>(null);
  const [liveTimer, setLiveTimer] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  const startTimeRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const botIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      setSpokenWords(transcript);

      const endTime = performance.now();
      if (startTimeRef.current) {
        const duration = ((endTime - startTimeRef.current) / 1000).toFixed(2);
        const parsedTime = parseFloat(duration);
        setTimeTaken(parsedTime);
        clearInterval(timerIntervalRef.current!);
        startTimeRef.current = null;

        const res = await fetch('https://edugram-574544346633.asia-south1.run.app/api/speech-evaluate/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            original: sentence,
            spoken: transcript,
          }),
        });

        const data = await res.json();
        setResult(data.result);

        const attempt = {
          sentence,
          result: data.result,
          time: parsedTime,
          difficulty,
        };

        setAttempts((prev) => [attempt, ...prev]);
        setRecording(false);
      }
    };
  }, [sentence, difficulty]);

  const speakSentence = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = parseFloat(botSpeed.toFixed(1));
    utterance.lang = 'en-US';
    currentUtterance.current = utterance;

    const words = text.split(' ');
    let currentWord = 0;

    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        setHighlightedWordIndex(currentWord++);
      }
    };

    utterance.onend = () => {
      clearInterval(botIntervalRef.current!);
      setHighlightedWordIndex(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  const getRandomSentence = async () => {
    try {
      const res = await fetch('https://edugram-574544346633.asia-south1.run.app/api/speech-generate/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ difficulty }),
      });

      const data = await res.json();
      const generated = data.sentence;

      setSentence(generated);
      setSpokenWords('');
      setResult('');
      setTimeTaken(null);
      speakSentence(generated);
    } catch (err) {
      console.error('Error fetching sentence:', err);
    }
  };

  const startTimerAndListening = () => {
    setRecording(true);
    startTimeRef.current = performance.now();
    setLiveTimer(0);
    timerIntervalRef.current = setInterval(() => {
      setLiveTimer((prev) => prev + 1);
    }, 1000);
    recognitionRef.current.start();
  };

  const stopListening = () => {
    recognitionRef.current.stop();
    setRecording(false);

    if (startTimeRef.current) {
      const endTime = performance.now();
      const duration = ((endTime - startTimeRef.current) / 1000).toFixed(2);
      const parsedTime = parseFloat(duration);
      setTimeTaken(parsedTime);
      startTimeRef.current = null;
    }

    clearInterval(timerIntervalRef.current!);
  };

  const highlightBotSentence = () => {
    const words = sentence.split(' ');
    return words.map((word, i) => (
      <span
        key={i}
        className={`${styles.word} ${i === highlightedWordIndex ? styles.currentWord : ''}`}
      >
        {word}
      </span>
    ));
  };

  const highlightMatch = () => {
    const originalWords = sentence.split(' ');
    const spoken = spokenWords.trim().toLowerCase().split(/\s+/);

    return originalWords.map((word, i) => {
      const spokenWord = spoken[i] || '';
      const cleanOriginal = word.toLowerCase().replace(/[.,!?]/g, '');
      const cleanSpoken = spokenWord.replace(/[.,!?]/g, '');

      const isCorrect = cleanSpoken === cleanOriginal;

      return (
        <span
          key={i}
          className={`${styles.word} ${isCorrect ? styles.correct : styles.incorrect}`}
        >
          {word}
        </span>
      );
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>🗣 SPEECH PRACTICE</h1>

      <label className={styles.label}>Select Difficulty:</label>
      <select
        className={styles.select}
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value as Difficulty)}
      >
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      <div className={styles.sliderWrapper}>
        <label className={styles.label}>
          Voice Bot Speed: <strong>{botSpeed.toFixed(1)}x</strong>
        </label>
        <input
          className={styles.slider}
          type="range"
          min="0.5"
          max="2.5"
          step="0.25"
          value={botSpeed}
          onChange={(e) => setBotSpeed(parseFloat(e.target.value))}
        />
        <div className={styles.speedLabels}>
          <span> Slow</span>
          <span> Fast</span>
        </div>
      </div>

      <div className={styles.buttonGroup}>
        <button
          className={styles.button}
          style={{ backgroundColor: '#9333ea' }}
          onClick={getRandomSentence}
        >
          🎯 New Sentence
        </button>
        <button className={`${styles.button} ${styles.start}`} onClick={startTimerAndListening}>
          ▶ Start
        </button>
        <button className={`${styles.button} ${styles.pause}`} onClick={stopListening}>
          ⏹ Stop
        </button>
      </div>

      {liveTimer > 0 && (
        <p className={styles.timer}>⏱ Time: {liveTimer}s</p>
      )}

      {sentence && (
        <div className={styles.block}>
          <p className={styles.title}>Bot is Saying:</p>
          <div className={styles.text}>{highlightBotSentence()}</div>
          <button className={styles.replayButton} onClick={() => speakSentence(sentence)}>
            🔁 Replay Bot Voice
          </button>
        </div>
      )}

      {spokenWords && (
        <div className={styles.block}>
          <p className={styles.title}>You Said:</p>
          <div className={styles.text}>{highlightMatch()}</div>
        </div>
      )}

      {result && timeTaken !== null && (
        <div className={styles.resultBox}>
          <p className={styles.resultText}>
            Result: <strong>{result}</strong>
          </p>
          <p className={styles.timeText}>
            Time Taken: <strong>{timeTaken}s</strong>
          </p>
        </div>
      )}

      {attempts.length > 0 && (
        <div className={styles.history}>
          <h4>📝 Attempt History</h4>
          {attempts.slice(0, 5).map((attempt, i) => (
            <div key={i} className={styles.attemptItem}>
              {i + 1}. [{attempt.difficulty}] "{attempt.sentence}" —{' '}
              <strong>{attempt.result}</strong> in {attempt.time}s{' '}
              <button
                onClick={() => speakSentence(attempt.sentence)}
                className={styles.replayButton}
              >
                🔁 Replay
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.motivation}>
        🌟 Keep Practicing! Every sentence spoken is a step forward.
      </div>
    </div>
  );
}