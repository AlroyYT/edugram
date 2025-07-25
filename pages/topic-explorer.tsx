// pages/topic-explorer.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import VideoSearch from "../components/VideoSearch";
import CalculatorPopup from "../components/CalculatorPopup"; // Adjust path as needed
import { useRouter } from "next/router";
import Head from "next/head";

const TopicExplorer = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const router = useRouter();
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        duration: 0.5,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };
  
  const cardVariants = {
    rest: { scale: 1, boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)" },
    hover: { 
      scale: 1.05, 
      boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
      transition: { type: "spring", stiffness: 400, damping: 10 }
    }
  };

  // Category options
  const categories = [
    { name: "Mathematics", icon: "➗" },
    { name: "Science", icon: "🔬" },
    { name: "History", icon: "📜" },
    { name: "Language", icon: "🔤" },
    { name: "Computing", icon: "💻" },
    { name: "Arts", icon: "🎨" },
    { name: "Engineering", icon: "⚙️" },
    { name: "Social Studies", icon: "🌍" }
  ];

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
  };
  
  const goBackToHub = () => {
    router.push("/features");
  };

  // Calculator functions
  const openCalculator = () => setIsCalculatorOpen(true);
  const closeCalculator = () => setIsCalculatorOpen(false);

  return (
    <>
      <Head>
        <title>Topic Explorer | EduGram</title>
        <meta name="description" content="Explore educational topics and find video resources" />
        <link rel="stylesheet" href="/video.css" />
      </Head>

      <div className="topic-explorer-page">
        <motion.header 
          className="explorer-header"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 10 }}
        >
          <button className="back-button" onClick={goBackToHub}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/>
            </svg>
            Back to Hub
          </button>
          <h1>Topic Explorer</h1>
          <div className="header-actions">
            <button className="calculator-button" onClick={openCalculator}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M12 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h8zM4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4z"/>
                <path d="M4 2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-4z"/>
              </svg>
              Calculator
            </button>
            <button className="image-bot-button" onClick={() => router.push("/image")}>
              Image Bot
            </button>
            <button className="call-papers-button" onClick={() => router.push("/paper")}>
              Call Papers
            </button>
            <button className="theme-toggle">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
              </svg>
            </button>
          </div>
        </motion.header>

        <main className="explorer-content">
          <motion.div 
            className="content-explorer"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.p variants={itemVariants} className="explorer-description">
              Discover educational videos and resources on various subjects to enhance your learning experience.
            </motion.p>
            
            <motion.div variants={itemVariants} className="category-section">
              <h2>Popular Categories</h2>
              <div className="category-grid">
                {categories.map((category) => (
                  <motion.div 
                    key={category.name}
                    className={`category-card ${selectedCategory === category.name ? 'selected' : ''}`}
                    variants={cardVariants}
                    initial="rest"
                    whileHover="hover"
                    onClick={() => handleCategoryClick(category.name)}
                  >
                    <span className="category-icon">{category.icon}</span>
                    <span className="category-name">{category.name}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            
            <motion.div variants={itemVariants} className="video-section">
              <h2>Educational Videos</h2>
              <VideoSearch initialQuery={selectedCategory || ""} />
            </motion.div>
          </motion.div>
        </main>

        {/* Calculator Popup */}
        <CalculatorPopup 
          isOpen={isCalculatorOpen} 
          onClose={closeCalculator} 
        />
      </div>
    </>
  );
};

export default TopicExplorer;