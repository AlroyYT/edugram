from django.urls import path
from .views import (
    FileUploadAPIView,
    SummarizeAPIView,
    GenerateMCQsAPIView,
    GenerateFlashcardsAPIView,
)

urlpatterns = [
    path('upload/', FileUploadAPIView.as_view(), name='file-upload'),
    path('summarize/', SummarizeAPIView.as_view(), name='summarize'),
    path('generate-mcqs/', GenerateMCQsAPIView.as_view(), name='generate-mcqs'),
    path('generate-flashcards/', GenerateFlashcardsAPIView.as_view(), name='generate-flashcards'),
]
