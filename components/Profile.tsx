// pages/profile.tsx
import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { MongoClient, ObjectId } from 'mongodb';
import { getSession } from 'next-auth/react'; // <-- fetch session
import { motion } from 'framer-motion';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface User {
  _id: string;
  name: string;
  email: string;
  image: string;
  featureCounters: {
    BlindAssistance: number;
    DeafAssistance: number;
    AutismSupport: number;
    PersonalizedLearning: number;
  };
  savedMaterials?: {
    _id: string;
    type: string;
    fileName: string;
    filePath: string;
    createdAt: string;
  }[];
}

interface ProfileProps {
  user: User | null;
  error?: string;
}

export default function Profile({ user, error }: ProfileProps) {
  const [mounted, setMounted] = useState(false);
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
      transition: { type: "spring" as const, stiffness: 100 }
    }
  };
  
  const cardVariants = {
    rest: { scale: 1, boxShadow: "0px 4px 8px rgba(0, 0, 0, 0.1)" },
    hover: { 
      scale: 1.05, 
      boxShadow: "0px 10px 20px rgba(0, 0, 0, 0.2)",
      transition: { type: "spring" as "spring", stiffness: 400, damping: 10 }
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const goBackToHub = () => {
    router.push("/features");
  };

  if (error) {
    return (
      <div className="error-container">
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <h1 className="error-title">User Not Found</h1>
          <p className="error-message">{error}</p>
        </div>
        <style jsx>{`
          .error-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #fef7f0 0%, #fed7d7 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .error-card {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1);
            padding: 48px;
            text-align: center;
            max-width: 400px;
            width: 100%;
            border: 1px solid rgba(255, 255, 255, 0.2);
            animation: fadeInUp 0.6s ease-out;
          }
          .error-icon {
            font-size: 64px;
            margin-bottom: 24px;
            animation: bounce 2s infinite;
          }
          .error-title {
            font-size: 32px;
            font-weight: 700;
            background: linear-gradient(135deg, #e53e3e, #c53030);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 16px;
          }
          .error-message {
            color: #718096;
            font-size: 18px;
            line-height: 1.6;
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes bounce {
            0%, 20%, 53%, 80%, 100% { transform: translateY(0); }
            40%, 43% { transform: translateY(-10px); }
            70% { transform: translateY(-5px); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner-container">
            <div className="spinner"></div>
            <div className="spinner-inner"></div>
          </div>
          <p className="loading-text">Loading your profile...</p>
        </div>
        <style jsx>{`
          .loading-container {
            min-height: 100vh;
            background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          .loading-content {
            text-align: center;
          }
          .spinner-container {
            position: relative;
            margin-bottom: 32px;
          }
          .spinner {
            width: 64px;
            height: 64px;
            border: 4px solid #e2e8f0;
            border-top: 4px solid #4299e1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
          }
          .spinner-inner {
            position: absolute;
            top: 8px;
            left: 8px;
            width: 48px;
            height: 48px;
            border: 4px solid transparent;
            border-top: 4px solid #9f7aea;
            border-radius: 50%;
            animation: spin 0.75s linear infinite reverse;
          }
          .loading-text {
            color: #4a5568;
            font-size: 20px;
            font-weight: 500;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const totalFeatureUsage = Object.values(user.featureCounters).reduce((sum, count) => sum + count, 0);
  const mostUsedFeature = Object.entries(user.featureCounters).reduce((a, b) => 
    user.featureCounters[a[0] as keyof typeof user.featureCounters] > 
    user.featureCounters[b[0] as keyof typeof user.featureCounters] ? a : b
  );

  const featureData = Object.entries(user.featureCounters).map(([feature, count]) => {
    const config = {
      BlindAssistance: { 
        icon: '👁️', 
        gradient: 'linear-gradient(135deg, #9f7aea, #667eea)',
        bgGradient: 'linear-gradient(135deg, #f7fafc, #edf2f7)',
        name: 'Vision Assistance',
        color: '#9f7aea'
      },
      DeafAssistance: { 
        icon: '👂', 
        gradient: 'linear-gradient(135deg, #38b2ac, #319795)',
        bgGradient: 'linear-gradient(135deg, #e6fffa, #b2f5ea)',
        name: 'Hearing Assistance',
        color: '#38b2ac'
      },
      AutismSupport: { 
        icon: '🧩', 
        gradient: 'linear-gradient(135deg, #ed8936, #dd6b20)',
        bgGradient: 'linear-gradient(135deg, #fffaf0, #feebc8)',
        name: 'Autism Support',
        color: '#ed8936'
      },
      PersonalizedLearning: { 
        icon: '🎓', 
        gradient: 'linear-gradient(135deg, #4299e1, #3182ce)',
        bgGradient: 'linear-gradient(135deg, #ebf8ff, #bee3f8)',
        name: 'Personalized Learning',
        color: '#4299e1'
      }
    };
    
    return {
      key: feature,
      count,
      ...config[feature as keyof typeof config]
    };
  });

  return (
    <>
      <Head>
        <title>{user.name}'s Profile | EduGram</title>
        <meta name="description" content="View your EduGram profile and activity" />
      </Head>

      <div className="profile-page">
        <motion.header 
          className="profile-header"
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
          <h1>User Profile</h1>
          <div className="header-actions">
            <button className="theme-toggle">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
              </svg>
            </button>
          </div>
        </motion.header>

        <main className="profile-content">
          <motion.div 
            className="content-wrapper"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="user-info-card">
              <div className="profile-image-wrapper">
                <img 
                  src={user.image} 
                  alt={user.name} 
                  className="profile-image"
                  onError={(e) => {
                    // Fallback if image fails to load
                    (e.target as HTMLImageElement).src = "https://via.placeholder.com/150?text=User";
                  }}
                />
                <div className="status-indicator"></div>
              </div>
              <div className="user-details">
                <h2 className="user-name">{user.name}</h2>
                <p className="user-email">{user.email}</p>
                <div className="user-id-badge">ID: {user._id.substring(0, 8)}...</div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="stats-overview">
              <div className="stat-card total-usage">
                <div className="stat-icon">📊</div>
                <div className="stat-value">{totalFeatureUsage}</div>
                <div className="stat-label">Total Usage</div>
              </div>
              <div className="stat-card features-used">
                <div className="stat-icon">🔍</div>
                <div className="stat-value">4</div>
                <div className="stat-label">Features Used</div>
              </div>
              <div className="stat-card most-used">
                <div className="stat-icon">🏆</div>
                <div className="stat-value">{mostUsedFeature[0].replace(/([A-Z])/g, ' $1').trim()}</div>
                <div className="stat-label">Most Used</div>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="section-container">
              <div className="section-header">
                <div className="section-icon">📊</div>
                <h2 className="section-title">Feature Usage Analytics</h2>
              </div>
              
              <div className="features-grid">
                {featureData.map((feature, index) => (
                  <motion.div 
                    key={feature.key} 
                    className="feature-card"
                    variants={cardVariants}
                    initial="rest"
                    whileHover="hover"
                  >
                    <div className="feature-card-content">
                      <div className="feature-left">
                        <div 
                          className="feature-icon"
                          style={{ background: feature.gradient }}
                        >
                          {feature.icon}
                        </div>
                        <div className="feature-info">
                          <h3 className="feature-name">{feature.name}</h3>
                          <p className="feature-subtitle">Feature Usage</p>
                        </div>
                      </div>
                      
                      <div className="feature-right">
                        <div 
                          className="feature-count"
                          style={{ 
                            background: feature.gradient,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          }}
                        >
                          {feature.count}
                        </div>
                        <div className="feature-uses">uses</div>
                      </div>
                    </div>

                    <div className="usage-bar-container">
                      <div 
                        className="usage-bar"
                        style={{ 
                          background: feature.gradient,
                          width: totalFeatureUsage > 0 ? `${(feature.count / totalFeatureUsage) * 100}%` : '0%',
                        }}
                      ></div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {user.savedMaterials && user.savedMaterials.length > 0 && (
              <motion.div variants={itemVariants} className="section-container">
                <div className="section-header">
                  <div className="section-icon">📚</div>
                  <h2 className="section-title">Saved Materials</h2>
                </div>
                
                <div className="materials-grid">
                  {user.savedMaterials.map((material) => (
                    <motion.div 
                      key={material._id} 
                      className="material-card"
                      variants={cardVariants}
                      initial="rest"
                      whileHover="hover"
                    >
                      <div className="material-icon">
                        {material.type === 'flashcard' ? '🗂️' : 
                         material.type === 'summary' ? '📝' : 
                         material.type === 'quiz' ? '❓' : '📄'}
                      </div>
                      <div className="material-details">
                        <h3 className="material-name">{material.fileName}</h3>
                        <p className="material-type">{material.type.charAt(0).toUpperCase() + material.type.slice(1)}</p>
                        <p className="material-date">{new Date(material.createdAt).toLocaleDateString()}</p>
                      </div>
                      <a 
                        href={material.filePath} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="view-material-button"
                      >
                        View
                      </a>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        </main>
      </div>

      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #f9fafb;
        }
      `}</style>

      <style jsx>{`
        .profile-page {
          min-height: 100vh;
          background-color: #f9fafb;
          display: flex;
          flex-direction: column;
        }

        .profile-header {
          background-color: white;
          padding: 16px 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .profile-header h1 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 0;
          color: #333;
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: #4a6cf7;
          font-weight: 500;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 6px;
          transition: background-color 0.2s;
        }

        .back-button:hover {
          background-color: rgba(74, 108, 247, 0.1);
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .theme-toggle {
          background: none;
          border: 1px solid #e2e8f0;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          transition: background-color 0.2s;
        }

        .theme-toggle:hover {
          background-color: #f1f5f9;
        }

        .profile-content {
          flex: 1;
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
        }

        .content-wrapper {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .user-info-card {
          background-color: white;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 24px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        }

        .profile-image-wrapper {
          position: relative;
        }

        .profile-image {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          object-fit: cover;
          border: 4px solid white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .status-indicator {
          position: absolute;
          bottom: 8px;
          right: 8px;
          width: 16px;
          height: 16px;
          background-color: #10b981;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .user-details {
          flex: 1;
        }

        .user-name {
          font-size: 1.8rem;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: #1e293b;
        }

        .user-email {
          font-size: 1rem;
          color: #64748b;
          margin: 0 0 16px 0;
        }

        .user-id-badge {
          display: inline-block;
          background-color: #f1f5f9;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.875rem;
          color: #64748b;
          font-family: monospace;
        }

        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .stat-card {
          background-color: white;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
          transition: transform 0.3s, box-shadow 0.3s;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
        }

        .total-usage {
          border-top: 4px solid #4a6cf7;
        }

        .features-used {
          border-top: 4px solid #10b981;
        }

        .most-used {
          border-top: 4px solid #f59e0b;
        }

        .stat-icon {
          font-size: 2rem;
          margin-bottom: 12px;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 8px;
          color: #1e293b;
        }

        .stat-label {
          color: #64748b;
          font-size: 0.875rem;
        }

        .section-container {
          background-color: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .section-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #4a6cf7, #3a5ce5);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.25rem;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
          color: #1e293b;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        .feature-card {
          background-color: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          border: 1px solid #f1f5f9;
        }

        .feature-card-content {
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .feature-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .feature-icon {
          width: 48px;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.5rem;
        }

        .feature-info {
          display: flex;
          flex-direction: column;
        }

        .feature-name {
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #1e293b;
        }

        .feature-subtitle {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
        }

        .feature-right {
          text-align: right;
        }

        .feature-count {
          font-size: 2rem;
          font-weight: 700;
          line-height: 1;
        }

        .feature-uses {
          font-size: 0.75rem;
          color: #64748b;
        }

        .usage-bar-container {
          height: 8px;
          background-color: #f1f5f9;
          border-radius: 4px;
          overflow: hidden;
        }

        .usage-bar {
          height: 100%;
          border-radius: 4px;
          animation: fillBar 1s ease-out forwards;
        }

        .materials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .material-card {
          background-color: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          border: 1px solid #f1f5f9;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .material-icon {
          font-size: 2rem;
          color: #4a6cf7;
        }

        .material-details {
          flex: 1;
        }

        .material-name {
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #1e293b;
          font-size: 1rem;
        }

        .material-type {
          font-size: 0.875rem;
          color: #4a6cf7;
          margin: 0 0 4px 0;
        }

        .material-date {
          font-size: 0.75rem;
          color: #64748b;
          margin: 0;
        }

        .view-material-button {
          background-color: #4a6cf7;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          transition: background-color 0.2s;
        }

        .view-material-button:hover {
          background-color: #3a5ce5;
        }

        @keyframes fillBar {
          from { width: 0%; }
          to { width: var(--target-width, 100%); }
        }

        @media (max-width: 768px) {
          .user-info-card {
            flex-direction: column;
            text-align: center;
          }

          .user-details {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .features-grid,
          .materials-grid {
            grid-template-columns: 1fr;
          }

          .material-card {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>
    </>
  );
}


export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getSession(context);

  if (!session || !session.user?.email) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  try {
    const client = new MongoClient(process.env.MONGODB_URI as string);
    await client.connect();

    const db = client.db();
    const collection = db.collection('users');
    const userDoc = await collection.findOne({ email: session.user.email });

    if (!userDoc) {
      return {
        props: {
          user: null,
          error: 'User not found.',
        },
      };
    }

    const user: User = {
      _id: userDoc._id.toString(),
      name: userDoc.name ?? '',
      email: userDoc.email ?? '',
      image: userDoc.image ?? '',
      featureCounters: userDoc.featureCounters ?? {
        BlindAssistance: 0,
        DeafAssistance: 0,
        AutismSupport: 0,
        PersonalizedLearning: 0,
      },
      savedMaterials: userDoc.savedMaterials
        ? userDoc.savedMaterials.map((mat: any) => ({
            ...mat,
            _id: mat._id?.toString?.() ?? '',
            createdAt: mat.createdAt?.toISOString?.() ?? '',
          }))
        : [],
    };

    return {
      props: { user },
    };
  } catch (err) {
    return {
      props: {
        user: null,
        error: 'Failed to load user profile.',
      },
    };
  }
};
