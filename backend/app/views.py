from django.conf import settings
import mimetypes
import os
import tempfile

import urllib
import whisper
import base64
import re
import time
import traceback
from bs4 import BeautifulSoup
import uuid 
import concurrent.futures
from django.http import FileResponse, HttpResponse ,StreamingHttpResponse
from django.views.decorators.http import require_http_methods
from django.core.files.storage import FileSystemStorage
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework import status
from pathlib import Path
from rest_framework.decorators import api_view
from .utils.summarize import QuotaFriendlyAnalyzer
from .utils.flashcards import FlashcardGenerator
import logging 
import json 
from .utils.mcq_generator import OptimizedMCQGenerator 
from .utils.video_generation import get_video_path
from .utils.jarvis import JarvisAI
from .utils.image import ImageProcessor
import traceback
import subprocess
from .utils.sign_lang import convert_text_to_gesture, speech_to_text
from rest_framework.decorators import api_view
from datetime import datetime
from django.shortcuts import render
from .utils.models import SavedMaterial
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import uuid
from django.utils.decorators import method_decorator
import requests
from django.views import View
import re
from urllib.parse import urljoin, quote
import time


# Set up ffmpeg path using relative path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir))
ffmpeg_path = os.path.join(project_root, 'ffmpeg-7.1.1-essentials_build', 'bin')
os.environ["PATH"] += os.pathsep + ffmpeg_path

logger = logging.getLogger(__name__)


class FileUploadAPIView(APIView):
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        upload_dir = os.path.join(settings.MEDIA_ROOT, "uploads")
        os.makedirs(upload_dir, exist_ok=True)

        file_path = os.path.join(upload_dir, file.name)
        with open(file_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)

        return Response({"message": f"File saved at {file_path}"}, status=status.HTTP_200_OK)

