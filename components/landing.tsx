import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import Head from 'next/head';

const Landing = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: { clientX: any; clientY: any; }) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const testimonials = [
    { text: "EDUGRAM transformed my learning experience!", author: "Sarah Chen", role: "Computer Science Student" },
    { text: "The AI-powered insights are incredible.", author: "Michael Rodriguez", role: "Data Science Professional" },
    { text: "Finally, a platform that adapts to how I learn.", author: "Emily Johnson", role: "Engineering Student" }
  ];

  const features = [
    {
      icon: "🎯",
      title: "AI-Powered Personalization",
      description: "Advanced machine learning algorithms create personalized learning paths tailored to your unique cognitive patterns and learning preferences.",
      gradient: "from-blue-500 via-purple-500 to-pink-500"
    },
    {
      icon: "🚀",
      title: "Accelerated Learning",
      description: "Boost your learning speed by 3x with our scientifically-backed spaced repetition and active recall techniques.",
      gradient: "from-green-400 via-blue-500 to-purple-600"
    },
    {
      icon: "🔍",
      title: "Smart Analytics",
      description: "Real-time performance insights and predictive analytics help you identify strengths and optimize weak areas.",
      gradient: "from-orange-400 via-pink-500 to-red-500"
    },
    {
      icon: "🌟",
      title: "Interactive Content",
      description: "Engage with dynamic, multimedia content including AR/VR experiences, interactive simulations, and gamified challenges.",
      gradient: "from-purple-400 via-indigo-500 to-blue-600"
    },
    {
      icon: "📊",
      title: "Progress Visualization",
      description: "Beautiful, intuitive dashboards provide comprehensive views of your learning journey with actionable insights.",
      gradient: "from-teal-400 via-cyan-500 to-blue-600"
    },
    {
      icon: "🤝",
      title: "Collaborative Learning",
      description: "Connect with peers, join study groups, and participate in knowledge-sharing communities worldwide.",
      gradient: "from-pink-400 via-red-500 to-yellow-500"
    }
  ];

  const stats = [
    { value: "500K+", label: "Active Learners" },
    { value: "98%", label: "Success Rate" },
    { value: "50+", label: "Countries" },
    { value: "4.9★", label: "User Rating" }
  ];

  return (
    <>
      <Head>
        <title>EDUGRAM | Your AI-Powered Learning Platform</title>
        <meta name="description" content="Personalized learning experiences with EDUGRAM's AI technology" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="edu-advanced-landing">
        {/* Dynamic Background */}
        <div className="edu-dynamic-bg">
          <div className="edu-gradient-orb edu-orb-1"></div>
          <div className="edu-gradient-orb edu-orb-2"></div>
          <div className="edu-gradient-orb edu-orb-3"></div>
          <div className="edu-gradient-orb edu-orb-4"></div>
          <div className="edu-gradient-orb edu-orb-5"></div>
        </div>

        {/* Mouse Follower */}
        <div 
          className="edu-mouse-follower"
          style={{
            left: mousePosition.x - 200,
            top: mousePosition.y - 200,
          }}
        ></div>

        {/* Hero Section */}
        <section className="edu-hero-section">
          <div className="edu-hero-content">
            <div className="edu-hero-text">
              <div className="edu-hero-badge">
                <span>✨ Powered by Advanced AI</span>
              </div>
              
              <h1 className="edu-hero-title">
                Transform Learning with 
                <span className="edu-gradient-text"> EDUGRAM</span>
                <div className="edu-title-decoration"></div>
              </h1>
              
              <p className="edu-hero-description">
                Experience the future of education with our revolutionary AI-powered platform. 
                Join over 500,000 learners who've accelerated their journey to success with 
                personalized, adaptive learning experiences.
              </p>

              <div className="edu-hero-stats">
                {stats.map((stat, index) => (
                  <div key={index} className="edu-stat-item">
                    <div className="edu-stat-value">{stat.value}</div>
                    <div className="edu-stat-label">{stat.label}</div>
                  </div>
                ))}
              </div>

              <div className="edu-hero-actions">
                <button 
                  onClick={() => signIn('google')} 
                  className="edu-primary-cta"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                >
                  <img src="/images/google-icon-logo-svgrepo-com.svg" alt="Google" />
                  <span>Start Learning with Google</span>
                  <div className="edu-btn-glow"></div>
                </button>
                
                <button 
                  className="edu-secondary-cta"
                  onClick={() => window.open('https://www.youtube.com/watch?v=NI1kW_3qH88&t=0s', '_blank')}
                >
                  <span>Watch Demo</span>
                  <div className="edu-play-icon">▶</div>
                </button>
              </div>

              <div className="edu-testimonial-slider">
                <div className="edu-testimonial">
                  <p>"{testimonials[currentTestimonial].text}"</p>
                  <div className="edu-testimonial-author">
                    <strong>{testimonials[currentTestimonial].author}</strong>
                    <span>{testimonials[currentTestimonial].role}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="edu-hero-visual">
              <div className="edu-image-container">
                <div className="edu-image-glow"></div>
                <img src="/images/edugramlogo.png" alt="EDUGRAM Learning Platform" />
                <div className="edu-floating-elements">
                  <div className="edu-float-1">📚</div>
                  <div className="edu-float-2">🎓</div>
                  <div className="edu-float-3">💡</div>
                  <div className="edu-float-4">🚀</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="edu-features-section">
          <div className="edu-section-header">
            <h2>Why Choose EDUGRAM?</h2>
            <p>Cutting-edge features designed to maximize your learning potential</p>
          </div>
          
          <div className="edu-features-grid">
            {features.map((feature, index) => (
              <div key={index} className="edu-feature-card">
                <div className={`edu-feature-gradient bg-gradient-to-br ${feature.gradient}`}></div>
                <div className="edu-feature-content">
                  <div className="edu-feature-icon">{feature.icon}</div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
                <div className="edu-card-shine"></div>
              </div>
            ))}
          </div>
        </section>

        {/* Interactive Demo Section */}
        <section className="edu-demo-section">
          <div className="edu-demo-content">
            <div className="edu-demo-text">
              <h2>Experience the Future of Learning</h2>
              <p>See how our AI adapts to your learning style in real-time</p>
              <div className="edu-demo-features">
                <div className="edu-demo-feature">
                  <div className="edu-check-icon">✓</div>
                  <span>Real-time adaptation to your pace</span>
                </div>
                <div className="edu-demo-feature">
                  <div className="edu-check-icon">✓</div>
                  <span>Personalized content recommendations</span>
                </div>
                <div className="edu-demo-feature">
                  <div className="edu-check-icon">✓</div>
                  <span>Interactive progress tracking</span>
                </div>
              </div>
            </div>
            <div className="edu-demo-visual">
              <div className="edu-demo-mockup">
                <div className="edu-mockup-header">
                  <div className="edu-mockup-dots">
                    <span></span><span></span><span></span>
                  </div>
                </div>
                <div className="edu-mockup-content">
                  <div className="edu-progress-bars">
                    <div className="edu-progress-bar">
                      <span>Machine Learning</span>
                      <div className="edu-progress"><div style={{width: '85%'}}></div></div>
                    </div>
                    <div className="edu-progress-bar">
                      <span>Data Structures</span>
                      <div className="edu-progress"><div style={{width: '72%'}}></div></div>
                    </div>
                    <div className="edu-progress-bar">
                      <span>Algorithms</span>
                      <div className="edu-progress"><div style={{width: '91%'}}></div></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="edu-final-cta">
          <div className="edu-cta-content">
            <h2>Ready to Transform Your Learning?</h2>
            <p>Join the revolution in personalized education</p>
            <button 
              onClick={() => signIn('google')} 
              className="edu-final-cta-btn"
            >
              <img src="/images/google-icon-logo-svgrepo-com.svg" alt="Google" />
              <span>Get Started Now</span>
            </button>
          </div>
        </section>
      </div>
    </>
  );
};

export default Landing;
