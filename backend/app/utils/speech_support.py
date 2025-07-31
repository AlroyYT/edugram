# utils.py

from openai import OpenAI
from difflib import SequenceMatcher

from backend.backend import settings

# Replace with your actual token and endpoint
token = settings.OPENAI_API_KEY  # <-- Your GitHub token or OpenAI key
endpoint = "https://models.github.ai/inference"  # <-- Your custom base URL (if applicable)
model = "openai/gpt-4.1"

client = OpenAI(
    base_url=endpoint,
    api_key=token,
)

difficulty_prompts = {
    "easy": "Generate one very short and simple sentence for a 5-year-old child.",
    "medium": "Generate one short sentence suitable for a school child around 12 years old.",
    "hard": "Generate one grammatically complex and vocabulary-rich sentence suitable for a college student practicing speech articulation."
}

def get_openai_sentence(difficulty):
    difficulty = difficulty.lower().strip()

    if difficulty not in difficulty_prompts:
        raise ValueError(f"Invalid difficulty level: '{difficulty}'")

    prompt = difficulty_prompts[difficulty]
    
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a helpful assistant generating speech practice sentences."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=30,
            temperature=0.7,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Error generating sentence: {str(e)}"

def evaluate_sentence(original, spoken):
    matcher = SequenceMatcher(None, original.lower(), spoken.lower())
    similarity = matcher.ratio()

    if similarity >= 0.9:
        result = "Excellent ✅"
    elif similarity >= 0.7:
        result = "Good 👍"
    elif similarity >= 0.4:
        result = "Try Again 👀"
    else:
        result = "Poor ❌"

    return {
        "original": original,
        "spoken": spoken,
        "score": round(similarity, 2),
        "result": result
    }
