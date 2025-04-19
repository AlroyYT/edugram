# In utils/speech_processor.py

from google.cloud import texttospeech
import os
from datetime import datetime

def text_to_speech_google(text, output_dir="media/audio_responses/"):
    """Convert text to speech using Google Cloud TTS and save as an audio file"""
    # Ensure directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # Initialize the client
    client = texttospeech.TextToSpeechClient()
    
    # Set the text input
    synthesis_input = texttospeech.SynthesisInput(text=text)
    
    # Build the voice request
    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US",
        name="en-US-Neural2-D",  # Deep male voice that sounds like Jarvis
        ssml_gender=texttospeech.SsmlVoiceGender.MALE
    )
    
    # Select the audio file type
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=0.95,  # Slightly slower for clarity
        pitch=0.0,  # Normal pitch
        volume_gain_db=1.0  # Slightly louder
    )
    
    # Perform the text-to-speech request
    response = client.synthesize_speech(
        input=synthesis_input, voice=voice, audio_config=audio_config
    )
    
    # Generate filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_path = os.path.join(output_dir, f"response_{timestamp}.mp3")
    
    # Write the response to the output file
    with open(output_path, "wb") as out:
        out.write(response.audio_content)
    
    return output_path