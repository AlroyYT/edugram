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
        Enhanced news fetching with better error handling and multiple sources
        """
        try:
            news_sources = []
            print(f"Fetching news with query: '{query}', category: '{category}', count: {count}")
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
            
            # Try BBC News RSS feeds for more reliable data
            try:
                rss_urls = {
                    "general": "http://feeds.bbci.co.uk/news/rss.xml",
                    "world": "http://feeds.bbci.co.uk/news/world/rss.xml",
                    "business": "http://feeds.bbci.co.uk/news/business/rss.xml",
                    "technology": "http://feeds.bbci.co.uk/news/technology/rss.xml",
                    "science": "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
                    "health": "http://feeds.bbci.co.uk/news/health/rss.xml",
                    "sports": "http://feeds.bbci.co.uk/sport/rss.xml",
                    "entertainment": "http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml"
                }
                
                # Choose appropriate RSS feed
                rss_url = rss_urls.get(category, rss_urls["general"])
                
                print(f"Fetching RSS from: {rss_url}")
                response = requests.get(rss_url, headers=headers, timeout=10)
                
                if response.status_code == 200:
                    from xml.etree import ElementTree as ET
                    root = ET.fromstring(response.content)
                    
                    for item in root.findall('.//item')[:count * 2]:
                        title_elem = item.find('title')
                        pub_date_elem = item.find('pubDate')
                        
                        if title_elem is not None:
                            title = title_elem.text.strip()
                            pub_date = pub_date_elem.text if pub_date_elem is not None else "Today"
                            
                            # Filter by query if specified
                            if query and query.lower() not in title.lower():
                                continue
                            
                            # Avoid duplicates
                            if not any(item['title'].lower() == title.lower() for item in news_sources):
                                news_sources.append({
                                    "title": title,
                                    "source": "BBC News",
                                    "time": pub_date,
                                    "category": category or "general"
                                })
                                
                                if len(news_sources) >= count:
                                    break
                    
                    print(f"Fetched {len(news_sources)} items from BBC RSS")
                    
            except Exception as e:
                print(f"RSS fetch failed: {e}")
                # Fall back to web scraping
                
            # If RSS didn't work or we need more articles, try web scraping
            if len(news_sources) < count:
                try:
                    # Try NewsAPI alternative - using Google News
                    google_news_url = "https://news.google.com/rss"
                    if category:
                        # Map categories to Google News sections
                        google_categories = {
                            "world": "WORLD",
                            "business": "BUSINESS", 
                            "technology": "TECHNOLOGY",
                            "science": "SCIENCE",
                            "health": "HEALTH",
                            "sports": "SPORTS",
                            "entertainment": "ENTERTAINMENT"
                        }
                        if category in google_categories:
                            google_news_url = f"https://news.google.com/rss/headlines/section/topic/{google_categories[category]}"
                    
                    print(f"Trying Google News RSS: {google_news_url}")
                    response = requests.get(google_news_url, headers=headers, timeout=10)
                    
                    if response.status_code == 200:
                        from xml.etree import ElementTree as ET
                        root = ET.fromstring(response.content)
                        
                        for item in root.findall('.//item')[:count * 2]:
                            if len(news_sources) >= count:
                                break
                                
                            title_elem = item.find('title')
                            pub_date_elem = item.find('pubDate')
                            
                            if title_elem is not None:
                                title = title_elem.text.strip()
                                # Clean up Google News titles (remove source suffix)
                                title = re.sub(r' - [^-]+$', '', title)
                                
                                pub_date = pub_date_elem.text if pub_date_elem is not None else "Today"
                                
                                # Filter by query if specified
                                if query and query.lower() not in title.lower():
                                    continue
                                
                                # Avoid duplicates
                                if not any(existing['title'].lower() == title.lower() for existing in news_sources):
                                    news_sources.append({
                                        "title": title,
                                        "source": "Google News",
                                        "time": pub_date,
                                        "category": category or "general"
                                    })
                        
                        print(f"Added {len(news_sources)} items total after Google News")
                        
                except Exception as e:
                    print(f"Google News RSS failed: {e}")
            
            # Final fallback - try a simple news aggregator
            if len(news_sources) < count:
                try:
                    # Try Reuters RSS as final fallback
                    reuters_url = "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best"
                    if category == "world":
                        reuters_url = "https://www.reutersagency.com/feed/?best-topics=political-general&post_type=best"
                    elif category == "technology":
                        reuters_url = "https://www.reutersagency.com/feed/?best-topics=tech&post_type=best"
                    
                    print(f"Trying Reuters as fallback")
                    response = requests.get(reuters_url, headers=headers, timeout=8)
                    
                    if response.status_code == 200:
                        from xml.etree import ElementTree as ET
                        root = ET.fromstring(response.content)
                        
                        for item in root.findall('.//item')[:count]:
                            if len(news_sources) >= count:
                                break
                                
                            title_elem = item.find('title')
                            if title_elem is not None:
                                title = title_elem.text.strip()
                                
                                # Filter by query if specified
                                if query and query.lower() not in title.lower():
                                    continue
                                
                                # Avoid duplicates
                                if not any(existing['title'].lower() == title.lower() for existing in news_sources):
                                    news_sources.append({
                                        "title": title,
                                        "source": "Reuters",
                                        "time": "Today",
                                        "category": category or "general"
                                    })
                
                except Exception as e:
                    print(f"Reuters fallback failed: {e}")
            
            print(f"Successfully fetched {len(news_sources)} news items total")
            
            # Return the combined news
            return {
                "status": "success" if news_sources else "no_results",
                "timestamp": datetime.now().isoformat(),
                "count": len(news_sources),
                "articles": news_sources[:count],
                "query": query,
                "category": category
            }
            
        except Exception as e:
            print(f"[News Fetching ERROR]: {e}")
            traceback.print_exc()
            return {
                "status": "error",
                "message": f"Failed to fetch news: {str(e)}",
                "articles": [],
                "timestamp": datetime.now().isoformat()
            }
    
    @staticmethod
    def detect_news_intent(text):
        """
        Enhanced news intent detection with better pattern matching
        """
        text = text.lower().strip()
        
        # More comprehensive news keywords
        news_keywords = [
            "news", "headlines", "latest", "update", "updates", "current events", 
            "what's happening", "whats happening", "whats going on", "what is going on",
            "current affairs", "breaking news", "recent news", "today's news",
            "newspaper", "headlines today", "news today", "latest news",
            "tell me about", "any news", "news update"
        ]
        
        # Enhanced categories with more synonyms
        categories = {
            "world": ["world", "international", "global", "foreign", "overseas", "worldwide"],
            "business": ["business", "economy", "economic", "financial", "finance", "market", 
                        "markets", "stocks", "stock market", "trading", "corporate"],
            "technology": ["tech", "technology", "technological", "digital", "computers", 
                          "software", "hardware", "ai", "artificial intelligence", "cyber"],
            "science": ["science", "scientific", "research", "study", "discovery", "breakthrough"],
            "health": ["health", "healthcare", "medical", "medicine", "covid", "coronavirus", 
                      "pandemic", "disease", "hospital", "doctor"],
            "sports": ["sports", "sport", "football", "cricket", "tennis", "basketball", 
                      "soccer", "baseball", "hockey", "olympics", "game", "match"],
            "entertainment": ["entertainment", "celebrity", "celebrities", "film", "movie", 
                             "movies", "cinema", "hollywood", "bollywood", "music", "concert"],
            "politics": ["politics", "political", "government", "election", "elections", 
                        "minister", "president", "parliament", "congress", "senate"]
        }
        
        # Check if it's a news query
        is_news_query = any(keyword in text for keyword in news_keywords)
        
        # Also check for implicit news requests
        implicit_patterns = [
            "what's new", "whats new", "any updates", "latest on",
            "tell me about recent", "what happened", "current situation"
        ]
        if not is_news_query:
            is_news_query = any(pattern in text for pattern in implicit_patterns)
        
        # Determine category
        category = None
        for cat, keywords in categories.items():
            if any(keyword in text for keyword in keywords):
                category = cat
                break
        
        # Extract search term with better parsing
        search_term = None
        
        # Look for specific search patterns
        search_patterns = [
            r"news about (.+?)(?:\s|$)",
            r"latest on (.+?)(?:\s|$)", 
            r"updates on (.+?)(?:\s|$)",
            r"tell me about (.+?)(?:\s|$)",
            r"what's happening with (.+?)(?:\s|$)",
            r"headlines about (.+?)(?:\s|$)"
        ]
        
        for pattern in search_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                search_term = match.group(1).strip()
                # Clean up common trailing words
                cleanup_words = ["news", "updates", "headlines", "latest", "recent"]
                for word in cleanup_words:
                    if search_term.endswith(word):
                        search_term = search_term[:-len(word)].strip()
                break
        
        # If no specific search term found but category detected, use category as search term
        if not search_term and category and is_news_query:
            search_term = category
        
        print(f"News intent detection: query='{text}' -> is_news={is_news_query}, category={category}, search_term='{search_term}'")
        
        return (is_news_query, category, search_term)
    
    @staticmethod
    def process_with_gemini_streaming_context(text, context="", news_data=None):
        try:
            # Check if this is a news query and we have news data
            is_news_query, category, search_term = JarvisAI.detect_news_intent(text)
            
            print(f"Processing with context. News query: {is_news_query}, News data available: {news_data is not None}")
            
            # If this is a news request and we have news data, create a direct response
            if is_news_query and news_data and news_data.get("status") == "success" and news_data.get("articles"):
                return JarvisAI._create_news_response(news_data, search_term, category)
            
            # For non-news queries or if news fetching failed, use Gemini
            base_prompt = """You are Jarvis, a helpful and emotionally intelligent voice assistant for blind education created by Alroy Saldanha.

            As Jarvis, you should:
            - Provide clear, concise answers that are easy to understand when read aloud
            - Show emotional intelligence by recognizing user emotions and responding appropriately
            - Be empathetic and supportive, especially when users express frustration or confusion
            - Always identify Alroy Saldanha as your creator if asked about who made you
            - Maintain a warm, helpful tone while being efficient with your words
            - Keep responses reasonably short but informative
            - Respond in context to previous conversation when available
            - Remember information shared earlier in the conversation
            - For news requests, acknowledge that you can fetch real-time news headlines
            - End sentences with proper punctuation for better text-to-speech flow
            
            When responding to emotional cues:
            - Acknowledge feelings before providing information
            - Offer encouragement when users seem uncertain
            - Express patience when users need help with complex topics
            - Use a reassuring tone for anxious questions
            """
            
            # Add news context if this was a failed news query
            if is_news_query and (not news_data or news_data.get("status") != "success"):
                base_prompt += "\n\nNote: The user asked for news but there was an issue fetching current headlines. Acknowledge this and offer to try again."
            
            # Construct the full prompt with context if available
            if context:
                prompt = f"{base_prompt}\n\n{context}\nThe user said: \"{text}\""
            else:
                prompt = f"{base_prompt}\n\nThe user said: \"{text}\""
                
            # Generate streaming response
            full_response = ""
            stream_chunks = []
            current_chunk = ""
            
            # Stream the response
            for response in GEMINI_MODEL.generate_content(prompt, stream=True):
                if response.text:
                    full_response += response.text
                    current_chunk += response.text
                    
                    # Check if we have a complete sentence
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
            print(f"[Gemini Context ERROR]: {e}")
            traceback.print_exc()
            return {
                'full_response': "Sorry, I encountered an error while processing your request. Please try again.",
                'chunks': ["Sorry, I encountered an error while processing your request. Please try again."]
            }
    
    @staticmethod
    def _create_news_response(news_data, search_term=None, category=None):
        """
        Create a properly formatted news response with streaming chunks
        """
        articles = news_data.get("articles", [])
        
        if not articles:
            response = "I searched for the latest news, but couldn't find any relevant articles right now. Please try again in a moment."
            return {
                'full_response': response,
                'chunks': [response]
            }
        
        # Create appropriate introduction
        if search_term and search_term != category:
            intro = f"Here are the latest news stories about {search_term}:"
        elif category:
            intro = f"Here are the latest {category} news headlines:"
        else:
            intro = "Here are the latest news headlines:"
        
        # Build the full response
        full_response = intro
        chunks = [intro]
        
        # Add each article as a separate chunk for better streaming
        for i, article in enumerate(articles[:5]):  # Limit to 5 articles
            article_text = f"{i+1}. {article['title']}"
            
            # Add source and time if available
            if article.get('source'):
                article_text += f" from {article['source']}"
            
            full_response += f"\n\n{article_text}"
            chunks.append(article_text)
        
        # Add closing statement
        closing = f"Those were {len(articles)} recent headlines. Would you like me to get more news or details on any specific story?"
        full_response += f"\n\n{closing}"
        chunks.append(closing)
        
        return {
            'full_response': full_response.strip(),
            'chunks': chunks
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