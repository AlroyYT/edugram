// pages/profile.tsx
import { useState, useEffect } from 'react';
import { GetServerSideProps } from 'next';
import { MongoClient, ObjectId } from 'mongodb';

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
}

interface ProfileProps {
  user: User | null;
  error?: string;
}

export default function Profile({ user, error }: ProfileProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <div className="profile-container">
      {/* Animated Background */}
      <div className="bg-decoration bg-decoration-1"></div>
      <div className="bg-decoration bg-decoration-2"></div>
      
      <div className="main-wrapper">
        <div className={`profile-card ${mounted ? 'loaded' : ''}`}>
          
          {/* Header Section */}
          <div className="header-section">
            <div className="header-overlay"></div>
            <div className="header-content">
              <div className="profile-image-container">
                <div className="image-glow"></div>
                <img
                  src={user.image}
                  alt={user.name}
                  className="profile-image"
                />
                <div className="status-badge">
                  <span>✓</span>
                </div>
              </div>
              
              <div className="profile-info">
                <h1 className="profile-name">{user.name}</h1>
                <div className="profile-email">
                  <div className="email-icon">📧</div>
                  {user.email}
                </div>
                <div className="active-badge">
                  <span className="status-dot"></span>
                  Active User
                </div>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="stats-overview">
            <div className="stat-item">
              <div className="stat-number stat-primary">{totalFeatureUsage}</div>
              <div className="stat-label">Total Usage</div>
            </div>
            <div className="stat-item">
              <div className="stat-number stat-secondary">4</div>
              <div className="stat-label">Features Used</div>
            </div>
            <div className="stat-item">
              <div className="stat-number stat-tertiary">
                {mostUsedFeature[0].replace(/([A-Z])/g, ' $1').trim()}
              </div>
              <div className="stat-label">Most Used</div>
            </div>
          </div>

          {/* Main Content */}
          <div className="content-section">
            <div className="section-header">
              <div className="section-icon">📊</div>
              <h2 className="section-title">Feature Usage Analytics</h2>
            </div>
            
            {/* Feature Cards */}
            <div className="features-grid">
              {featureData.map((feature, index) => (
                <div key={feature.key} className={`feature-card feature-card-${index}`}>
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
                        animationDelay: `${index * 200}ms`
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Usage Card */}
            <div className="total-usage-card">
              <div className="total-usage-bg"></div>
              <div className="total-usage-content">
                <div className="total-usage-left">
                  <h3 className="total-usage-title">Total Feature Engagement</h3>
                  <p className="total-usage-subtitle">Across all accessibility tools</p>
                </div>
                <div className="total-usage-right">
                  <div className="total-usage-number">{totalFeatureUsage}</div>
                  <div className="total-usage-label">total interactions</div>
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div className="account-section">
              <div className="account-header">
                <div className="account-icon">👤</div>
                <h3 className="account-title">Account Information</h3>
              </div>
              
              <div className="account-grid">
                <div className="account-card">
                  <div className="account-label">User ID</div>
                  <div className="account-value user-id">{user._id}</div>
                </div>
                
                <div className="account-card">
                  <div className="account-label">Primary Feature</div>
                  <div className="account-value feature-name">
                    {mostUsedFeature[0].replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div className="account-sublabel">
                    {mostUsedFeature[1]} uses
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .profile-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          position: relative;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .bg-decoration {
          position: absolute;
          border-radius: 50%;
          blur: 60px;
          opacity: 0.1;
          animation: float 6s ease-in-out infinite;
        }

        .bg-decoration-1 {
          top: 20%;
          left: 20%;
          width: 400px;
          height: 400px;
          background: linear-gradient(135deg, #667eea, #764ba2);
        }

        .bg-decoration-2 {
          bottom: 20%;
          right: 20%;
          width: 320px;
          height: 320px;
          background: linear-gradient(135deg, #f093fb, #f5576c);
          animation-delay: 3s;
        }

        .main-wrapper {
          position: relative;
          z-index: 10;
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px;
          padding-top: 48px;
        }

        .profile-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          border-radius: 24px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          overflow: hidden;
          opacity: 0;
          transform: translateY(30px);
          transition: all 1s ease-out;
        }

        .profile-card.loaded {
          opacity: 1;
          transform: translateY(0);
        }

        .header-section {
          position: relative;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 64px 32px;
          color: white;
        }

        .header-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(0,0,0,0.1) 0%, rgba(255,255,255,0.05) 100%);
        }

        .header-content {
          position: relative;
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
        }

        @media (min-width: 768px) {
          .header-content {
            flex-direction: row;
            text-align: left;
          }
        }

        .profile-image-container {
          position: relative;
        }

        .image-glow {
          position: absolute;
          inset: -4px;
          background: linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1));
          border-radius: 50%;
          blur: 8px;
          transition: all 0.3s ease;
        }

        .profile-image-container:hover .image-glow {
          blur: 12px;
          transform: scale(1.05);
        }

        .profile-image {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          border: 4px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          position: relative;
          z-index: 2;
          transition: transform 0.3s ease;
        }

        .profile-image-container:hover .profile-image {
          transform: scale(1.05);
        }

        .status-badge {
          position: absolute;
          bottom: -8px;
          right: -8px;
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 50%;
          border: 4px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        }

        .profile-info {
          text-align: center;
        }

        @media (min-width: 768px) {
          .profile-info {
            text-align: left;
          }
        }

        .profile-name {
          font-size: 48px;
          font-weight: 700;
          margin-bottom: 16px;
          letter-spacing: -0.02em;
        }

        .profile-email {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-size: 20px;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 24px;
        }

        @media (min-width: 768px) {
          .profile-email {
            justify-content: flex-start;
          }
        }

        .email-icon {
          width: 24px;
          height: 24px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
        }

        .active-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.2);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 8px 20px;
          color: white;
          font-weight: 500;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        .stats-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
          padding: 32px;
          background: linear-gradient(135deg, rgba(255,255,255,0.6), rgba(248,250,252,0.6));
        }

        .stat-item {
          text-align: center;
        }

        .stat-number {
          font-size: 36px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .stat-primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stat-secondary {
          background: linear-gradient(135deg, #10b981, #059669);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stat-tertiary {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-size: 24px;
        }

        .stat-label {
          color: #64748b;
          font-weight: 500;
        }

        .content-section {
          padding: 32px;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 40px;
        }

        .section-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: 0 8px 16px rgba(102, 126, 234, 0.3);
        }

        .section-title {
          font-size: 36px;
          font-weight: 700;
          background: linear-gradient(135deg, #1f2937, #4b5563);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-bottom: 40px;
        }

        .feature-card {
          background: linear-gradient(135deg, #ffffff, #f8fafc);
          border-radius: 16px;
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
          transition: all 0.3s ease;
          opacity: 0;
          transform: translateY(20px);
          animation: slideUp 0.6s ease-out forwards;
        }

        .feature-card-0 { animation-delay: 0.1s; }
        .feature-card-1 { animation-delay: 0.2s; }
        .feature-card-2 { animation-delay: 0.3s; }
        .feature-card-3 { animation-delay: 0.4s; }

        .feature-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }

        .feature-card-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .feature-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .feature-icon {
          width: 56px;
          height: 56px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        .feature-name {
          font-weight: 700;
          font-size: 18px;
          color: #1f2937;
          margin-bottom: 4px;
        }

        .feature-subtitle {
          color: #6b7280;
          font-size: 14px;
        }

        .feature-count {
          font-size: 48px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .feature-uses {
          color: #6b7280;
          font-size: 14px;
          text-align: right;
        }

        .usage-bar-container {
          height: 8px;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
          overflow: hidden;
        }

        .usage-bar {
          height: 100%;
          border-radius: 4px;
          width: 0%;
          animation: fillBar 1s ease-out forwards;
        }

        .total-usage-card {
          position: relative;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 16px;
          padding: 32px;
          margin-bottom: 40px;
          overflow: hidden;
          color: white;
          box-shadow: 0 20px 40px rgba(16, 185, 129, 0.3);
        }

        .total-usage-bg {
          position: absolute;
          top: -20%;
          right: -10%;
          width: 200px;
          height: 200px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
        }

        .total-usage-content {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .total-usage-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .total-usage-subtitle {
          color: rgba(255, 255, 255, 0.8);
          font-size: 18px;
        }

        .total-usage-number {
          font-size: 72px;
          font-weight: 700;
          margin-bottom: 8px;
          text-align: right;
        }

        .total-usage-label {
          color: rgba(255, 255, 255, 0.8);
          font-size: 18px;
          text-align: right;
        }

        .account-section {
          background: linear-gradient(135deg, #f8fafc, #ffffff);
          border-radius: 16px;
          padding: 32px;
          border: 1px solid #e2e8f0;
        }

        .account-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .account-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #4b5563, #1f2937);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
        }

        .account-title {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
        }

        .account-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
        }

        .account-card {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          border: 1px solid #e5e7eb;
        }

        .account-label {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 8px;
          font-weight: 500;
        }

        .account-value {
          font-weight: 600;
          color: #1f2937;
        }

        .user-id {
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 14px;
          background: #f3f4f6;
          padding: 12px;
          border-radius: 8px;
          word-break: break-all;
        }

        .feature-name {
          font-size: 18px;
        }

        .account-sublabel {
          font-size: 14px;
          color: #6b7280;
          margin-top: 4px;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes slideUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fillBar {
          from { width: 0%; }
          to { width: var(--target-width, 0%); }
        }

        @media (max-width: 768px) {
          .profile-name {
            font-size: 36px;
          }
          
          .section-title {
            font-size: 28px;
          }
          
          .total-usage-content {
            flex-direction: column;
            text-align: center;
            gap: 20px;
          }
          
          .total-usage-number {
            font-size: 56px;
            text-align: center;
          }
          
          .total-usage-label {
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { userId } = context.query;
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI as string);
    await client.connect();
    
    const db = client.db('test');
    const collection = db.collection('users');
    
    let user;
    
    if (userId && typeof userId === 'string') {
      user = await collection.findOne({ _id: new ObjectId(userId) });
    } else {
      user = await collection.findOne({});
    }
    
    await client.close();
    
    if (!user) {
      return {
        props: {
          user: null,
          error: 'User not found in database'
        }
      };
    }
    
    const serializedUser = {
      ...user,
      _id: user._id.toString()
    };
    
    return {
      props: {
        user: serializedUser
      }
    };
  } catch (error) {
    console.error('Database error:', error);
    return {
      props: {
        user: null,
        error: 'Failed to connect to database'
      }
    };
  }
};