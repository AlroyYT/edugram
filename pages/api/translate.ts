import type { NextApiRequest, NextApiResponse } from "next"

/**
 * Translation API endpoint.
 * Uses lingva.ml (free Google Translate proxy) as primary,
 * with Google Translate free endpoint as fallback.
 */

async function translateSingle(text: string, target: string): Promise<string> {
  // Primary: lingva.ml (clean JSON response)
  try {
    const encoded = encodeURIComponent(text)
    const res = await fetch(
      `https://lingva.ml/api/v1/en/${target}/${encoded}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (res.ok) {
      const data = await res.json()
      if (data?.translation) return data.translation
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback: Google Translate free endpoint
  try {
    const encoded = encodeURIComponent(text)
    const res = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${target}&dt=t&q=${encoded}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (res.ok) {
      const data = await res.json()
      // Response format: [[[translatedText, originalText, ...]]]
      if (data?.[0]) {
        const translated = data[0].map((segment: any[]) => segment[0]).join("")
        if (translated) return translated
      }
    }
  } catch {
    // Return original on total failure
  }

  return text
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { texts, target } = req.body || {}

  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: "Invalid texts array" })
  }

  if (!target) {
    return res.status(400).json({ error: "Target language missing" })
  }

  try {
    // Translate with concurrency limit to avoid overwhelming the API
    const CONCURRENCY = 10
    const translations: string[] = new Array(texts.length).fill("")

    for (let i = 0; i < texts.length; i += CONCURRENCY) {
      const batch = texts.slice(i, i + CONCURRENCY)
      const results = await Promise.all(
        batch.map((text: string) => translateSingle(text, target))
      )
      results.forEach((result, j) => {
        translations[i + j] = result
      })
    }

    res.status(200).json({ translations })
  } catch (err) {
    console.error("Translation error:", err)
    res.status(500).json({ error: "Translation failed" })
  }
}