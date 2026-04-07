/**
 * Auto-translate plugin for Next.js/React apps.
 * Uses MutationObserver to re-translate after React re-renders.
 * Caches translations in localStorage for instant repeat loads.
 */

let currentLang = "en"
let observer: MutationObserver | null = null
let translating = false
let debounceId: ReturnType<typeof setTimeout> | null = null

// In-memory cache: { lang: { originalText: translatedText } }
let cache: Record<string, Record<string, string>> = {}

/** Load cache from localStorage on init */
function loadCache() {
  try {
    const saved = localStorage.getItem("translation_cache")
    if (saved) cache = JSON.parse(saved)
  } catch {
    cache = {}
  }
}

/** Save cache to localStorage */
function saveCache() {
  try {
    localStorage.setItem("translation_cache", JSON.stringify(cache))
  } catch {
    // localStorage full or unavailable — ignore
  }
}

// Load cache immediately on module load
if (typeof window !== "undefined") {
  loadCache()
}

/**
 * Collect all translatable text nodes from a root element.
 */
function getTextNodes(root: Node = document.body): Text[] {
  const nodes: Text[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const el = node.parentElement
      if (!el) return NodeFilter.FILTER_REJECT

      const tag = el.tagName
      if (["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA"].includes(tag)) {
        return NodeFilter.FILTER_REJECT
      }

      if (el.closest("[data-no-translate]")) {
        return NodeFilter.FILTER_REJECT
      }

      const text = node.nodeValue?.trim()
      if (!text || text.length < 2) return NodeFilter.FILTER_REJECT

      if (/^[\d\s.,!?:;%$€£¥+\-*/=<>()[\]{}|\\@#&^~`'"]+$/.test(text)) {
        return NodeFilter.FILTER_REJECT
      }

      return NodeFilter.FILTER_ACCEPT
    },
  })

  let n: Node | null
  while ((n = walker.nextNode())) {
    nodes.push(n as Text)
  }
  return nodes
}

function disconnectObserver() {
  observer?.disconnect()
}

function connectObserver() {
  if (!observer) {
    observer = new MutationObserver(() => {
      if (currentLang === "en" || translating) return
      if (debounceId) clearTimeout(debounceId)
      debounceId = setTimeout(() => {
        doTranslate(currentLang)
      }, 300)
    })
  }

  if (currentLang !== "en") {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }
}

/**
 * Core translation: applies cached translations instantly,
 * then fetches uncached ones in the background.
 */
async function doTranslate(lang: string) {
  if (translating || lang === "en") return
  translating = true
  disconnectObserver()

  try {
    const nodes = getTextNodes()
    if (!cache[lang]) cache[lang] = {}
    const langCache = cache[lang]

    const nodeEntries: { node: Text; text: string }[] = []
    const uncachedSet = new Set<string>()

    for (const node of nodes) {
      const text = node.nodeValue!.trim()
      nodeEntries.push({ node, text })

      if (langCache[text]) {
        // INSTANT: Apply cached translation immediately
        const original = node.nodeValue!
        node.nodeValue = original.replace(text, langCache[text])
      } else {
        uncachedSet.add(text)
      }
    }

    // Fetch uncached translations from API (higher concurrency for speed)
    const uncachedTexts = Array.from(uncachedSet)
    const BATCH_SIZE = 50

    for (let i = 0; i < uncachedTexts.length; i += BATCH_SIZE) {
      const batch = uncachedTexts.slice(i, i + BATCH_SIZE)
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: batch, target: lang }),
        })
        const data = await res.json()

        if (data?.translations && Array.isArray(data.translations)) {
          batch.forEach((original, idx) => {
            if (data.translations[idx]) {
              langCache[original] = data.translations[idx]
            }
          })
        }
      } catch (err) {
        console.error("Translation batch failed:", err)
      }
    }

    // Apply newly fetched translations
    for (const { node, text } of nodeEntries) {
      if (langCache[text] && node.parentElement) {
        const current = node.nodeValue!
        const trimmed = current.trim()
        // Only replace if not already translated
        if (trimmed !== langCache[text]) {
          node.nodeValue = current.replace(trimmed, langCache[text])
        }
      }
    }

    // Persist cache to localStorage for instant loads next time
    saveCache()
  } catch (err) {
    console.error("Translation error:", err)
  } finally {
    translating = false
    connectObserver()
  }
}

/**
 * Main entry point. Call this when the user picks a language.
 */
export async function autoTranslate(targetLang: string) {
  currentLang = targetLang
  localStorage.setItem("lang", targetLang)

  if (targetLang === "en") {
    disconnectObserver()
    window.location.reload()
    return
  }

  await doTranslate(targetLang)
}