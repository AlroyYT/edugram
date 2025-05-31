import string
import tempfile
import random
import os
import base64
import subprocess
from gtts import gTTS
import whisper
import time
import torch  # Add torch import
import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta
import traceback  # Added for better error logging
import re

from django.conf import settings
import google.generativeai as genai

# Load models once
genai.configure(api_key=settings.GEMINI_API_KEY)
GEMINI_MODEL = genai.GenerativeModel("gemini-1.5-pro-latest")

# Check for GPU availability and set device
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
if DEVICE == "cuda":
    print(f"Using GPU: {torch.cuda.get_device_name(0)}")
else:
    print("GPU not available, using CPU")

# Load Whisper model with device specification
WHISPER_MODEL = whisper.load_model("small", device=DEVICE)

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
            
            # Transcribe with GPU support
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
    def fetch_latest_news(query=None, category=None, count=5):
        """
        Fetch the latest news from various sources using BeautifulSoup.
        
        Args:
            query (str, optional): Search term for specific news
            category (str, optional): News category (world, business, technology, etc.)
            count (int, optional): Number of news items to return
            
        Returns:
            dict: JSON response with news articles
        """
        try:
            news_sources = []
            print(f"Fetching news with query: {query}, category: {category}")
            
            # Mapping of category keywords to actual URL paths
            category_mapping = {
                "world": "world",
                "business": "business",
                "technology": "technology",
                "science": "science_and_environment",
                "health": "health",
                "sports": "sport",
                "entertainment": "entertainment_and_arts",
                "politics": "politics"
            }
            
            # Normalize category if present
            bbc_category = None
            if category and category in category_mapping:
                bbc_category = category_mapping[category]
            
            # Try multiple news sources for better coverage
            
            # Fetch from BBC News
            try:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                
                bbc_url = "https://www.bbc.com/news"
                if bbc_category:
                    bbc_url = f"https://www.bbc.com/news/{bbc_category}"
                
                print(f"Fetching from BBC: {bbc_url}")
                response = requests.get(bbc_url, headers=headers, timeout=15)
                
                if response.status_code == 200:
                    print("BBC News request successful")
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # BBC News structure - look for headlines
                    headlines = soup.find_all(['h3'])
                    
                    for headline in headlines[:count*2]:  # Get more than needed as some might be filtered out
                        if len(news_sources) >= count:
                            break
                            
                        # Skip navigation elements and other non-news headlines
                        parent = headline.parent
                        if parent and ('nav' in str(parent.get('class', [])) or headline.text.strip() in ['BBC World News TV', 'BBC World Service Radio']):
                            continue
                            
                        title = headline.text.strip()
                        
                        # If searching for specific terms, filter headlines
                        if query and query.lower() not in title.lower():
                            continue
                            
                        if title and len(title) > 15:  # Avoid short menu items
                            news_sources.append({
                                "title": title,
                                "source": "BBC News",
                                "time": datetime.now().strftime("%Y-%m-%d"),
                                "category": category or "general"
                            })
            except Exception as e:
                print(f"[BBC News ERROR]: {e}")
                traceback.print_exc()
            
            # Try CNN as another source
            try:
                cnn_url = "https://www.cnn.com"
                if category:
                    # Map category to CNN section
                    cnn_categories = {
                        "world": "world",
                        "business": "business",
                        "technology": "tech",
                        "health": "health",
                        "sports": "sports",
                        "entertainment": "entertainment",
                        "politics": "politics"
                    }
                    if category in cnn_categories:
                        cnn_url = f"https://www.cnn.com/{cnn_categories[category]}"
                
                print(f"Fetching from CNN: {cnn_url}")
                response = requests.get(cnn_url, headers=headers, timeout=15)
                
                if response.status_code == 200:
                    print("CNN request successful")
                    soup = BeautifulSoup(response.text, 'html.parser')
                    
                    # CNN structure - headlines in various elements with headings
                    headlines = soup.find_all(['h3', 'h2'])
                    
                    for headline in headlines[:count*2]:
                        if len(news_sources) >= count:
                            break
                            
                        title = headline.text.strip()
                        
                        # Filter out navigation and other non-news elements
                        if len(title) < 15 or title.startswith('Section') or title in ['Watch', 'Live TV']:
                            continue
                            
                        # Filter by query if specified
                        if query and query.lower() not in title.lower():
                            continue
                            
                        # Avoid duplicates
                        if not any(item['title'] == title for item in news_sources):
                            news_sources.append({
                                "title": title,
                                "source": "CNN",
                                "time": datetime.now().strftime("%Y-%m-%d"),
                                "category": category or "general"
                            })
            except Exception as e:
                print(f"[CNN ERROR]: {e}")
            
            # If we still don't have enough news, try The Guardian
            if len(news_sources) < count:
                try:
                    guardian_url = "https://www.theguardian.com/international"
                    if category:
                        # Map category to Guardian section
                        guardian_categories = {
                            "world": "world",
                            "business": "business",
                            "technology": "technology",
                            "science": "science",
                            "health": "society/health",
                            "sports": "sport",
                            "entertainment": "culture",
                            "politics": "politics"
                        }
                        if category in guardian_categories:
                            guardian_url = f"https://www.theguardian.com/{guardian_categories[category]}"
                    
                    print(f"Fetching from Guardian: {guardian_url}")
                    response = requests.get(guardian_url, headers=headers, timeout=15)
                    
                    if response.status_code == 200:
                        print("Guardian request successful")
                        soup = BeautifulSoup(response.text, 'html.parser')
                        
                        # Guardian structure - headlines in various elements
                        headlines = soup.find_all(['h3'])
                        
                        for headline in headlines[:count*2]:
                            if len(news_sources) >= count:
                                break
                                
                            title = headline.text.strip()
                            
                            # Filter out navigation and other non-news elements
                            if len(title) < 20:
                                continue
                                
                            # Filter by query if specified
                            if query and query.lower() not in title.lower():
                                continue
                                
                            # Avoid duplicates
                            if not any(item['title'] == title for item in news_sources):
                                news_sources.append({
                                    "title": title,
                                    "source": "The Guardian",
                                    "time": datetime.now().strftime("%Y-%m-%d"),
                                    "category": category or "general"
                                })
                except Exception as e:
                    print(f"[Guardian ERROR]: {e}")
            
            print(f"Successfully fetched {len(news_sources)} news items")
            
            # Return the combined news
            return {
                "status": "success" if news_sources else "no_results",
                "timestamp": datetime.now().isoformat(),
                "count": len(news_sources),
                "articles": news_sources[:count]
            }
            
        except Exception as e:
            print("[News Fetching ERROR]:", e)
            import traceback
            traceback.print_exc()
            return {
                "status": "error",
                "message": f"Failed to fetch news: {str(e)}",
                "articles": []
            }

    @staticmethod
    def fetch_current_time_data():
        """
        Fetch current time, date, and basic real-time information
        """
        try:
            now = datetime.now()
            return {
                "current_time": now.strftime("%I:%M %p"),
                "current_date": now.strftime("%A, %B %d, %Y"),
                "timestamp": now.isoformat(),
                "day_of_week": now.strftime("%A"),
                "month": now.strftime("%B"),
                "year": now.year
            }
        except Exception as e:
            print(f"[Time Data ERROR]: {e}")
            return None

    @staticmethod
    def detect_realtime_data_need(text):
        """
        Detect if the user is asking for real-time information that requires current data
        
        Args:
            text (str): User query text
            
        Returns:
            dict: Information about what real-time data is needed
        """
        text = text.lower()
        
        # Time/Date related queries
        time_keywords = ["time", "what time", "current time", "date", "today", "now", 
                        "what day", "what's the date", "what date"]
        
        # News/Current affairs keywords (expanded)
        news_keywords = ["news", "headlines", "latest", "update", "current events", 
                        "what's happening", "whats going on", "current affairs", "breaking news",
                        "today's news", "recent news", "current situation", "what happened today"]
        
        # Current status queries
        status_keywords = ["current", "latest", "recent", "now", "today", "this week", 
                          "this month", "happening now", "right now"]
        
        # Weather queries (for future expansion)
        weather_keywords = ["weather", "temperature", "forecast", "raining", "sunny", "cloudy"]
        
        # Stock/Finance queries (for future expansion)  
        finance_keywords = ["stock price", "market", "bitcoin", "cryptocurrency", "exchange rate"]
        
        result = {
            "needs_realtime": False,
            "data_types": [],
            "specific_query": None
        }
        
        # Check for time/date queries
        if any(keyword in text for keyword in time_keywords):
            result["needs_realtime"] = True
            result["data_types"].append("time")
        
        # Check for news queries
        if any(keyword in text for keyword in news_keywords):
            result["needs_realtime"] = True
            result["data_types"].append("news")
        
        # Check for general current affairs
        if any(keyword in text for keyword in status_keywords) and not result["data_types"]:
            # If they're asking about current/recent things but not specifically time or news
            if any(word in text for word in ["world", "country", "politics", "events", "situation"]):
                result["needs_realtime"] = True
                result["data_types"].append("current_affairs")
        
        # Store the original query for context
        if result["needs_realtime"]:
            result["specific_query"] = text
        
        return result

    @staticmethod
    def gather_realtime_context(realtime_info, original_query):
        """
        Gather relevant real-time data based on the detected needs
        
        Args:
            realtime_info (dict): Information about what real-time data is needed
            original_query (str): The user's original query
            
        Returns:
            str: Formatted context string with real-time data
        """
        context_parts = []
        
        try:
            # Add current time/date if needed
            if "time" in realtime_info.get("data_types", []):
                time_data = JarvisAI.fetch_current_time_data()
                if time_data:
                    context_parts.append(f"Current time: {time_data['current_time']}")
                    context_parts.append(f"Current date: {time_data['current_date']}")
            
            # Add news context if needed
            if "news" in realtime_info.get("data_types", []) or "current_affairs" in realtime_info.get("data_types", []):
                # Try to determine what kind of news they want
                is_news_query, category, search_term = JarvisAI.detect_news_intent(original_query)
                
                news_data = JarvisAI.fetch_latest_news(
                    query=search_term,
                    category=category,
                    count=3  # Limit for context
                )
                
                if news_data and news_data.get("status") == "success" and news_data.get("articles"):
                    context_parts.append("Here are the latest news headlines:")
                    for i, article in enumerate(news_data["articles"][:3], 1):
                        context_parts.append(f"{i}. {article['title']} ({article['source']})")
            
            # Combine all context
            if context_parts:
                return "REAL-TIME DATA CONTEXT:\n" + "\n".join(context_parts) + "\n\nUse this current information to provide an accurate, up-to-date response."
            
        except Exception as e:
            print(f"[Realtime Context ERROR]: {e}")
        
        return ""
    
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
    def process_with_gemini_streaming_context(text, context="", news_data=None):
        try:
            # Check if this is a news query and we have news data
            is_news_query, category, search_term = JarvisAI.detect_news_intent(text)
            
            # NEW: Check if we need real-time data for this query
            realtime_info = JarvisAI.detect_realtime_data_need(text)
            
            # If this is a news request and we have news data, create a direct response
            if is_news_query and news_data and news_data.get("status") == "success" and news_data.get("articles"):
                # Create a direct news response without using Gemini for this part
                articles = news_data.get("articles", [])
                
                if not articles:
                    intro = "I searched for the latest news, but couldn't find any relevant articles right now."
                else:
                    # Create appropriate introduction based on query
                    if search_term:
                        intro = f"Here are the latest news stories about {search_term}:"
                    elif category:
                        intro = f"Here are the latest {category} news stories:"
                    else:
                        intro = "Here are the latest news headlines:"
                
                # Format news as a complete response
                full_response = intro
                for i, article in enumerate(articles[:5]):  # Limit to 5 articles
                    full_response += f"\n\n{i+1}. {article['title']}"
                    if article['source']:
                        full_response += f" - {article['source']}"
                    if article['time']:
                        full_response += f" ({article['time']})"
                
                # Add a closing statement
                if articles:
                    full_response += "\n\nThese are the most recent headlines I could find. Would you like me to read out more details on any specific story?"
                
                # Split response into chunks for streaming
                chunks = []
                current_chunk = intro
                
                # Process article lines into chunks
                for i, article in enumerate(articles[:5]):
                    article_text = f"\n\n{i+1}. {article['title']}"
                    if article['source']:
                        article_text += f" - {article['source']}"
                    if article['time']:
                        article_text += f" ({article['time']})"
                    
                    # If adding this article would make the chunk too long, start a new chunk
                    if len(current_chunk) + len(article_text) > 150:  # Adjust size as needed
                        chunks.append(current_chunk)
                        current_chunk = article_text
                    else:
                        current_chunk += article_text
                
                # Add the last chunk with the closing statement
                if articles:
                    current_chunk += "\n\nThese are the most recent headlines I could find. Would you like me to read out more details on any specific story?"
                chunks.append(current_chunk)
                
                return {
                    'full_response': full_response.strip(),
                    'chunks': chunks
                }
            
            # NEW: Gather real-time context if needed
            realtime_context = ""
            if realtime_info.get("needs_realtime"):
                print(f"Gathering real-time context for: {realtime_info['data_types']}")
                realtime_context = JarvisAI.gather_realtime_context(realtime_info, text)
            
            # For non-news queries or if news fetching failed, use Gemini with enhanced real-time context
            # Base prompt with personality and guidelines
            base_prompt = f"""You are Jarvis, a helpful and emotionally intelligent voice assistant for blind education created by Alroy Saldanha.

            As Jarvis, you should:
            - Provide clear, concise answers that are easy to understand when read aloud
            - Show emotional intelligence by recognizing user emotions and responding appropriately
            - Be empathetic and supportive, especially when users express frustration or confusion
            - Always identify Alroy Saldanha as your creator if asked about who made you
            - Maintain a warm, helpful tone while being efficient with your words
            - Dont make the response too long, make it short and understandable
            - Respond in context to previous conversation when available
            - Remember information shared earlier in the conversation
            - Use any provided real-time data to give current, accurate information
            - When you have access to current data, mention that you have up-to-date information
            
            When responding to emotional cues:
            - Acknowledge feelings before providing information
            - Offer encouragement when users seem uncertain
            - Express patience when users need help with complex topics
            - Use a reassuring tone for anxious questions
            
            Current date and time: {datetime.now().strftime("%A, %B %d, %Y at %I:%M %p")}
            """
            
            # Construct the full prompt with all available context
            prompt_parts = [base_prompt]
            
            # Add real-time context if available
            if realtime_context:
                prompt_parts.append(realtime_context)
            
            # Add conversation context if available
            if context:
                prompt_parts.append(f"\n{context}")
            
            # Add the user's query
            prompt_parts.append(f"\nThe user said: \"{text}\"")
            
            prompt = "\n".join(prompt_parts)
                
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
                'chunks': stream_chunks,
                'used_realtime_data': bool(realtime_context)  # Flag to indicate real-time data was used
            }
        except Exception as e:
            print("[Gemini Context ERROR]:", e)
            return {
                'full_response': "Sorry, something went wrong while processing your request.",
                'chunks': ["Sorry, something went wrong while processing your request."],
                'used_realtime_data': False
            }
    
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
            
    @staticmethod
    def detect_news_intent(text):
        """
        Detect if the user is asking for news
        
        Args:
            text (str): User query text
            
        Returns:
            tuple: (is_news_query, category, search_term)
        """
        text = text.lower()
        
        # Keywords that indicate news intent
        news_keywords = ["news", "headlines", "latest", "update", "current events", 
                         "what's happening", "whats going on", "current affairs"]
        
        # News categories
        categories = {
            "world": ["world", "international", "global"],
            "business": ["business", "economy", "financial", "finance", "market", "stocks"],
            "technology": ["tech", "technology", "digital", "computers", "software"],
            "science": ["science", "scientific", "research"],
            "health": ["health", "healthcare", "medical", "medicine", "covid", "pandemic"],
            "sports": ["sports", "sport", "football", "cricket", "tennis", "basketball"],
            "entertainment": ["entertainment", "celebrity", "film", "movie", "cinema", "hollywood"],
            "politics": ["politics", "political", "government", "election"]
        }
        
        # Check if it's a news query
        is_news_query = any(keyword in text for keyword in news_keywords)
        
        # Determine category
        category = None
        for cat, keywords in categories.items():
            if any(keyword in text for keyword in keywords):
                category = cat
                break
        
        # Extract search term if any
        search_term = None
        search_indicators = ["about", "on", "regarding", "related to", "search for", "find"]
        
        for indicator in search_indicators:
            if indicator in text:
                parts = text.split(indicator, 1)
                if len(parts) > 1 and parts[1].strip():
                    search_term = parts[1].strip()
                    # Remove any trailing phrases like "news"
                    for keyword in news_keywords:
                        if search_term.endswith(keyword):
                            search_term = search_term.rsplit(keyword, 1)[0].strip()
                    break
        
        return (is_news_query, category, search_term)