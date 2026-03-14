import React, { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';

const Landing = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const { t } = useTranslation();

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
    { text: t("testimonial_1_text"), author: t("testimonial_1_author"), role: t("testimonial_1_role") },
    { text: t("testimonial_2_text"), author: t("testimonial_2_author"), role: t("testimonial_2_role") },
    { text: t("testimonial_3_text"), author: t("testimonial_3_author"), role: t("testimonial_3_role") }
  ];

  const features = [
    {
      icon: "🎯",
      title: t("feature_ai_title"),
      description: t("feature_ai_desc"),
      gradient: "from-blue-500 via-purple-500 to-pink-500"
    },
    {
      icon: "🚀",
      title: t("feature_accel_title"),
      description: t("feature_accel_desc"),
      gradient: "from-green-400 via-blue-500 to-purple-600"
    },
    {
      icon: "🔍",
      title: t("feature_analytics_title"),
      description: t("feature_analytics_desc"),
      gradient: "from-orange-400 via-pink-500 to-red-500"
    },
    {
      icon: "🌟",
      title: t("feature_interactive_title"),
      description: t("feature_interactive_desc"),
      gradient: "from-purple-400 via-indigo-500 to-blue-600"
    },
    {
      icon: "📊",
      title: t("feature_progress_title"),
      description: t("feature_progress_desc"),
      gradient: "from-teal-400 via-cyan-500 to-blue-600"
    },
    {
      icon: "🤝",
      title: t("feature_collab_title"),
      description: t("feature_collab_desc"),
      gradient: "from-pink-400 via-red-500 to-yellow-500"
    }
  ];

  const stats = [
    { value: "500K+", label: t("stat_learners") },
    { value: "98%", label: t("stat_success") },
    { value: "50+", label: t("stat_countries") },
    { value: "4.9★", label: t("stat_rating") }
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
                <span>{t("hero_badge")}</span>
              </div>

              <h1 className="edu-hero-title">
                {t("hero_title_1")}
                <span className="edu-gradient-text"> {t("hero_title_2")}</span>
                <div className="edu-title-decoration"></div>
              </h1>

              <p className="edu-hero-description">
                {t("hero_description")}
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
                  <span>{t("hero_cta_google")}</span>
                  <div className="edu-btn-glow"></div>
                </button>

                <button
                  className="edu-secondary-cta"
                  onClick={() => window.open('https://www.youtube.com/watch?v=NI1kW_3qH88&t=0s', '_blank')}
                >
                  <span>{t("hero_cta_demo")}</span>
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
            <h2>{t("why_choose")}</h2>
            <p>{t("why_choose_desc")}</p>
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
              <h2>{t("experience_future")}</h2>
              <p>{t("experience_future_desc")}</p>
              <div className="edu-demo-features">
                <div className="edu-demo-feature">
                  <div className="edu-check-icon">✓</div>
                  <span>{t("demo_feature_1")}</span>
                </div>
                <div className="edu-demo-feature">
                  <div className="edu-check-icon">✓</div>
                  <span>{t("demo_feature_2")}</span>
                </div>
                <div className="edu-demo-feature">
                  <div className="edu-check-icon">✓</div>
                  <span>{t("demo_feature_3")}</span>
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
                      <span>{t("machine_learning")}</span>
                      <div className="edu-progress"><div style={{ width: '85%' }}></div></div>
                    </div>
                    <div className="edu-progress-bar">
                      <span>{t("data_structures")}</span>
                      <div className="edu-progress"><div style={{ width: '72%' }}></div></div>
                    </div>
                    <div className="edu-progress-bar">
                      <span>{t("algorithms")}</span>
                      <div className="edu-progress"><div style={{ width: '91%' }}></div></div>
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
            <h2>{t("ready_transform")}</h2>
            <p>{t("join_revolution")}</p>
            <button
              onClick={() => signIn('google')}
              className="edu-final-cta-btn"
            >
              <img src="/images/google-icon-logo-svgrepo-com.svg" alt="Google" />
              <span>{t("get_started")}</span>
            </button>
          </div>
        </section>
      </div>
    </>
  );
};

export default Landing;
