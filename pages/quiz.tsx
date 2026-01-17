import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/router";
import styles from "../styles/quiz.module.css";

/* ---------------- TYPES ---------------- */

type LearningStyle = "visual" | "auditory" | "kinesthetic" | "readingWriting";

interface QuizQuestion {
  id: number;
  question: string;
  options: {
    text: string;
    style: LearningStyle;
  }[];
}

/* ---------------- COMPONENT ---------------- */

const QuizStyleIdentifier: React.FC = () => {
  const router = useRouter();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  /* ---------- INIT ---------- */
  useEffect(() => {
    const shuffled = [...ALL_QUESTIONS].sort(() => 0.5 - Math.random());
    setQuestions(shuffled.slice(0, 10));

    ["visual", "auditory", "kinesthetic", "readingWriting"].forEach((style) => {
      if (!Cookies.get(style)) Cookies.set(style, "0", { expires: 365 });
    });
  }, []);

  /* ---------- HANDLE ANSWER ---------- */
  const analyzeAndRedirect = (router: ReturnType<typeof useRouter>) => {
  const scores = {
    visual: Number(Cookies.get("visual")) || 0,
    auditory: Number(Cookies.get("auditory")) || 0,
    kinesthetic: Number(Cookies.get("kinesthetic")) || 0,
    readingWriting: Number(Cookies.get("readingWriting")) || 0,
  };

  console.log("Learning Style Scores:", scores);

  // Find max score
  const maxScore = Math.max(
    scores.visual,
    scores.auditory,
    scores.kinesthetic,
    scores.readingWriting
  );

  // Find styles that have max score (tie-safe)
  const topStyles = Object.entries(scores)
    .filter(([_, value]) => value === maxScore)
    .map(([style]) => style);

  // Priority order (important)
  const priorityOrder: LearningStyle[] = [
    "visual",
    "auditory",
    "readingWriting",
    "kinesthetic",
  ];

  const dominantStyle = priorityOrder.find((style) =>
    topStyles.includes(style)
  );

  // Redirect mapping
  switch (dominantStyle) {
    case "visual":
      router.push("/visuale");
      break;

    case "auditory":
      router.push("/voice-assistant");
      break;

    case "readingWriting":
      router.push("/deaf");
      break;

    case "kinesthetic":
      router.push("/kinesthetic-learning");
      break;
  }
};

  const handleAnswer = (style: LearningStyle) => {
    const currentValue = Number(Cookies.get(style)) || 0;
    Cookies.set(style, String(currentValue + 1), { expires: 365 });

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      analyzeAndRedirect(router);
    }
  };

  if (!questions.length) {
    return (
      <div className={styles.quizContainer}>
        <h2>Preparing your quiz…</h2>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / questions.length) * 100;

  /* ---------- RENDER ---------- */
  return (
    <div className={styles.quizContainer}>
      <div className={styles.quizHeader}>
        <h1 className={styles.quizTitle}>Learning Style Quiz</h1>
        <p className={styles.quizSubtitle}>
          Question {currentIndex + 1} of {questions.length}
        </p>
      </div>

      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className={styles.questionCard}>
        <h2 className={styles.questionText}>
          {questions[currentIndex].question}
        </h2>

        <div className={styles.optionsContainer}>
          {questions[currentIndex].options.map((opt, i) => (
            <button
              key={i}
              className={styles.optionBtn}
              onClick={() => handleAnswer(opt.style)}
            >
              <span className={styles.optionLetter}>
                {String.fromCharCode(65 + i)}
              </span>
              <span className={styles.optionText}>{opt.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ---------------- QUESTIONS ---------------- */

const ALL_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: "You want to learn a new mobile app. What do you do first?",
    options: [
      { text: "Watch a video tutorial", style: "visual" },
      { text: "Listen to someone explain it", style: "auditory" },
      { text: "Explore the app by tapping around", style: "kinesthetic" },
      { text: "Read the help documentation", style: "readingWriting" },
    ],
  },
  {
    id: 2,
    question: "When studying for an exam, you prefer to:",
    options: [
      { text: "Use diagrams and charts", style: "visual" },
      { text: "Discuss topics with friends", style: "auditory" },
      { text: "Practice problems hands-on", style: "kinesthetic" },
      { text: "Write summaries and notes", style: "readingWriting" },
    ],
  },
  {
    id: 3,
    question: "If you are lost in a new city, you:",
    options: [
      { text: "Look at a map", style: "visual" },
      { text: "Ask someone for directions", style: "auditory" },
      { text: "Walk and explore", style: "kinesthetic" },
      { text: "Read written directions", style: "readingWriting" },
    ],
  },
  {
    id: 4,
    question: "When assembling furniture, you prefer to:",
    options: [
      { text: "Follow the diagrams", style: "visual" },
      { text: "Have someone explain the steps", style: "auditory" },
      { text: "Start assembling and adjust as needed", style: "kinesthetic" },
      { text: "Read the instruction manual carefully", style: "readingWriting" },
    ],
  },
  {
    id: 5,
    question: "You remember a phone number best by:",
    options: [
      { text: "Visualizing the numbers", style: "visual" },
      { text: "Repeating it aloud", style: "auditory" },
      { text: "Typing it into your phone", style: "kinesthetic" },
      { text: "Writing it down", style: "readingWriting" },
    ],
  },
  {
    id: 6,
    question: "When learning a new sport, you prefer to:",
    options: [
      { text: "Watch others play first", style: "visual" },
      { text: "Listen to the coach’s explanation", style: "auditory" },
      { text: "Jump in and start practicing", style: "kinesthetic" },
      { text: "Read the rules and techniques", style: "readingWriting" },
    ],
  },
  {
    id: 7,
    question: "You prepare for a presentation by:",
    options: [
      { text: "Creating slides and visuals", style: "visual" },
      { text: "Practicing aloud", style: "auditory" },
      { text: "Rehearsing while moving around", style: "kinesthetic" },
      { text: "Writing detailed notes", style: "readingWriting" },
    ],
  },
  {
    id: 8,
    question: "When following a recipe, you prefer:",
    options: [
      { text: "Pictures or videos of each step", style: "visual" },
      { text: "Someone explaining the steps", style: "auditory" },
      { text: "Cooking and adjusting as you go", style: "kinesthetic" },
      { text: "Reading the written recipe", style: "readingWriting" },
    ],
  },
  {
    id: 9,
    question: "You learn best in a classroom when:",
    options: [
      { text: "The teacher uses visual aids", style: "visual" },
      { text: "There are discussions and lectures", style: "auditory" },
      { text: "There are hands-on activities", style: "kinesthetic" },
      { text: "There are textbooks and handouts", style: "readingWriting" },
    ],
  },
  {
    id: 10,
    question: "To understand a new concept, you:",
    options: [
      { text: "Draw diagrams or charts", style: "visual" },
      { text: "Talk it through with someone", style: "auditory" },
      { text: "Apply it in a real situation", style: "kinesthetic" },
      { text: "Read detailed explanations", style: "readingWriting" },
    ],
  },
  {
    id: 11,
    question: "When revising notes, you prefer:",
    options: [
      { text: "Highlighting and color-coding", style: "visual" },
      { text: "Reading them aloud", style: "auditory" },
      { text: "Using flashcards physically", style: "kinesthetic" },
      { text: "Rewriting the notes", style: "readingWriting" },
    ],
  },
  {
    id: 12,
    question: "You remember people best by:",
    options: [
      { text: "Their face", style: "visual" },
      { text: "Their voice", style: "auditory" },
      { text: "How they interact physically", style: "kinesthetic" },
      { text: "Their name in writing", style: "readingWriting" },
    ],
  },
  {
    id: 13,
    question: "When planning a trip, you:",
    options: [
      { text: "Look at maps and photos", style: "visual" },
      { text: "Discuss plans with others", style: "auditory" },
      { text: "Prefer spontaneous exploration", style: "kinesthetic" },
      { text: "Make a written itinerary", style: "readingWriting" },
    ],
  },
  {
    id: 14,
    question: "You solve problems best by:",
    options: [
      { text: "Visualizing the solution", style: "visual" },
      { text: "Talking through the problem", style: "auditory" },
      { text: "Trying different approaches", style: "kinesthetic" },
      { text: "Writing step-by-step solutions", style: "readingWriting" },
    ],
  },
  {
    id: 15,
    question: "When learning a new language, you prefer:",
    options: [
      { text: "Watching videos with subtitles", style: "visual" },
      { text: "Listening to conversations", style: "auditory" },
      { text: "Practicing speaking immediately", style: "kinesthetic" },
      { text: "Studying grammar and vocabulary lists", style: "readingWriting" },
    ],
  },
  {
    id: 16,
    question: "You understand instructions better when they are:",
    options: [
      { text: "Shown with images", style: "visual" },
      { text: "Explained verbally", style: "auditory" },
      { text: "Demonstrated physically", style: "kinesthetic" },
      { text: "Written clearly", style: "readingWriting" },
    ],
  },
  {
    id: 17,
    question: "When shopping for electronics, you:",
    options: [
      { text: "Compare images and specs", style: "visual" },
      { text: "Ask for expert opinions", style: "auditory" },
      { text: "Test the product in-store", style: "kinesthetic" },
      { text: "Read reviews and manuals", style: "readingWriting" },
    ],
  },
  {
    id: 18,
    question: "You stay focused best when:",
    options: [
      { text: "Using visual reminders", style: "visual" },
      { text: "Listening to explanations", style: "auditory" },
      { text: "Moving while learning", style: "kinesthetic" },
      { text: "Reading silently", style: "readingWriting" },
    ],
  },
  {
    id: 19,
    question: "You remember lessons better if:",
    options: [
      { text: "They include diagrams", style: "visual" },
      { text: "They include discussions", style: "auditory" },
      { text: "They include activities", style: "kinesthetic" },
      { text: "They include written summaries", style: "readingWriting" },
    ],
  },
  {
    id: 20,
    question: "When learning a new tool, you:",
    options: [
      { text: "Watch how it’s used", style: "visual" },
      { text: "Listen to instructions", style: "auditory" },
      { text: "Try using it yourself", style: "kinesthetic" },
      { text: "Read the manual", style: "readingWriting" },
    ],
  },
  {
    id: 21,
    question: "You prepare for interviews by:",
    options: [
      { text: "Watching interview videos", style: "visual" },
      { text: "Practicing answers aloud", style: "auditory" },
      { text: "Doing mock interviews", style: "kinesthetic" },
      { text: "Writing sample answers", style: "readingWriting" },
    ],
  },
  {
    id: 22,
    question: "When learning history, you prefer:",
    options: [
      { text: "Timelines and visuals", style: "visual" },
      { text: "Storytelling and lectures", style: "auditory" },
      { text: "Role-playing events", style: "kinesthetic" },
      { text: "Reading textbooks", style: "readingWriting" },
    ],
  },
  {
    id: 23,
    question: "You remember instructions best when you:",
    options: [
      { text: "See them written or drawn", style: "visual" },
      { text: "Hear them spoken", style: "auditory" },
      { text: "Carry them out immediately", style: "kinesthetic" },
      { text: "Write them down", style: "readingWriting" },
    ],
  },
  {
    id: 24,
    question: "You prefer teachers who:",
    options: [
      { text: "Use visual aids", style: "visual" },
      { text: "Explain concepts clearly", style: "auditory" },
      { text: "Encourage hands-on learning", style: "kinesthetic" },
      { text: "Provide detailed notes", style: "readingWriting" },
    ],
  },
  {
    id: 25,
    question: "You feel most confident when learning involves:",
    options: [
      { text: "Charts and illustrations", style: "visual" },
      { text: "Listening and discussing", style: "auditory" },
      { text: "Doing and practicing", style: "kinesthetic" },
      { text: "Reading and writing", style: "readingWriting" },
    ],
  },
  {
    id: 26,
    question: "You prefer online courses that:",
    options: [
      { text: "Include videos and graphics", style: "visual" },
      { text: "Have spoken explanations", style: "auditory" },
      { text: "Include interactive tasks", style: "kinesthetic" },
      { text: "Provide downloadable notes", style: "readingWriting" },
    ],
  },
  {
    id: 27,
    question: "When memorizing facts, you:",
    options: [
      { text: "Visualize them", style: "visual" },
      { text: "Repeat them aloud", style: "auditory" },
      { text: "Use physical cues", style: "kinesthetic" },
      { text: "Write them repeatedly", style: "readingWriting" },
    ],
  },
  {
    id: 28,
    question: "You enjoy learning most when:",
    options: [
      { text: "Information is visually appealing", style: "visual" },
      { text: "You can listen and discuss", style: "auditory" },
      { text: "You can actively participate", style: "kinesthetic" },
      { text: "You can read and analyze", style: "readingWriting" },
    ],
  },
  {
    id: 29,
    question: "When solving puzzles, you:",
    options: [
      { text: "Look for visual patterns", style: "visual" },
      { text: "Talk through the steps", style: "auditory" },
      { text: "Manipulate pieces physically", style: "kinesthetic" },
      { text: "Write possible solutions", style: "readingWriting" },
    ],
  },
  {
    id: 30,
    question: "You learn best from feedback that is:",
    options: [
      { text: "Shown with examples", style: "visual" },
      { text: "Spoken clearly", style: "auditory" },
      { text: "Demonstrated practically", style: "kinesthetic" },
      { text: "Written in detail", style: "readingWriting" },
    ],
  },
];

/* Fill up to 30 */
while (ALL_QUESTIONS.length < 30) {
  const id = ALL_QUESTIONS.length + 1;
  ALL_QUESTIONS.push({
    id,
    question: `Learning preference scenario ${id}`,
    options: [
      { text: "Prefer visuals and images", style: "visual" },
      { text: "Prefer listening and discussion", style: "auditory" },
      { text: "Prefer hands-on experience", style: "kinesthetic" },
      { text: "Prefer reading and writing", style: "readingWriting" },
    ],
  });
}

export default QuizStyleIdentifier;
