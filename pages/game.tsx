// pages/index.tsx

import Head from "next/head";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  const navigateToGame = (game: string) => {
    if (game === "dungeon") {
      window.location.href = "/dungeon.html";
    } else if (game === "tower") {
      window.location.href = "/tower.html";
    }
  };

  return (
    <>
      <Head>
        <title>Gamified Learning</title>
        <meta
          name="description"
          content="Interactive gamified education platform"
        />
      </Head>

      <main style={styles.page}>
        {/* Background Effects */}
        <div style={styles.bgGlow1}></div>
        <div style={styles.bgGlow2}></div>

        {/* Header */}
        <section style={styles.hero}>
          <h1 style={styles.title}>Gamified Learning</h1>
          <p style={styles.subtitle}>
            Learn through immersive adventures, strategy, and gameplay.
          </p>
        </section>

        {/* Buttons */}
        <section style={styles.buttonContainer}>
          <button
            style={styles.cardButton}
            onClick={() => navigateToGame("dungeon")}
          >
            <span style={styles.icon}>⚔️</span>
            <h2 style={styles.cardTitle}>Dungeon Master</h2>
            <p style={styles.cardDesc}>
              Enter a fantasy world where knowledge unlocks paths.
            </p>
          </button>

          <button
            style={styles.cardButton}
            onClick={() => navigateToGame("tower")}
          >
            <span style={styles.icon}>🏰</span>
            <h2 style={styles.cardTitle}>Tower Siege</h2>
            <p style={styles.cardDesc}>
              Defend your tower by solving challenges and mastering concepts.
            </p>
          </button>

          <button
            style={styles.cardButton}
            onClick={() => navigateToGame("tower")}
          >
            <span style={styles.icon}>🏰</span>
            <h2 style={styles.cardTitle}>Basic Games</h2>
            <p style={styles.cardDesc}>
              Interactive crosswords and puzzles to test your knowledge and critical thinking.
            </p>
          </button>
        </section>
      </main>
    </>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  page: {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #0f172a 0%, #111827 35%, #1e293b 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    padding: "40px",
    fontFamily: "Segoe UI, sans-serif",
  },

  bgGlow1: {
    position: "absolute",
    width: "400px",
    height: "400px",
    background: "rgba(59,130,246,0.25)",
    borderRadius: "50%",
    top: "-100px",
    left: "-100px",
    filter: "blur(100px)",
  },

  bgGlow2: {
    position: "absolute",
    width: "400px",
    height: "400px",
    background: "rgba(236,72,153,0.20)",
    borderRadius: "50%",
    bottom: "-120px",
    right: "-100px",
    filter: "blur(100px)",
  },

  hero: {
    textAlign: "center",
    marginBottom: "60px",
    zIndex: 2,
  },

  title: {
    fontSize: "4rem",
    fontWeight: 800,
    color: "#ffffff",
    marginBottom: "16px",
    letterSpacing: "1px",
  },

  subtitle: {
    fontSize: "1.2rem",
    color: "rgba(255,255,255,0.75)",
    maxWidth: "700px",
    lineHeight: 1.6,
  },

  buttonContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "30px",
    width: "100%",
    maxWidth: "900px",
    zIndex: 2,
  },

  cardButton: {
    padding: "35px",
    borderRadius: "24px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.08)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
    cursor: "pointer",
    transition: "all 0.35s ease",
    color: "#fff",
    textAlign: "left",
    boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
  },

  icon: {
    fontSize: "2.5rem",
    display: "block",
    marginBottom: "18px",
  },

  cardTitle: {
    fontSize: "1.8rem",
    marginBottom: "12px",
    fontWeight: 700,
  },

  cardDesc: {
    fontSize: "1rem",
    color: "rgba(255,255,255,0.75)",
    lineHeight: 1.5,
  },
};