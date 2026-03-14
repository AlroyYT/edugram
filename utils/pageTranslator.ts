export async function translatePage(targetLang: string) {

    const elements = document.querySelectorAll("p, span, h1, h2, h3, h4, h5, h6, button, a, label")

    for (const el of elements) {

        const text = el.textContent?.trim()

        if (!text) continue

        try {

            const res = await fetch("https://libretranslate.com/translate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    q: text,
                    source: "en",
                    target: targetLang,
                    format: "text"
                })
            })

            const data = await res.json()

            if (data.translatedText) {
                el.textContent = data.translatedText
            }

        } catch (err) {
            console.error("Translation error", err)
        }

    }
}