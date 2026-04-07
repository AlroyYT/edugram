import { useState, useEffect } from "react"
import { autoTranslate } from "../plugins/autoTranslate"

export default function LanguageSwitcher() {
  const [activeLang, setActiveLang] = useState("en")
  const [loading, setLoading] = useState(false)

  // Read saved language from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("lang")
    if (saved) setActiveLang(saved)
  }, [])

  const languages = [
    { code: "en", label: "English" },
    { code: "hi", label: "हिन्दी" },
    { code: "kn", label: "ಕನ್ನಡ" },
    { code: "ta", label: "தமிழ்" },
    { code: "te", label: "తెలుగు" },
  ]

  const handleTranslate = async (lang: string) => {
    if (loading || lang === activeLang) return
    setActiveLang(lang)
    setLoading(true)

    setTimeout(async () => {
      try {
        await autoTranslate(lang)
      } finally {
        setLoading(false)
      }
    }, 200)
  }

  return (
    <div
      data-no-translate
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 9999,
        display: "flex",
        gap: "6px",
        alignItems: "center",
      }}
    >
      {loading && (
        <span style={{ fontSize: "12px", color: "#6366f1", marginRight: 4 }}>
          Translating...
        </span>
      )}
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleTranslate(lang.code)}
          style={{
            padding: "6px 14px",
            borderRadius: "6px",
            border: activeLang === lang.code ? "2px solid #6366f1" : "1px solid #ccc",
            background: activeLang === lang.code ? "#6366f1" : "#fff",
            color: activeLang === lang.code ? "#fff" : "#333",
            cursor: loading ? "wait" : "pointer",
            fontSize: "13px",
            fontWeight: 500,
            opacity: loading ? 0.7 : 1,
          }}
          disabled={loading}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}