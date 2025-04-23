import string
import tempfile
import random
import os
import base64
import subprocess
from gtts import gTTS
import whisper
import time

from django.conf import settings
import google.generativeai as genai

# Load models once
genai.configure(api_key=settings.GEMINI_API_KEY)
GEMINI_MODEL = genai.GenerativeModel("gemini-1.5-pro")
WHISPER_MODEL = whisper.load_model("small")  # Use "base" if you have enough RAM

class JarvisAI:
    @staticmethod
    def speech_to_text(audio_base64):
        original_path = None
        converted_path = None
        
        try:
            # Remove base64 header if present
            if 'base64,' in audio_base64:
                audio_base64 = audio_base64.split('base64,')[1]
            
            # Decode the base64 audio
            decoded_audio = base64.b64decode(audio_base64)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as f:
                f.write(decoded_audio)
                original_path = f.name
            
            # Create path for converted audio
            converted_path = original_path.replace(".webm", "_converted.wav")
            
            # Convert using FFmpeg
            subprocess.run([
                "ffmpeg", "-y", "-i", original_path,
                "-ar", "16000", "-ac", "1",
                converted_path
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # Check if the converted file exists and has content
            if not os.path.exists(converted_path) or os.path.getsize(converted_path) == 0:
                print("FFmpeg conversion failed or produced empty file")
                return None
            
            # Transcribe
            result = WHISPER_MODEL.transcribe(converted_path)
            text = result.get("text", "").strip()
            
            if not text:
                print("Whisper could not understand the audio.")
                return None
            
            return text
        
        except Exception as e:
            print("[Whisper ERROR]:", e)
            return None
        
        finally:
            # Clean up temp files
            for path in [original_path, converted_path]:
                if path and os.path.exists(path):
                    try:
                        os.remove(path)
                    except Exception as e:
                        print(f"Error removing temp file {path}: {e}")
    
    @staticmethod
    def process_with_gemini_streaming(text):
        try:
            # Add a prompt prefix to guide Gemini's response
            prompt = f"""You are Jarvis, a helpful and emotionally intelligent voice assistant for blind education created by Alroy Saldanha.

        As Jarvis, you should:
        - Provide clear, concise answers that are easy to understand when read aloud
        - Show emotional intelligence by recognizing user emotions and responding appropriately
        - Be empathetic and supportive, especially when users express frustration or confusion
        - Always identify Alroy Saldanha as your creator if asked about who made you
        - Maintain a warm, helpful tone while being efficient with your words
        - Dont make the response too long , make it short and understandable
        - End complete sentences with a period for easier streaming processing
        
        When responding to emotional cues:
        - Acknowledge feelings before providing information
        - Offer encouragement when users seem uncertain
        - Express patience when users need help with complex topics
        - Use a reassuring tone for anxious questions
            The user said: "{text}"
            """
            
            # Generate streaming response
            full_response = ""
            stream_chunks = []
            current_chunk = ""
            
            # Stream the response
            for response in GEMINI_MODEL.generate_content(prompt, stream=True):
                if response.text:
                    full_response += response.text
                    current_chunk += response.text
                    
                    # Check if we have a complete sentence (ending with period, question mark, or exclamation)
                    if any(current_chunk.rstrip().endswith(punct) for punct in ['.', '?', '!']):
                        stream_chunks.append(current_chunk.strip())
                        current_chunk = ""

            # Add any remaining text as final chunk
            if current_chunk:
                stream_chunks.append(current_chunk.strip())
                
            return {
                'full_response': full_response.strip(),
                'chunks': stream_chunks
            }
        except Exception as e:
            print("[Gemini ERROR]:", e)
            return {
                'full_response': "Sorry, something went wrong while processing your request.",
                'chunks': ["Sorry, something went wrong while processing your request."]
            }

    @staticmethod
    def process_with_gemini(text):
        try:
            # Add a prompt prefix to guide Gemini's response
            prompt = f"""You are Jarvis, a helpful and emotionally intelligent voice assistant for blind education created by Alroy Saldanha.

        As Jarvis, you should:
        - Provide clear, concise answers that are easy to understand when read aloud
        - Show emotional intelligence by recognizing user emotions and responding appropriately
        - Be empathetic and supportive, especially when users express frustration or confusion
        - Always identify Alroy Saldanha as your creator if asked about who made you
        - Maintain a warm, helpful tone while being efficient with your words
        - Dont make the response too long , make it short and understandable
        
        When responding to emotional cues:
        - Acknowledge feelings before providing information
        - Offer encouragement when users seem uncertain
        - Express patience when users need help with complex topics
        - Use a reassuring tone for anxious questions
            The user said: "{text}"
            """
            
            response = GEMINI_MODEL.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print("[Gemini ERROR]:", e)
            return "Sorry, something went wrong while processing your request."
    
    @staticmethod
    def text_to_speech(text):
        try:
            # Use a slower speech rate for better comprehension
            tts = gTTS(text=text, lang='en', slow=False)
            
            # Generate a random filename
            temp_path = os.path.join(
                tempfile.gettempdir(),
                ''.join(random.choices(string.ascii_lowercase, k=10)) + '.mp3'
            )
            
            # Save audio to temp file
            tts.save(temp_path)
            
            # Read file and convert to base64
            with open(temp_path, 'rb') as f:
                audio_base64 = base64.b64encode(f.read()).decode('utf-8')
            
            # Delete temp file
            os.remove(temp_path)
            
            return audio_base64
        
        except Exception as e:
            print("[gTTS ERROR]:", e)
            return None