import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY_VIDEO"))

def generate_script(topic: str):
    model = genai.GenerativeModel("gemini-2.5-flash")

    prompt = f"""
    You are an educational video creator. Create a script for a short video about: "{topic}".

    Strictly output a JSON list of exactly 5 dictionaries.
    Each dictionary must have:
    - "text": narration under 15 words
    - "image_prompt": detailed visual prompt
    """

    response = model.generate_content(
        prompt,
        generation_config={"response_mime_type": "application/json"}
    )

    try:
        data = json.loads(response.text)
        return data if isinstance(data, list) else []
    except Exception as e:
        print("❌ Script JSON error:", e)
        return []