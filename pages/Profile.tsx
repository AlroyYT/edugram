// pages/profile.tsx
import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { MongoClient } from 'mongodb';
import { getSession } from 'next-auth/react';
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
  const router = useRouter();

  if (error) {
    return (
      <div className="error-container">
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <h1 className="error-title">Error</h1>
          <p className="error-message">{error}</p>
          <button 
            onClick={() => router.push('/features')}
            className="retry-button"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="spinner"></div>
          <p className="loading-text">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const totalUsage = Object.values(user.featureCounters).reduce((sum, count) => sum + count, 0);
  
  const featureNames = {
    BlindAssistance: 'Vision Assistance',
    DeafAssistance: 'Hearing Assistance', 
    AutismSupport: 'Autism Support',
    PersonalizedLearning: 'Personalized Learning'
  };

  const mostUsedFeature = Object.entries(user.featureCounters).reduce((a, b) => 
    user.featureCounters[a[0] as keyof typeof user.featureCounters] > 
    user.featureCounters[b[0] as keyof typeof user.featureCounters] ? a : b
  );

  const mostUsedFeatureName = featureNames[mostUsedFeature[0] as keyof typeof featureNames];

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'flashcard': return '📚';
      case 'summary': return '📝';
      case 'quiz': return '🧠';
      default: return '📄';
    }
  };

  return (
    <>
      <Head>
        <title>{user.name}'s Profile | EduGram</title>
        <meta name="description" content="View your EduGram profile and learning progress" />
      </Head>

      <div className="profile-container">
        {/* Header */}
        <header className="header">
          <div className="header-content">
            <button 
              onClick={() => router.push('/features')}
              className="back-button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Hub
            </button>
            <h1 className="header-title">My Profile</h1>
            <div className="nav-actions">
              <button className="nav-button">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
              
              <div className="profile-menu">
                <div className="profile-trigger">
                  <img 
                    src={user.image} 
                    alt={user.name}
                    className="profile-avatar"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4f46e5&color=fff&size=32`;
                    }}
                  />
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                    {user.name.split(' ')[0]}
                  </span>
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="main-content">
          <div className="content-wrapper">
            {/* User Info Card */}
            <div className="user-card">
              <div className="user-header">
                <div className="profile-section">
                  <div className="profile-image-container">
                    <img 
                      src={user.image} 
                      alt={user.name}
                      className="profile-image"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=4f46e5&color=fff&size=80`;
                      }}
                    />
                    <div className="status-indicator"></div>
                  </div>
                  
                  <div className="user-info">
                    <h2 className="user-name">{user.name}</h2>
                    <p className="user-email">{user.email}</p>
                    <div className="user-badge">Active User</div>
                  </div>
                </div>

                <div className="stats-section">
                  <div className="stat-card">
                    <div className="stat-number">{totalUsage}</div>
                    <div className="stat-label">Total Sessions</div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-number">{mostUsedFeature[1]}</div>
                    <div className="stat-label">Top Feature Uses</div>
                  </div>
                </div>
              </div>

              <div className="feature-usage">
                <h3 className="section-title">Feature Usage Overview</h3>
                <div className="feature-grid">
                  {Object.entries(user.featureCounters).map(([key, value]) => (
                    <div key={key} className="feature-item">
                      <div className="feature-name">{featureNames[key as keyof typeof featureNames]}</div>
                      <div className="feature-count">{value} uses</div>
                      <div className="feature-bar">
                        <div 
                          className="feature-progress" 
                          style={{ 
                            width: `${totalUsage > 0 ? (value / totalUsage) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Saved Materials */}
            {user.savedMaterials && user.savedMaterials.length > 0 ? (
              <div className="materials-section">
                <div className="section-header">
                  <h3 className="section-title">Saved Materials</h3>
                  <div className="materials-count">{user.savedMaterials.length} items</div>
                </div>

                <div className="materials-grid">
                  {user.savedMaterials.map((material) => (
                    <div key={material._id} className="material-card">
                      <div className="material-icon">{getFileIcon(material.type)}</div>
                      
                      <div className="material-content">
                        <div className="material-header">
                          <h4 className="material-name">{material.fileName}</h4>
                          <span className="material-type">{material.type}</span>
                        </div>
                        
                        <p className="material-date">
                          Created {new Date(material.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                      
                      <a 
                        href={material.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="view-button"
                      >
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📚</div>
                <h3 className="empty-title">No saved materials yet</h3>
                <p className="empty-description">
                  Start using our learning features to generate and save study materials.
                </p>
                <button
                  className="cta-button"
                  onClick={() => router.push('/features')}
                >
                  Explore Features
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      <style jsx global>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Inter', sans-serif;
          line-height: 1.6;
          color: #1f2937;
        }
      `}</style>

      <style jsx>{`
        .profile-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .header {
          background: rgba(255, 255, 255, 0.98);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1.25rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          
        }

        .back-button {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          color: #374151;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          font-weight: 600;
          cursor: pointer;
          padding: 0.75rem 1.25rem;
          border-radius: 12px;
          transition: all 0.2s ease;
          font-size: 14px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        .back-button:hover {
          color: #1f2937;
          background: #f1f5f9;
          border-color: #cbd5e1;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.08);
        }

        .back-button svg {
          transition: transform 0.2s ease;
        }

        .back-button:hover svg {
          transform: translateX(-2px);
        }

        .header-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1f2937;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: -0.025em;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .nav-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #6b7280;
          background: none;
          border: none;
          font-weight: 500;
          cursor: pointer;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          transition: all 0.2s ease;
          font-size: 14px;
        }

        .nav-button:hover {
          color: #4f46e5;
          background: #f0f9ff;
        }

        .profile-menu {
          position: relative;
        }

        .profile-trigger {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 0.5rem 1rem;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .profile-trigger:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }

        .profile-avatar {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          object-fit: cover;
        }

        .spacer {
          width: 120px;
        }

        .main-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .content-wrapper {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .user-card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .user-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 2rem;
        }

        .profile-section {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .profile-image-container {
          position: relative;
        }

        .profile-image {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          object-fit: cover;
          border: 3px solid #e5e7eb;
        }

        .status-indicator {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 20px;
          height: 20px;
          background: #10b981;
          border: 3px solid white;
          border-radius: 50%;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .user-name {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
        }

        .user-email {
          color: #6b7280;
          font-size: 0.95rem;
        }

        .user-badge {
          background: #ecfdf5;
          color: #065f46;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 600;
          width: fit-content;
          margin-top: 0.5rem;
        }

        .stats-section {
          display: flex;
          gap: 1rem;
        }

        .stat-card {
          background: #f8fafc;
          padding: 1rem 1.5rem;
          border-radius: 12px;
          text-align: center;
          border: 1px solid #e2e8f0;
        }

        .stat-number {
          font-size: 1.75rem;
          font-weight: 700;
          color: #4f46e5;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
          margin-top: 0.25rem;
        }

        .feature-usage {
          border-top: 1px solid #e5e7eb;
          padding-top: 2rem;
        }

        .section-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 1.5rem;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .feature-item {
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .feature-name {
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .feature-count {
          font-size: 0.875rem;
          color: #6b7280;
          margin-bottom: 0.75rem;
        }

        .feature-bar {
          width: 100%;
          height: 4px;
          background: #e5e7eb;
          border-radius: 2px;
          overflow: hidden;
        }

        .feature-progress {
          height: 100%;
          background: linear-gradient(90deg, #4f46e5, #7c3aed);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .materials-section {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .materials-count {
          background: #eff6ff;
          color: #1d4ed8;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .materials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }

        .material-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 12px;
          border: 1px solid #e2e8f0;
          transition: all 0.2s ease;
        }

        .material-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-color: #cbd5e1;
        }

        .material-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .material-content {
          flex: 1;
          min-width: 0;
        }

        .material-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .material-name {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.875rem;
          line-height: 1.3;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .material-type {
          background: #e0e7ff;
          color: #3730a3;
          padding: 0.125rem 0.5rem;
          border-radius: 12px;
          font-size: 0.625rem;
          font-weight: 600;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .material-date {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .view-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: #4f46e5;
          color: white;
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .view-button:hover {
          background: #4338ca;
          transform: translateY(-1px);
        }

        .view-button svg {
          width: 16px;
          height: 16px;
        }

        .empty-state {
          background: white;
          border-radius: 16px;
          padding: 3rem;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #374151;
          margin-bottom: 0.5rem;
        }

        .empty-description {
          color: #6b7280;
          margin-bottom: 2rem;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        }

        .cta-button {
          background: #4f46e5;
          color: white;
          padding: 0.75rem 2rem;
          border-radius: 8px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cta-button:hover {
          background: #4338ca;
          transform: translateY(-1px);
        }

        .error-container, .loading-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        .error-card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          max-width: 400px;
          width: 100%;
          text-align: center;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }

        .error-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .error-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .error-message {
          color: #6b7280;
          margin-bottom: 2rem;
        }

        .retry-button {
          background: #4f46e5;
          color: white;
          padding: 0.75rem 2rem;
          border-radius: 8px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .retry-button:hover {
          background: #4338ca;
        }

        .loading-content {
          text-align: center;
          color: white;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        }

        .loading-text {
          font-weight: 500;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .main-content {
            padding: 1rem;
          }

          .user-card, .materials-section, .empty-state {
            padding: 1.5rem;
          }

          .user-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1.5rem;
          }

          .stats-section {
            align-self: stretch;
          }

          .stat-card {
            flex: 1;
          }

          .materials-grid {
            grid-template-columns: 1fr;
          }

          .feature-grid {
            grid-template-columns: 1fr;
          }

          .header-content {
            padding: 1rem;
          }

          .spacer {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .profile-section {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .material-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .material-header {
            width: 100%;
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
    const usersCollection = db.collection('users');
    const userDoc = await usersCollection.findOne({ email: session.user.email });

    await client.close();

    if (!userDoc) {
      return {
        props: {
          user: null,
          error: 'User profile not found. Please contact support.',
        },
      };
    }

    const user: User = {
      _id: userDoc._id.toString(),
      name: userDoc.name || 'Unknown User',
      email: userDoc.email || '',
      image: userDoc.image || '',
      featureCounters: userDoc.featureCounters || {
        BlindAssistance: 0,
        DeafAssistance: 0,
        AutismSupport: 0,
        PersonalizedLearning: 0,
      },
      savedMaterials: userDoc.savedMaterials
        ? userDoc.savedMaterials.map((material: any) => ({
            ...material,
            _id: material._id?.toString() || '',
            createdAt: material.createdAt?.toISOString() || new Date().toISOString(),
          }))
        : [],
    };

    return {
      props: { user },
    };
  } catch (error) {
    console.error('Profile page error:', error);
    return {
      props: {
        user: null,
        error: 'Failed to load profile. Please try again later.',
      },
    };
  }
};