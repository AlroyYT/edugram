import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from 'react-i18next';
import { backend_url } from '../components/config';

const Features = () => {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const lastUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [activeCard, setActiveCard] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    // Initialize speech synthesis
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
    }

    // Add loaded state with delay for animations
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleSpeak = (message: string) => {
    if ("speechSynthesis" in window) {
      if (lastUtteranceRef.current) {
        window.speechSynthesis.cancel();
        lastUtteranceRef.current = null;
      }

      const utterance = new SpeechSynthesisUtterance(message);
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find((voice) =>
        voice.name.toLowerCase().includes("female") || voice.name.toLowerCase().includes("woman")
      );
      if (femaleVoice) utterance.voice = femaleVoice;

      lastUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleMouseEnter = (message: string, index: number) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      handleSpeak(message);
      setActiveCard(index);
    }, 300);
    setDebounceTimer(timer);
  };

  const handleMouseLeave = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    setActiveCard(null);
  };

  const features = [
    {
      title: t("blind_assistance"),
      message: t("blind_assistance_msg"),
      description: t("blind_assistance_desc"),
      icon: "👁️",
      link: "/voice-assistant",
      color: "#8A2BE2",
      hoverColor: "#9d4df3",
      bgGradient: "linear-gradient(135deg, rgba(138, 43, 226, 0.2) 0%, rgba(138, 43, 226, 0.05) 100%)",
    },
    {
      title: t("deaf_assistance"),
      message: t("deaf_assistance_msg"),
      description: t("deaf_assistance_desc"),
      icon: "👂",
      link: "/deaf",
      color: "#4169E1",
      hoverColor: "#5a7df5",
      bgGradient: "linear-gradient(135deg, rgba(65, 105, 225, 0.2) 0%, rgba(65, 105, 225, 0.05) 100%)",
    },
    {
      title: t("visual_study"),
      message: t("visual_study_msg"),
      description: t("visual_study_desc"),
      icon: "🎥",
      link: "/visuale",
      color: "#20B2AA",
      hoverColor: "#30d2ca",
      bgGradient: "linear-gradient(135deg, rgba(32, 178, 170, 0.2) 0%, rgba(32, 178, 170, 0.05) 100%)",
    },
    {
      title: t("personalized_learning"),
      message: t("personalized_learning_msg"),
      description: t("personalized_learning_desc"),
      icon: "🎯",
      color: "#FF4500",
      link: "/topic-explorer",
      hoverColor: "#ff6a30",
      bgGradient: "linear-gradient(135deg, rgba(255, 69, 0, 0.2) 0%, rgba(255, 69, 0, 0.05) 100%)",
    },
  ];

  return (
    <div className="features-page">
      {/* Animated Background Canvas */}
      <div className="cosmic-canvas"></div>

      {/* Floating Particles */}
      <div className="particles">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${Math.random() * 3 + 1}px`,
              height: `${Math.random() * 3 + 1}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 10 + 10}s`
            }}
          ></div>
        ))}
      </div>

      {/* Header Content */}
      <motion.div
        className="header-container"
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: isLoaded ? 1 : 0, y: isLoaded ? 0 : -30 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <div className="header-content">
          <div className="title-wrapper">
            <motion.div
              className="title-line"
              initial={{ width: 0 }}
              animate={{ width: isLoaded ? "80px" : 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            ></motion.div>
            <h1 className="page-title">
              <span className="emp">{t("empower_learn")}</span>
            </h1>
            <motion.div
              className="title-line"
              initial={{ width: 0 }}
              animate={{ width: isLoaded ? "80px" : 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
            ></motion.div>
          </div>
          <h2 className="page-subtitle">{t("innovative_features")}</h2>
          <p className="page-description">
            {t("features_page_desc")}
          </p>
        </div>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        className="features-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 1, delay: 0.8 }}
      >
        <div className="features-grid">
          {features.map((feature, index) => {
            const itemContent = (
              <motion.div
                key={index}
                className={`feature-card ${activeCard === index ? 'active' : ''}`}
                style={{ background: feature.bgGradient }}
                initial={{ opacity: 0, y: 50 }}
                animate={{
                  opacity: isLoaded ? 1 : 0,
                  y: isLoaded ? 0 : 50,
                }}
                transition={{
                  duration: 0.8,
                  delay: 1 + (index * 0.15)
                }}
                whileHover={{
                  y: -10,
                  boxShadow: `0 20px 40px rgba(0,0,0,0.3), 0 0 30px ${feature.color}40`
                }}
                onMouseEnter={() => handleMouseEnter(feature.message, index)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="card-content">
                  <div className="feature-icon-wrapper">
                    <div className="feature-icon-bg" style={{ backgroundColor: `${feature.color}30` }}></div>
                    <div className="feature-icon-circle" style={{ borderColor: feature.color }}></div>
                    <div className="feature-icon-inner">{feature.icon}</div>
                  </div>

                  <h3 className="feature-title" style={{ color: feature.color }}>
                    {feature.title}
                    <div className="title-underline" style={{ backgroundColor: feature.color }}></div>
                  </h3>

                  <p className="feature-description">{feature.description}</p>

                  <div className="feature-action">
                    <span className="feature-button" style={{ color: feature.color, borderColor: feature.color }}>
                      {t("explore")}
                      <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>

                  <div className="card-glow" style={{ background: `radial-gradient(circle at 50% 50%, ${feature.color}40 0%, transparent 70%)` }}></div>
                </div>

                <div className="card-border"></div>
                <div className="card-shine"></div>
              </motion.div>
            );

            return feature.link ? (
              <Link href={feature.link} key={index} className="feature-link">
                {itemContent}
              </Link>
            ) : (
              <div className="feature-link" key={index}>
                {itemContent}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        className="scroll-indicator"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isLoaded ? 0.7 : 0, y: isLoaded ? 0 : 20 }}
        transition={{ duration: 0.5, delay: 2 }}
      >
        <div className="chevrons">
          <div className="chevron"></div>
          <div className="chevron"></div>
          <div className="chevron"></div>
        </div>
        <div className="scroll-text">{t("scroll_explore")}</div>
      </motion.div>
    </div>
  );
};

export default Features;