class SummarizeAPIView(APIView):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        try:
            # Initialize the quota-friendly document analyzer with Gemini API key
            self.analyzer = QuotaFriendlyAnalyzer(settings.GEMINI_API_KEY)
        except Exception as e:
            logger.error(f"Analyzer initialization error: {e}")
            raise
    
    def post(self, request):
        # Log entire request for debugging
        logger.info(f"Received request: {request.data}")
        logger.info(f"Received files: {request.FILES}")
        
        # Try multiple ways to get the file
        file = (
            request.FILES.get('file') or 
            request.FILES.get('document') or 
            request.FILES.get('pdf') or
            request.FILES.get('pptx') or
            request.FILES.get('docx')
        )
        
        if not file:
            logger.warning("No file found in request")
            return Response(
                {
                    "error": "No file uploaded", 
                    "details": "Please check the file upload field name"
                }, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file extension
        file_name = file.name.lower()
        file_extension = os.path.splitext(file_name)[1]
        
        allowed_extensions = ['.pdf', '.pptx', '.docx']
        if file_extension not in allowed_extensions:
            logger.warning(f"Unsupported file type: {file_extension}")
            return Response(
                {
                    "error": "Unsupported file type", 
                    "supported_types": allowed_extensions,
                    "received_type": file_extension
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create upload directory
        upload_dir = os.path.join(settings.MEDIA_ROOT, "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique file path
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        try:
            # Save the uploaded file
            with open(file_path, 'wb') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)
            
            # Validate file size
            max_file_size = 50 * 1024 * 1024  # 50 MB
            if os.path.getsize(file_path) > max_file_size:
                os.remove(file_path)
                return Response(
                    {
                        "error": "File too large", 
                        "max_size": "50 MB"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate comprehensive summary with quota-friendly analyzer
            summary = self.analyzer.create_comprehensive_summary(file_path)
            
            # Clean up the uploaded file
            os.remove(file_path)
            
            return Response({
                "summary": summary,
                "file_type": file_extension,
                "file_name": file.name
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            # Ensure file is deleted if it exists
            if os.path.exists(file_path):
                os.remove(file_path)
            
            # Log the full traceback for debugging
            logger.error(f"Summarization error: {e}")
            logger.error(traceback.format_exc())
            
            return Response({
                "error": "Summarization failed",
                "message": str(e),
                "details": traceback.format_exc()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class GenerateMCQsAPIView(APIView):
    def post(self, request):
        file = request.FILES.get('file')
        num_questions = request.data.get('num_questions', 10)

        # Validate file
        if not file:
            return Response({
                "error": "No file uploaded.",
                "detail": "Please attach a file to your request."
            }, status=status.HTTP_400_BAD_REQUEST)

        if not file.name.lower().endswith(('.pdf', '.docx', '.txt')):
            return Response({
                "error": "Invalid file format.",
                "detail": "Supported formats: PDF, DOCX, TXT"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Save file using FileSystemStorage
        try:
            fs = FileSystemStorage(location=os.path.join(settings.MEDIA_ROOT, "uploads"))
            filename = fs.save(file.name, file)
            file_path = fs.path(filename)

            # Initialize MCQ generator
            mcq_gen = OptimizedMCQGenerator()  # No longer need to pass api_key

            try:
                # Extract text based on file type
                if file_path.lower().endswith('.pdf'):
                    text = mcq_gen.extract_text_from_pdf(file_path)
                elif file_path.lower().endswith('.docx'):
                    text = mcq_gen.extract_text_from_docx(file_path)
                else:  # .txt file
                    with open(file_path, 'r') as f:
                        text = f.read()

                if not text.strip():
                    raise ValueError("No readable text found in file")

                # Generate MCQs
                mcqs = mcq_gen.generate_mcqs_from_text(text, num_questions=int(num_questions))
                
                if not mcqs:
                    raise ValueError("Failed to generate MCQs from the text")

                # Format response
                response_data = {
                    "total_questions": len(mcqs),
                    "mcqs": mcqs
                }

                return Response(response_data, status=status.HTTP_200_OK)

            except ValueError as ve:
                return Response({
                    "error": "Generation failed",
                    "detail": str(ve)
                }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Error generating MCQs: {str(e)}")
                return Response({
                    "error": "Internal error",
                    "detail": "Failed to process the document"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            logger.error(f"Error handling file: {str(e)}")
            return Response({
                "error": "File processing failed",
                "detail": "Failed to process the uploaded file"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        finally:
            # Cleanup
            if 'fs' in locals() and 'filename' in locals():
                try:
                    fs.delete(filename)
                except Exception as e:
                    logger.error(f"Error cleaning up file: {str(e)}")

class GenerateFlashcardsAPIView(APIView):
    def post(self, request):
        file = request.FILES.get('file')
        num_cards = int(request.data.get('num_cards', 10))
        api_key = settings.GEMINI_API_KEY
        model = request.data.get('model', 'gemini-1.5-pro')  # Allow model selection with default
        
        # Validate inputs
        if not file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
            
        if not api_key:
            return Response({"error": "Gemini API key not configured"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
        # Validate num_cards is reasonable
        if num_cards < 1:
            num_cards = 10
        elif num_cards > 50:
            num_cards = 50
        
        # Validate model (only allow Gemini models)
        if not model.startswith('gemini-'):
            model = 'gemini-1.5-pro'
            
        # Create upload directory if it doesn't exist
        upload_dir = os.path.join(settings.MEDIA_ROOT, "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        
        # Save the uploaded file
        file_path = os.path.join(upload_dir, file.name)
        try:
            with open(file_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)
                    
            # Log file details
            file_size = os.path.getsize(file_path)
            file_ext = os.path.splitext(file.name)[1].lower()
            logger.info(f"Processing file: {file.name}, size: {file_size} bytes, type: {file_ext}")
            
            # Generate flashcards
            flashcard_generator = FlashcardGenerator(api_key=api_key, model=model)
            text = flashcard_generator.extract_text_from_file(file_path)
            
            # Check if text extraction was successful
            if not text or len(text.strip()) < 50:
                return Response(
                    {"error": "Text extraction failed or insufficient text content. Please check the uploaded file."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Log text extraction success
            logger.info(f"Successfully extracted {len(text)} characters from {file.name}")
            
            # Generate the flashcards
            flashcards_data = flashcard_generator.generate_flashcards(text, num_flashcards=num_cards)
            
            # Clean up saved file
            os.remove(file_path)
            
            # Handle no flashcards case
            if not flashcards_data:
                return Response(
                    {"error": "No flashcards could be generated."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            # Return the results
            return Response({
                "flashcards": flashcards_data,
                "count": len(flashcards_data),
                "source_file": file.name,
                "model_used": model
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error generating flashcards: {str(e)}", exc_info=True)
            
            # Clean up file if it exists
            if os.path.exists(file_path):
                os.remove(file_path)
                
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# New feature: File Deletion API
class DeleteFileAPIView(APIView):
    def post(self, request):
        file_name = request.data.get('file_name')
        if not file_name:
            return Response({"error": "No file name provided."}, status=status.HTTP_400_BAD_REQUEST)

        file_path = os.path.join(settings.MEDIA_ROOT, "uploads", file_name)
        if not os.path.exists(file_path):
            return Response({"error": "File does not exist."}, status=status.HTTP_404_NOT_FOUND)

        try:
            os.remove(file_path)
            return Response({"message": f"File {file_name} deleted successfully."}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error deleting file {file_name}: {str(e)}")
            return Response({"error": f"Failed to delete file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
def get_video_path(topic):
    """
    Function to get the full path of the video file if it exists.
    """
    video_path = os.path.join(settings.MEDIA_ROOT, "videos", f"{topic}.mp4")
    return video_path if os.path.exists(video_path) else None

    

@csrf_exempt
def process_audio_optimized(request):
    """Optimized audio processing with parallel execution and faster response"""
    if request.method != 'POST':
        return JsonResponse({"error": "Only POST allowed"}, status=405)
    
    start_time = time.time()
    
    try:
        # Parse request body
        body = json.loads(request.body)
        base64_audio = body.get("audio")
        browser_transcript = body.get("browserTranscript", "")
        conversation_history = body.get("conversation", [])
        
        if not base64_audio:
            return JsonResponse({"status": "fail", "message": "Missing audio"}, status=400)
        
        print(f"Request parsed in {time.time() - start_time:.2f}s")
        
        # Use parallel processing for faster response
        try:
            result = JarvisAI.process_audio_parallel(
                base64_audio, 
                browser_transcript, 
                conversation_history
            )
            
            if not result:
                return JsonResponse({
                    "status": "fail", 
                    "message": "Could not understand audio."
                }, status=200)
            
            print(f"Audio processing completed in {time.time() - start_time:.2f}s")
            
            # Extract results
            text = result['text']
            whisper_text = result['whisper_text']
            response_data = result['response_data']
            is_news_query = result['is_news_query']
            news_data = result['news_data']
            
            full_response = response_data['full_response']
            chunks = response_data['chunks']
            
            print(f"Response generated in {time.time() - start_time:.2f}s")
            
            # Generate TTS for first chunk immediately (parallel processing)
            with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                # Generate first chunk audio immediately
                first_chunk_future = executor.submit(
                    JarvisAI.text_to_speech_optimized, 
                    chunks[0] if chunks else full_response
                )
                
                # Generate remaining chunks in parallel if there are any
                remaining_futures = []
                if len(chunks) > 1:
                    for chunk in chunks[1:3]:  # Limit to next 2 chunks for speed
                        future = executor.submit(JarvisAI.text_to_speech_optimized, chunk)
                        remaining_futures.append(future)
                
                # Get first chunk audio (this should be fast)
                first_chunk_voice = first_chunk_future.result(timeout=5)
                
                # Get remaining chunk audio
                chunks_voice = []
                for future in remaining_futures:
                    try:
                        chunk_voice = future.result(timeout=3)
                        if chunk_voice:
                            chunks_voice.append(chunk_voice)
                    except concurrent.futures.TimeoutError:
                        print("TTS chunk timed out, skipping")
                        continue
            
            print(f"TTS generation completed in {time.time() - start_time:.2f}s")
            
            # Prepare news info
            news_info = None
            if news_data and news_data.get("status") == "success":
                news_info = {
                    "count": news_data.get("count", 0),
                    "timestamp": news_data.get("timestamp")
                }
            
            total_time = time.time() - start_time
            print(f"Total request processing time: {total_time:.2f}s")
            
            # Return optimized response
            return JsonResponse({
                "status": "success",
                "text": text,
                "whisper_text": whisper_text,
                "browser_text": browser_transcript,
                "response": full_response,
                "voice_response": first_chunk_voice,
                "additional_chunks": chunks_voice,
                "streaming": True if len(chunks_voice) > 0 else False,
                "news_queried": is_news_query,
                "news_info": news_info,
                "processing_time": round(total_time, 2)
            })
            
        except concurrent.futures.TimeoutError:
            return JsonResponse({
                "status": "fail",
                "message": "Processing timed out. Please try a shorter message."
            }, status=200)
        
    except json.JSONDecodeError:
        return JsonResponse({
            "status": "fail",
            "message": "Invalid JSON in request"
        }, status=400)
    
    except Exception as e:
        # Print full traceback for debugging
        traceback.print_exc()
        
        return JsonResponse({
            "status": "fail",
            "message": f"Server error: {str(e)}"
        }, status=500)

# Keep the original function for backward compatibility
@csrf_exempt
def process_audio(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Only POST allowed"}, status=405)
    
    try:
        # Parse request body
        body = json.loads(request.body)
        base64_audio = body.get("audio")
        browser_transcript = body.get("browserTranscript", "")  # Get browser transcript
        conversation_history = body.get("conversation", [])  # Get conversation history
        
        if not base64_audio:
            return JsonResponse({"status": "fail", "message": "Missing audio"}, status=400)
        
        # Transcribe using Whisper
        whisper_text = JarvisAI.speech_to_text(base64_audio)
        
        # Choose the better transcript or combine them
        text = choose_better_transcript(whisper_text, browser_transcript)
        
        if not text:
            return JsonResponse({
                "status": "fail", 
                "message": "Could not understand audio."
            }, status=200)
        
        # Check if the user is asking for news
        is_news_query, category, search_term = JarvisAI.detect_news_intent(text)
        
        # Fetch news if it's a news query
        news_data = None
        if is_news_query:
            print(f"Detected news query. Category: {category}, Search term: {search_term}")
            news_data = JarvisAI.fetch_latest_news(
                query=search_term,
                category=category,
                count=5  # Limit to 5 news items for concise responses
            )
            print(f"Fetched news data: {news_data['status'] if news_data else 'None'}, Articles: {len(news_data.get('articles', [])) if news_data else 0}")
        
        # Prepare context from conversation history for more contextual responses
        context = ""
        if conversation_history:
            # Format the conversation history for inclusion in the prompt
            # Limit to last 5-10 exchanges to keep context manageable
            context = "Here's our conversation history so far:\n"
            for msg in conversation_history[-10:]:  # last 10 messages (5 exchanges)
                role = "User" if msg["role"] == "user" else "Jarvis"
                context += f"{role}: {msg['content']}\n"
            context += "\nNow, respond to the user's latest query:\n"
        
        # Get streaming response from Gemini with conversation context and news data
        response_data = JarvisAI.process_with_gemini_streaming_context(text, context, news_data)
        full_response = response_data['full_response']
        chunks = response_data['chunks']
        
        # Process the first chunk immediately for faster initial response
        first_chunk_voice = None
        chunks_voice = []
        
        if chunks:
            first_chunk_voice = JarvisAI.text_to_speech(chunks[0])
            
            # Process remaining chunks
            for i in range(1, len(chunks)):
                chunk_voice = JarvisAI.text_to_speech(chunks[i])
                chunks_voice.append(chunk_voice)
        
        # Prepare news info for the response
        news_info = None
        if news_data and news_data.get("status") == "success":
            news_info = {
                "count": news_data.get("count", 0),
                "timestamp": news_data.get("timestamp")
            }
        
        # Return all data to frontend
        return JsonResponse({
            "status": "success",
            "text": text,
            "whisper_text": whisper_text,
            "browser_text": browser_transcript,
            "response": full_response,
            "voice_response": first_chunk_voice,
            "additional_chunks": chunks_voice,
            "streaming": True,
            "news_queried": is_news_query,
            "news_info": news_info
        })
    
    except Exception as e:
        # Print full traceback for debugging
        traceback.print_exc()
        
        return JsonResponse({
            "status": "fail",
            "message": f"Server error: {str(e)}"
        }, status=500)

def choose_better_transcript(whisper_text, browser_text):
    """Choose the better transcript based on some heuristics."""
    if not whisper_text and not browser_text:
        return None
    elif not whisper_text:
        return browser_text
    elif not browser_text:
        return whisper_text
    
    # Here you could implement more sophisticated logic
    # For technical terms, browser recognition might actually be better
    
    # Simple length-based heuristic as a starting point
    if len(browser_text) > len(whisper_text) * 1.5:
        return browser_text
    
    # Check for common technical terms that might be misheard
    tech_terms = ["sort", "algorithm", "merge sort", "quick sort", "binary", "search"]
    for term in tech_terms:
        if term in browser_text.lower() and term not in whisper_text.lower():
            return browser_text
    
    # Check for news-related terms
    news_terms = ["news", "headlines", "latest", "update", "current", "events", "world", "business"]
    for term in news_terms:
        if term in browser_text.lower() and term not in whisper_text.lower():
            return browser_text
    
    # Default to whisper_text which is likely more accurate for general speech
    return whisper_text
    
    # Default to whisper_text which is likely more accurate for general speech
    return whisper_text
@api_view(['GET'])
def get_saved_materials(request):
    try:
        saved_dir = os.path.join(settings.MEDIA_ROOT, "saved")
        if not os.path.exists(saved_dir):
            return Response({
                "materials": []
            }, status=status.HTTP_200_OK)

        materials = []
        for filename in os.listdir(saved_dir):
            if filename.endswith('.pdf'):
                file_path = os.path.join(saved_dir, filename)
                file_type = filename.split('_')[-1].replace('.pdf', '')
                materials.append({
                    'fileName': filename,
                    'type': file_type,
                    'filePath': f'http://127.0.0.1:8000/media/saved/{filename}',
                    'date': datetime.fromtimestamp(os.path.getctime(file_path)).strftime('%Y-%m-%d %H:%M:%S')
                })

        return Response({
            "materials": materials
        }, status=status.HTTP_200_OK)

    except Exception as e:
        logger.error(f"Error fetching saved materials: {str(e)}")
        return Response({
            "error": "Failed to fetch saved materials",
            "message": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SignLanguageView(APIView):
    def post(self, request):
        """
        Handle POST requests for both text-to-gesture and speech-to-text conversions
        """
        endpoint = request.path.split('/')[-1]  # Get the endpoint from the URL
        
        if endpoint == 'convert-text-to-gesture':
            return convert_text_to_gesture(request)
        elif endpoint == 'speech-to-text':
            return speech_to_text(request)
        else:
            return Response({
                'status': 'error',
                'message': 'Invalid endpoint'
            }, status=status.HTTP_400_BAD_REQUEST)

class SaveMaterialAPIView(APIView):
    def post(self, request):
        try:
            file = request.FILES.get('file')
            type = request.data.get('type')
            content = request.data.get('content')
            file_name = request.data.get('fileName')

            if not all([file, type, content, file_name]):
                return Response({
                    "error": "Missing required fields",
                    "required": ["file", "type", "content", "fileName"]
                }, status=status.HTTP_400_BAD_REQUEST)

            # Create saved directory if it doesn't exist
            saved_dir = os.path.join(settings.MEDIA_ROOT, "saved")
            os.makedirs(saved_dir, exist_ok=True)

            # Ensure the file has a .pdf extension
            if not file_name.lower().endswith('.pdf'):
                file_name = f"{file_name}.pdf"

            # Save the file
            file_path = os.path.join(saved_dir, file_name)
            with open(file_path, 'wb+') as destination:
                for chunk in file.chunks():
                    destination.write(chunk)

            # Verify the file was saved and is a valid PDF
            if not os.path.exists(file_path):
                return Response({
                    "error": "Failed to save file",
                    "message": "File was not created"
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Check if the file is a valid PDF
            try:
                with open(file_path, 'rb') as f:
                    header = f.read(4)
                    if header != b'%PDF':
                        os.remove(file_path)
                        return Response({
                            "error": "Invalid PDF file",
                            "message": "The uploaded file is not a valid PDF"
                        }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                os.remove(file_path)
                return Response({
                    "error": "File validation failed",
                    "message": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            return Response({
                "status": "success",
                "file_path": file_path,
                "message": "PDF file saved successfully"
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error saving material: {str(e)}")
            return Response({
                "error": "Failed to save material",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
@api_view(['GET'])
def youtube_search(request):
    """
    Search YouTube videos based on query parameters
    """
    try:
        # Get parameters from request
        query = request.GET.get('query', '')
        max_results = request.GET.get('max_results', 6)
        
        # YouTube Data API v3 endpoint
        api_key = settings.YOUTUBE_API_KEY  # Add your YouTube API key to Django settings
        youtube_url = "https://www.googleapis.com/youtube/v3/search"
        
        # Parameters for the API request
        params = {
            'part': 'snippet',
            'q': query,
            'maxResults': max_results,
            'key': api_key,
            'type': 'video',
            'relevanceLanguage': 'en',
            'videoEmbeddable': 'true',
            'videoCategoryId': '27',  # Education category
        }
        
        # Make the API request
        response = requests.get(youtube_url, params=params)
        data = response.json()
        
        # Format the response data
        items = []
        if 'items' in data:
            for item in data['items']:
                video_id = item['id']['videoId']
                snippet = item['snippet']
                
                items.append({
                    'id': video_id,
                    'title': snippet['title'],
                    'description': snippet['description'],
                    'thumbnail': snippet['thumbnails']['high']['url'],
                    'channelTitle': snippet['channelTitle'],
                })
        
        return Response({
            'success': True,
            'items': items
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

@csrf_exempt
@require_http_methods(["DELETE", "OPTIONS"])
def delete_saved_material(request, filename):
    """Delete a saved material by filename"""
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        response = JsonResponse({})
        response["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response["Access-Control-Allow-Methods"] = "DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response["Access-Control-Max-Age"] = "86400"
        return response

    try:
        # Log the incoming request
        logger.info(f"Attempting to delete file: {filename}")
        
        # Get the current directory and construct relative path to saved directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        saved_dir = os.path.join(current_dir, '..', 'media', 'saved')
        file_path = os.path.join(saved_dir, filename)
        
        # Log the full file path
        logger.info(f"Full file path: {file_path}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            logger.warning(f"File not found: {file_path}")
            response = JsonResponse({
                'success': False,
                'message': f'File "{filename}" not found'
            }, status=404)
            response["Access-Control-Allow-Origin"] = "http://localhost:3000"
            return response
        
        # Check if we have permission to delete
        if not os.access(file_path, os.W_OK):
            logger.error(f"No permission to delete file: {file_path}")
            response = JsonResponse({
                'success': False,
                'message': f'No permission to delete file "{filename}"'
            }, status=403)
            response["Access-Control-Allow-Origin"] = "http://localhost:3000"
            return response
        
        # Delete the file
        try:
            os.remove(file_path)
            logger.info(f"Successfully deleted file: {file_path}")
            response = JsonResponse({
                'success': True,
                'message': f'File "{filename}" deleted successfully'
            }, status=200)
            response["Access-Control-Allow-Origin"] = "http://localhost:3000"
            return response
        except OSError as e:
            logger.error(f"Error deleting file {file_path}: {str(e)}")
            response = JsonResponse({
                'success': False,
                'message': f'Error deleting file: {str(e)}'
            }, status=500)
            response["Access-Control-Allow-Origin"] = "http://localhost:3000"
            return response
    
    except Exception as e:
        logger.error(f"Unexpected error in delete_saved_material: {str(e)}")
        response = JsonResponse({
            'success': False,
            'message': f'Error processing request: {str(e)}'
        }, status=500)
        response["Access-Control-Allow-Origin"] = "http://localhost:3000"
        return response

@csrf_exempt
@require_http_methods(["GET", "OPTIONS"])
def download_file(request, filename):
    """Handle file downloads"""
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        response = HttpResponse()
        response["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response["Access-Control-Max-Age"] = "86400"
        return response

    try:
        # Log the download attempt
        logger.info(f"Attempting to download file: {filename}")
        
        # Get the current directory and construct relative path to saved directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        saved_dir = os.path.join(current_dir, '..', 'media', 'saved')
        file_path = os.path.join(saved_dir, filename)
        
        # Log the full file path
        logger.info(f"Full file path: {file_path}")
        
        # Check if file exists
        if not os.path.exists(file_path):
            logger.warning(f"File not found: {file_path}")
            response = JsonResponse({
                'success': False,
                'message': f'File "{filename}" not found'
            }, status=404)
            response["Access-Control-Allow-Origin"] = "http://localhost:3000"
            return response
        
        # Get the file's mime type
        content_type, _ = mimetypes.guess_type(file_path)
        if not content_type:
            content_type = 'application/octet-stream'
        
        # Open the file in binary mode
        file = open(file_path, 'rb')
        
        # Create the response
        response = FileResponse(file, as_attachment=True, filename=filename)
        response['Content-Type'] = content_type
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        # Add CORS headers
        response["Access-Control-Allow-Origin"] = "http://localhost:3000"
        response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        
        return response
        
    except Exception as e:
        logger.error(f"Error downloading file {filename}: {str(e)}")
        response = JsonResponse({
            'success': False,
            'message': f'Error downloading file: {str(e)}'
        }, status=500)
        response["Access-Control-Allow-Origin"] = "http://localhost:3000"
        return response

@method_decorator(csrf_exempt, name='dispatch')
class ImageAnalysisView(View):
    """Handle image upload and analysis"""
    
    def post(self, request):
        try:
            # Check if image file is present
            if 'image' not in request.FILES:
                return JsonResponse({
                    'success': False,
                    'error': 'No image file provided'
                }, status=400)
            
            image_file = request.FILES['image']
            
            # Validate file type
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']
            if image_file.content_type not in allowed_types:
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid file type. Please upload an image file.'
                }, status=400)
            
            # Validate file size (max 10MB)
            max_size = 10 * 1024 * 1024  # 10MB
            if image_file.size > max_size:
                return JsonResponse({
                    'success': False,
                    'error': 'File too large. Please upload an image smaller than 10MB.'
                }, status=400)
            
            # Initialize image processor
            processor = ImageProcessor()
            
            # Analyze the image
            analysis_result = processor.analyze_image(image_file)
            
            if analysis_result['success']:
                return JsonResponse({
                    'success': True,
                    'description': analysis_result['description'],
                    'filename': image_file.name,
                    'size': image_file.size,
                    'content_type': image_file.content_type
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error': analysis_result['error']
                }, status=500)
                
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': f'Server error: {str(e)}'
            }, status=500)
    
    def get(self, request):
        """Return API information"""
        return JsonResponse({
            'message': 'Image Analysis API',
            'method': 'POST',
            'endpoint': '/analyze-image/',
            'supported_formats': ['JPEG', 'PNG', 'GIF', 'BMP', 'WebP'],
            'max_file_size': '10MB'
        })


@require_http_methods(["GET"])
def health_check(request):
    """Simple health check endpoint"""
    return JsonResponse({
        'status': 'healthy',
        'service': 'Image Processing Bot'
    })

@csrf_exempt
@require_http_methods(["POST"])
def search_paper(request):
    try:
        data = json.loads(request.body)
        topic = data.get('title', '').strip()  # Using 'title' field as topic
        author = data.get('author', '').strip()
        year = data.get('year', '').strip()
        
        if not topic:
            return JsonResponse({
                'success': False,
                'error': 'Topic/Title is required'
            }, status=400)
        
        # Search for papers by topic
        search_results = search_papers_by_topic(topic, author, year)
        
        return JsonResponse({
            'success': True,
            'results': search_results
        })
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'error': 'Invalid JSON data'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)

def search_papers_by_topic(topic, author="", year=""):
    """
    Search for papers by topic from multiple academic sources
    """
    all_results = []
    
    # Search from multiple sources
    sources = [
        search_arxiv_papers,
        search_doaj_papers,
        search_pubmed_papers,
        search_ieee_papers,
        search_semantic_scholar_papers
    ]
    
    for search_func in sources:
        try:
            results = search_func(topic, author, year)
            if results:
                all_results.extend(results)
                if len(all_results) >= 15:  # Limit total results
                    break
        except Exception as e:
            print(f"Error in {search_func.__name__}: {e}")
            continue
    
    # Remove duplicates and sort by relevance
    unique_results = remove_duplicates(all_results)
    
    return unique_results[:10]  # Return top 10 results

def search_arxiv_papers(topic, author="", year=""):
    """
    Search arXiv for papers
    """
    results = []
    try:
        # arXiv API
        base_url = "http://export.arxiv.org/api/query"
        
        # Build search query
        search_query = f"all:{topic}"
        if author:
            search_query += f" AND au:{author}"
        if year:
            search_query += f" AND submittedDate:[{year}0101 TO {year}1231]"
        
        params = {
            'search_query': search_query,
            'start': 0,
            'max_results': 5,
            'sortBy': 'relevance',
            'sortOrder': 'descending'
        }
        
        response = requests.get(base_url, params=params, timeout=10)
        
        if response.status_code == 200:
            # Parse XML response
            from xml.etree import ElementTree as ET
            root = ET.fromstring(response.content)
            
            # Extract papers
            for entry in root.findall('{http://www.w3.org/2005/Atom}entry'):
                title_elem = entry.find('{http://www.w3.org/2005/Atom}title')
                summary_elem = entry.find('{http://www.w3.org/2005/Atom}summary')
                
                authors = []
                for author_elem in entry.findall('{http://www.w3.org/2005/Atom}author'):
                    name_elem = author_elem.find('{http://www.w3.org/2005/Atom}name')
                    if name_elem is not None:
                        authors.append(name_elem.text)
                
                # Get publication date
                published_elem = entry.find('{http://www.w3.org/2005/Atom}published')
                pub_year = "Unknown"
                if published_elem is not None:
                    pub_year = published_elem.text[:4]
                
                # Get arXiv URL
                id_elem = entry.find('{http://www.w3.org/2005/Atom}id')
                url = id_elem.text if id_elem is not None else ""
                
                if title_elem is not None:
                    results.append({
                        'title': title_elem.text.strip(),
                        'authors': ', '.join(authors) if authors else 'Unknown',
                        'year': pub_year,
                        'abstract': summary_elem.text.strip() if summary_elem is not None else 'No abstract available',
                        'url': url,
                        'source': 'arXiv'
                    })
    
    except Exception as e:
        print(f"arXiv search error: {e}")
    
    return results

def search_doaj_papers(topic, author="", year=""):
    """
    Search Directory of Open Access Journals (DOAJ)
    """
    results = []
    try:
        base_url = "https://doaj.org/api/search/articles"
        
        params = {
            'query': topic,
            'page': 1,
            'pageSize': 5
        }
        
        response = requests.get(base_url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            for item in data.get('results', []):
                bibjson = item.get('bibjson', {})
                
                title = bibjson.get('title', 'No title')
                abstract = bibjson.get('abstract', 'No abstract available')
                
                # Get authors
                authors = []
                for author_info in bibjson.get('author', []):
                    name = author_info.get('name', '')
                    if name:
                        authors.append(name)
                
                # Get year
                pub_year = bibjson.get('year', 'Unknown')
                
                # Get URL
                urls = bibjson.get('link', [])
                paper_url = ""
                for link in urls:
                    if link.get('type') == 'fulltext':
                        paper_url = link.get('url', '')
                        break
                
                results.append({
                    'title': title,
                    'authors': ', '.join(authors) if authors else 'Unknown',
                    'year': str(pub_year),
                    'abstract': abstract[:500] + '...' if len(abstract) > 500 else abstract,
                    'url': paper_url,
                    'source': 'DOAJ'
                })
    
    except Exception as e:
        print(f"DOAJ search error: {e}")
    
    return results

def search_pubmed_papers(topic, author="", year=""):
    """
    Search PubMed for papers
    """
    results = []
    try:
        # PubMed E-utilities API
        search_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
        
        search_params = {
            'db': 'pubmed',
            'term': topic,
            'retmax': 5,
            'retmode': 'json'
        }
        
        if year:
            search_params['term'] += f" AND {year}[pdat]"
        if author:
            search_params['term'] += f" AND {author}[au]"
        
        search_response = requests.get(search_url, params=search_params, timeout=10)
        
        if search_response.status_code == 200:
            search_data = search_response.json()
            pmids = search_data.get('esearchresult', {}).get('idlist', [])
            
            if pmids:
                # Get details for each paper
                fetch_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
                fetch_params = {
                    'db': 'pubmed',
                    'id': ','.join(pmids),
                    'retmode': 'xml'
                }
                
                fetch_response = requests.get(fetch_url, params=fetch_params, timeout=10)
                
                if fetch_response.status_code == 200:
                    # Parse XML
                    from xml.etree import ElementTree as ET
                    root = ET.fromstring(fetch_response.content)
                    
                    for article in root.findall('.//PubmedArticle'):
                        title_elem = article.find('.//ArticleTitle')
                        abstract_elem = article.find('.//AbstractText')
                        
                        # Get authors
                        authors = []
                        for author in article.findall('.//Author'):
                            fname = author.find('ForeName')
                            lname = author.find('LastName')
                            if fname is not None and lname is not None:
                                authors.append(f"{fname.text} {lname.text}")
                        
                        # Get year
                        year_elem = article.find('.//PubDate/Year')
                        pub_year = year_elem.text if year_elem is not None else 'Unknown'
                        
                        # Get PMID for URL
                        pmid_elem = article.find('.//PMID')
                        pmid = pmid_elem.text if pmid_elem is not None else ''
                        
                        if title_elem is not None:
                            results.append({
                                'title': title_elem.text,
                                'authors': ', '.join(authors) if authors else 'Unknown',
                                'year': pub_year,
                                'abstract': abstract_elem.text if abstract_elem is not None else 'No abstract available',
                                'url': f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else '',
                                'source': 'PubMed'
                            })
    
    except Exception as e:
        print(f"PubMed search error: {e}")
    
    return results

def search_ieee_papers(topic, author="", year=""):
    """
    Search IEEE Xplore (limited without API key)
    """
    results = []
    try:
        # This is a simplified search - for full access, you'd need IEEE API key
        base_url = "https://ieeexplore.ieee.org/search/searchresult.jsp"
        
        params = {
            'queryText': topic,
            'highlight': 'true',
            'returnFacets': 'ALL',
            'returnType': 'SEARCH',
            'matchPubs': 'true',
            'rowsPerPage': '5'
        }
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(base_url, params=params, headers=headers, timeout=10)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract paper information (this is simplified)
            paper_elements = soup.find_all('div', class_='List-results-items')
            
            for element in paper_elements[:3]:  # Limit to 3 results
                title_elem = element.find('h3')
                if title_elem:
                    title_link = title_elem.find('a')
                    title = title_link.text.strip() if title_link else title_elem.text.strip()
                    url = f"https://ieeexplore.ieee.org{title_link.get('href')}" if title_link and title_link.get('href') else ''
                    
                    results.append({
                        'title': title,
                        'authors': 'IEEE Authors',
                        'year': year or 'Recent',
                        'abstract': 'IEEE paper - visit link for full abstract',
                        'url': url,
                        'source': 'IEEE Xplore'
                    })
    
    except Exception as e:
        print(f"IEEE search error: {e}")
    
    return results

def search_semantic_scholar_papers(topic, author="", year=""):
    """
    Search Semantic Scholar API
    """
    results = []
    try:
        base_url = "https://api.semanticscholar.org/graph/v1/paper/search"
        
        params = {
            'query': topic,
            'limit': 5,
            'fields': 'title,authors,year,abstract,url,venue'
        }
        
        if year:
            params['year'] = year
        
        response = requests.get(base_url, params=params, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            for paper in data.get('data', []):
                authors = []
                for author_info in paper.get('authors', []):
                    name = author_info.get('name', '')
                    if name:
                        authors.append(name)
                
                results.append({
                    'title': paper.get('title', 'No title'),
                    'authors': ', '.join(authors) if authors else 'Unknown',
                    'year': str(paper.get('year', 'Unknown')),
                    'abstract': paper.get('abstract', 'No abstract available'),
                    'url': paper.get('url', ''),
                    'source': 'Semantic Scholar'
                })
    
    except Exception as e:
        print(f"Semantic Scholar search error: {e}")
    
    return results

def remove_duplicates(papers):
    """
    Remove duplicate papers based on title similarity
    """
    unique_papers = []
    seen_titles = set()
    
    for paper in papers:
        title = paper.get('title', '').lower().strip()
        
        # Simple deduplication based on title
        is_duplicate = False
        for seen_title in seen_titles:
            if similarity_check(title, seen_title) > 0.8:
                is_duplicate = True
                break
        
        if not is_duplicate:
            unique_papers.append(paper)
            seen_titles.add(title)
    
    return unique_papers

def similarity_check(text1, text2):
    """
    Simple similarity check between two strings
    """
    text1 = text1.lower().strip()
    text2 = text2.lower().strip()
    
    if not text1 or not text2:
        return 0
    
    # Simple word overlap similarity
    words1 = set(text1.split())
    words2 = set(text2.split())
    
    if not words1 or not words2:
        return 0
    
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    
    return len(intersection) / len(union) if union else 0