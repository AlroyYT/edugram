from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .utils import summarize, mcq_generator
from .utils.flashcards import FlashcardGenerator

import os

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
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        file_path = os.path.join(settings.MEDIA_ROOT, "uploads", file.name)
        text = summarize.extract_text_from_pdf(file_path)
        summary = summarize.summarize_pdf(text)

        return Response({"summary": summary}, status=status.HTTP_200_OK)

class GenerateMCQsAPIView(APIView):
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        file_path = os.path.join(settings.MEDIA_ROOT, "uploads", file.name)
        text = mcq_generator.extract_text_from_pdf(file_path)
        mcqs = mcq_generator.generate_mcqs(text)

        return Response({"mcqs": mcqs}, status=status.HTTP_200_OK)

class GenerateFlashcardsAPIView(APIView):
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

        try:
            flashcard_generator = FlashcardGenerator()
            text = flashcard_generator.extract_text_from_file(file_path)
            if not text:
                return Response({"error": "Text extraction failed. Please check the uploaded file."}, status=status.HTTP_400_BAD_REQUEST)

            flashcards_data = flashcard_generator.generate_flashcards(text)

            # Clean up saved file
            os.remove(file_path)

            if not flashcards_data:
                return Response({"error": "No flashcards could be generated."}, status=status.HTTP_400_BAD_REQUEST)

            return Response({"flashcards": flashcards_data}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Error in generate flashcards: {e}")
            if os.path.exists(file_path):
                os.remove(file_path)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)