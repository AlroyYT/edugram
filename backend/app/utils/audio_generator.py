import edge_tts
import asyncio
import os
from django.conf import settings

# Temp directory for audio files
TEMP_DIR = os.path.join(settings.BASE_DIR, "temp")
os.makedirs(TEMP_DIR, exist_ok=True)


async def _generate_audio(text, output_path):
    """
    Async helper to generate TTS audio using edge-tts.
    Generates ONLY audio (no subtitles).
    """
    voice = "en-US-ChristopherNeural"
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)


def generate_audio(text, index):
    """
    Public function used by views.py.
    Generates ONLY audio and returns the audio path.
    """
    audio_path = os.path.join(TEMP_DIR, f"temp_audio_{index}.mp3")

    # Remove old audio if it exists
    if os.path.exists(audio_path):
        os.remove(audio_path)

    try:
        loop = asyncio.get_event_loop()

        if loop.is_running():
            # If already inside an event loop (rare in Django)
            asyncio.create_task(_generate_audio(text, audio_path))
        else:
            loop.run_until_complete(_generate_audio(text, audio_path))

    except RuntimeError:
        # Fallback when no event loop exists
        asyncio.run(_generate_audio(text, audio_path))

    return audio_path
