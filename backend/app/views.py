from django.conf import settings
import mimetypes
import os
os.environ["PATH"] += os.pathsep + r"C:\Users\peter\Downloads\ffmpeg-7.1.1-essentials_build\ffmpeg-7.1.1-essentials_build\bin"
import tempfile
import whisper
import base64
import re
from django.http import FileResponse, HttpResponse ,StreamingHttpResponse
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
def process_audio(request):
    if request.method != 'POST':
        return JsonResponse({"error": "Only POST allowed"}, status=405)
    
    try:
        # Parse request body
        body = json.loads(request.body)
        base64_audio = body.get("audio")
        browser_transcript = body.get("browserTranscript", "")  # Get browser transcript
        
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
        
        # Get streaming response from Gemini
        response_data = JarvisAI.process_with_gemini_streaming(text)
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
        
        # Return all data to frontend
        return JsonResponse({
            "status": "success",
            "text": text,
            "whisper_text": whisper_text,
            "browser_text": browser_transcript,
            "response": full_response,
            "voice_response": first_chunk_voice,
            "additional_chunks": chunks_voice,
            "streaming": True
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