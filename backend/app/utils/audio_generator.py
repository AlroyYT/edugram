import edge_tts
import asyncio
import os
from django.conf import settings

TEMP_DIR = os.path.join(settings.BASE_DIR, "temp")
os.makedirs(TEMP_DIR, exist_ok=True)

async def _generate_audio(text, output_file):
    voice = "en-US-ChristopherNeural"
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_file)

def generate_audio(text, index):
    output_file = os.path.join(TEMP_DIR, f"temp_audio_{index}.mp3")

    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(_generate_audio(text, output_file))
        else:
            loop.run_until_complete(_generate_audio(text, output_file))
    except RuntimeError:
        asyncio.run(_generate_audio(text, output_file))

    return output_file
