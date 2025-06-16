import string
import tempfile
import random
import os
import base64
import subprocess
from gtts import gTTS
import whisper
import time
import torch
import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta
import traceback
import re
import concurrent.futures
import threading
from queue import Queue
import asyncio
import aiohttp
from functools import lru_cache

from django.conf import settings
import google.generativeai as genai

# Load models once
genai.configure(api_key=settings.GEMINI_API_KEY)
GEMINI_MODEL = genai.GenerativeModel("gemini-2.0-flash")

# Check for GPU availability and set device
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
if DEVICE == "cuda":
    print(f"Using GPU: {torch.cuda.get_device_name(0)}")
else:
    print("GPU not available, using CPU")

# Load Whisper model with device specification - Use tiny for speed
WHISPER_MODEL = whisper.load_model("small", device=DEVICE)  # Changed from "small" to "tiny"

# Thread pool for parallel processing
THREAD_POOL = concurrent.futures.ThreadPoolExecutor(max_workers=4)

# Cache for TTS to avoid regenerating same responses
TTS_CACHE = {}
CACHE_SIZE_LIMIT = 100

class JarvisAI:
    @staticmethod
    def speech_to_text_fast(audio_base64):
        """Optimized speech-to-text with faster processing"""
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
            
            # Convert using FFmpeg with optimized settings for speed
            subprocess.run([
                "ffmpeg", "-y", "-i", original_path,
                "-ar", "16000", "-ac", "1", "-af", "silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB",
                converted_path
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # Check if the converted file exists and has content
            if not os.path.exists(converted_path) or os.path.getsize(converted_path) == 0:
                print("FFmpeg conversion failed or produced empty file")
                return None
            
            # Transcribe with GPU support and optimized settings
            result = WHISPER_MODEL.transcribe(
                converted_path,
                fp16=torch.cuda.is_available(),  # Use FP16 on GPU for speed
                no_speech_threshold=0.6,
                logprob_threshold=-1.0,
                compression_ratio_threshold=2.4
            )
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
    def text_to_speech_cached(text, use_cache=True):
        """Cached TTS for frequently used responses"""
        if use_cache:
            text_hash = hash(text)
            if text_hash in TTS_CACHE:
                return TTS_CACHE[text_hash]
        
        try:
            # Use faster TTS settings
            tts = gTTS(text=text, lang='en', slow=False, tld='com')
            
            # Generate a random filename
            temp_path = os.path.join(
                tempfile.gettempdir(),
                ''.join(random.choices(string.ascii_lowercase, k=8)) + '.mp3'
            )
            
            # Save audio to temp file
            tts.save(temp_path)
            
            # Read file and convert to base64
            with open(temp_path, 'rb') as f:
                audio_base64 = base64.b64encode(f.read()).decode('utf-8')
            
            # Delete temp file
            os.remove(temp_path)
            
            # Cache the result if using cache
            if use_cache and len(TTS_CACHE) < CACHE_SIZE_LIMIT:
                text_hash = hash(text)
                TTS_CACHE[text_hash] = audio_base64
            
            return audio_base64
        
        except Exception as e:
            print("[gTTS ERROR]:", e)
            return None

    @staticmethod
    def process_with_gemini_streaming_fast(text, context="", news_data=None):
        """Optimized Gemini processing with shorter, more focused responses"""
        try:
            # Check if this is a news query and we have news data
            is_news_query, category, search_term = JarvisAI.detect_news_intent(text)
            
            # If this is a news request and we have news data, create a direct response
            if is_news_query and news_data and news_data.get("status") == "success" and news_data.get("articles"):
                return JarvisAI._create_news_response_fast(news_data, search_term, category)
            
            # Optimized prompt for faster, more concise responses
            base_prompt = """You are Jarvis, a voice assistant by Alroy Saldanha. Be concise and direct.

            Rules:
            - Keep responses under 100 words for voice clarity
            - whenever asked to give coding questions , give the entire code without any comments and please complete it
            - Be helpful but brief
            - Use simple sentences for better TTS
            - No long explanations unless specifically asked
            - For complex topics, give overview first, offer details if needed
            - Show empathy but stay focused
            - Always end with proper punctuation
            - explain in such a way anyone can easily understand the concepts
            - dont explain a concept in only one line, take atleast 3-4 lines to explain
            """
            
            # Add news context if this was a failed news query
            if is_news_query and (not news_data or news_data.get("status") != "success"):
                base_prompt += "\n\nNote: News fetch failed. Acknowledge briefly and offer to retry."
            
            # Construct the full prompt with context if available
            if context:
                # Limit context to avoid long processing times
                context_lines = context.split('\n')[-10:]  # Last 10 lines only
                limited_context = '\n'.join(context_lines)
                prompt = f"{base_prompt}\n\n{limited_context}\nUser: \"{text}\""
            else:
                prompt = f"{base_prompt}\n\nUser: \"{text}\""
            
            # Configure for faster generation
            generation_config = genai.types.GenerationConfig(
                max_output_tokens=600,  # Limit response length
                temperature=0.7,
                top_p=0.8,
                top_k=40
            )
            
            # Generate response
            full_response = ""
            stream_chunks = []
            current_chunk = ""
            
            # Stream the response
            response_stream = GEMINI_MODEL.generate_content(
                prompt, 
                stream=True,
                generation_config=generation_config
            )
            
            for response in response_stream:
                if response.text:
                    full_response += response.text
                    current_chunk += response.text
                    
                    # Check if we have a complete sentence
                    if any(current_chunk.rstrip().endswith(punct) for punct in ['.', '?', '!']):
                        chunk_text = current_chunk.strip()
                        if chunk_text:  # Only add non-empty chunks
                            stream_chunks.append(chunk_text)
                        current_chunk = ""

            # Add any remaining text as final chunk
            if current_chunk.strip():
                stream_chunks.append(current_chunk.strip())
            
            # If no chunks were created, create one from full response
            if not stream_chunks and full_response.strip():
                stream_chunks = [full_response.strip()]
                
            return {
                'full_response': full_response.strip(),
                'chunks': stream_chunks
            }
            
        except Exception as e:
            print(f"[Gemini Context ERROR]: {e}")
            traceback.print_exc()
            error_msg = "Sorry, I had trouble processing that. Could you try again?"
            return {
                'full_response': error_msg,
                'chunks': [error_msg]
            }

    @staticmethod
    def _create_news_response_fast(news_data, search_term=None, category=None):
        """Create a fast, concise news response"""
        articles = news_data.get("articles", [])
        
        if not articles:
            response = "No recent news found. Let me try again shortly."
            return {
                'full_response': response,
                'chunks': [response]
            }
        
        # Create concise introduction
        if search_term and search_term != category:
            intro = f"Latest on {search_term}:"
        elif category:
            intro = f"Top {category} news:"
        else:
            intro = "Latest headlines:"
        
        # Limit to 3 articles for speed
        chunks = [intro]
        full_response = intro
        
        for i, article in enumerate(articles[:3]):
            # Keep article summaries brief
            article_text = f"{i+1}. {article['title'][:80]}..."
            if len(article['title']) <= 80:
                article_text = f"{i+1}. {article['title']}"
            
            full_response += f" {article_text}"
            chunks.append(article_text)
        
        return {
            'full_response': full_response.strip(),
            'chunks': chunks
        }

    @staticmethod
    def process_audio_parallel(base64_audio, browser_transcript, conversation_history):
        """Parallel processing for maximum speed"""
        start_time = time.time()
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            # Start all tasks in parallel
            futures = {}
            
            # 1. Speech-to-text (if needed)
            if not browser_transcript or len(browser_transcript.strip()) < 5:
                futures['whisper'] = executor.submit(JarvisAI.speech_to_text_fast, base64_audio)
            
            # 2. Choose transcript immediately if browser transcript is good
            if browser_transcript and len(browser_transcript.strip()) >= 5:
                chosen_text = browser_transcript
                whisper_text = ""
            else:
                # Wait for whisper result
                whisper_text = futures['whisper'].result() if 'whisper' in futures else ""
                chosen_text = JarvisAI.choose_better_transcript_fast(whisper_text, browser_transcript)
            
            if not chosen_text:
                return None
            
            print(f"Transcript chosen in {time.time() - start_time:.2f}s: '{chosen_text[:50]}...'")
            
            # 3. Detect news intent
            is_news_query, category, search_term = JarvisAI.detect_news_intent(chosen_text)
            
            # 4. Start news fetch and AI processing in parallel
            news_future = None
            if is_news_query:
                news_future = executor.submit(
                    JarvisAI.fetch_latest_news_fast,
                    query=search_term,
                    category=category,
                    count=3  # Limited for speed
                )
            
            # 5. Prepare context (limit for speed)
            context = ""
            if conversation_history:
                context = "Recent chat:\n"
                for msg in conversation_history[-4:]:  # Only last 4 messages
                    role = "You" if msg["role"] == "user" else "Me"
                    content = msg['content'][:100]  # Limit content length
                    context += f"{role}: {content}\n"
            
            # 6. Get news data if requested
            news_data = None
            if news_future:
                try:
                    news_data = news_future.result()
                except concurrent.futures.TimeoutError:
                    print("News fetch timed out")
                    news_data = {"status": "timeout", "articles": []}
            
            print(f"News data ready in {time.time() - start_time:.2f}s")
            
            # 7. Process with Gemini
            ai_start = time.time()
            response_data = JarvisAI.process_with_gemini_streaming_fast(chosen_text, context, news_data)
            print(f"AI response ready in {time.time() - ai_start:.2f}s")
            
            return {
                'text': chosen_text,
                'whisper_text': whisper_text or "",
                'response_data': response_data,
                'is_news_query': is_news_query,
                'news_data': news_data
            }

    @staticmethod
    def choose_better_transcript_fast(whisper_text, browser_text):
        """Fast transcript selection"""
        if not whisper_text and not browser_text:
            return None
        elif not whisper_text:
            return browser_text
        elif not browser_text:
            return whisper_text
        
        # Quick heuristics for speed
        if len(browser_text) > len(whisper_text) * 1.2 and len(browser_text) > 10:
            return browser_text
        
        return whisper_text

    @staticmethod
    def fetch_latest_news_fast(query=None, category=None, count=3):
        """Fast news fetching"""
        try:
            headers = {'User-Agent': 'Mozilla/5.0 (compatible; JarvisBot/1.0)'}
            
            # Use Google News RSS for speed and reliability
            if category:
                google_categories = {
                    "world": "WORLD", "business": "BUSINESS", "technology": "TECHNOLOGY",
                    "science": "SCIENCE", "health": "HEALTH", "sports": "SPORTS",
                    "entertainment": "ENTERTAINMENT"
                }
                if category in google_categories:
                    url = f"https://news.google.com/rss/headlines/section/topic/{google_categories[category]}"
                else:
                    url = "https://news.google.com/rss"
            else:
                url = "https://news.google.com/rss"
            
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                from xml.etree import ElementTree as ET
                root = ET.fromstring(response.content)
                
                news_sources = []
                for item in root.findall('.//item')[:count * 2]:
                    if len(news_sources) >= count:
                        break
                        
                    title_elem = item.find('title')
                    if title_elem is not None:
                        title = title_elem.text.strip()
                        # Clean up Google News titles
                        title = re.sub(r' - [^-]+$', '', title)
                        
                        # Filter by query if specified
                        if query and query.lower() not in title.lower():
                            continue
                        
                        news_sources.append({
                            "title": title,
                            "source": "Google News",
                            "time": "Recent"
                        })
                
                return {
                    "status": "success",
                    "count": len(news_sources),
                    "articles": news_sources,
                    "timestamp": datetime.now().isoformat()
                }
            
            return {"status": "error", "articles": []}
            
        except Exception as e:
            print(f"Fast news fetch error: {e}")
            return {"status": "error", "articles": []}

    @staticmethod
    def detect_news_intent(text):
        """Fast news intent detection"""
        text = text.lower().strip()
        
        # Quick keyword check
        news_keywords = ["news", "headlines", "latest", "update", "current", "happening"]
        is_news_query = any(keyword in text for keyword in news_keywords)
        
        # Quick category detection
        category = None
        if "world" in text or "international" in text:
            category = "world"
        elif "business" in text or "finance" in text:
            category = "business"
        elif "tech" in text or "technology" in text:
            category = "technology"
        elif "sports" in text or "sport" in text:
            category = "sports"
        
        # Simple search term extraction
        search_term = None
        if "about" in text:
            parts = text.split("about")
            if len(parts) > 1:
                search_term = parts[1].strip()[:20]  # Limit length
        
        return (is_news_query, category, search_term)

    # Keep the original methods for backward compatibility
    @staticmethod
    def speech_to_text(audio_base64):
        return JarvisAI.speech_to_text_fast(audio_base64)
    
    @staticmethod
    def text_to_speech(text):
        return JarvisAI.text_to_speech_cached(text)
    
    @staticmethod
    def fetch_latest_news(query=None, category=None, count=5):
        return JarvisAI.fetch_latest_news_fast(query, category, min(count, 3))
    
    @staticmethod
    def process_with_gemini_streaming_context(text, context="", news_data=None):
        return JarvisAI.process_with_gemini_streaming_fast(text, context, news_data)