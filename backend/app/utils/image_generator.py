import requests
from PIL import Image
from huggingface_hub import InferenceClient
import os
import random
from dotenv import load_dotenv
from django.conf import settings

load_dotenv()

HF_MODEL = "stabilityai/stable-diffusion-xl-base-1.0"

TEMP_DIR = os.path.join(settings.BASE_DIR, "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

def generate_image(prompt, index):
    filename = os.path.join(TEMP_DIR, f"temp_img_{index}.jpg")

    # --- Strategy 1: Hugging Face ---
    try:
        print(f"🎨 Generating image {index} (HF XL)...")
        client = InferenceClient(
            model=HF_MODEL,
            token=os.getenv("HF_API_KEY")
        )
        image = client.text_to_image(prompt)
        image.save(filename)
        return filename

    except Exception as e:
        print("⚠️ HF failed:", e)

    # --- Strategy 2: Picsum ---
    try:
        seed = len(prompt) + index + random.randint(1, 100)
        url = f"https://picsum.photos/seed/{seed}/1280/720"
        response = requests.get(url, timeout=10)

        if response.status_code == 200:
            with open(filename, "wb") as f:
                f.write(response.content)
            return filename

    except Exception as e:
        print("⚠️ Picsum failed:", e)

    # --- Strategy 3: Emergency fallback ---
    img = Image.new("RGB", (1280, 720), color=(0, 0, 0))
    img.save(filename)
    return filename
