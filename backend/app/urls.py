from django.urls import path
from .views import (
    FileUploadAPIView,
    SummarizeAPIView,
    GenerateMCQsAPIView,
    GenerateFlashcardsAPIView,
    process_audio,
    SaveMaterialAPIView,
    get_saved_materials,
    youtube_search
)
from .utils.sign_lang import convert_text_to_gesture, speech_to_text

urlpatterns = [
    path('upload/', FileUploadAPIView.as_view(), name='file-upload'),
    path('summarize/', SummarizeAPIView.as_view(), name='summarize'),
    path('generate-mcqs/', GenerateMCQsAPIView.as_view(), name='generate-mcqs'),
    path('generate-flashcards/', GenerateFlashcardsAPIView.as_view(), name='generate-flashcards'),
    path('process-audio/', process_audio),
    path('convert-text-to-gesture/', convert_text_to_gesture, name='convert-text-to-gesture'),
    path('speech-to-text/', speech_to_text, name='speech-to-text'),
    path('save-material/', SaveMaterialAPIView.as_view(), name='save-material'),
    path('saved-materials/', get_saved_materials, name='get_saved_materials'),
    path('youtube-search/', youtube_search, name='youtube_search'),
]