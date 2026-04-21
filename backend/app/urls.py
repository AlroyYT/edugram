from django.urls import path
from . import views
# from app.views import visual_mindmap,test_mindmap

# Keep your existing URLs and add the new ones
from .views import (
    FileUploadAPIView,
    SummarizeAPIView,
    GenerateMCQsAPIView,
    GenerateFlashcardsAPIView,
    generate_video,
    process_audio,
    SaveMaterialAPIView,
    get_saved_materials,
    youtube_search,
    delete_saved_material,
    download_file,
    ImageAnalysisView,
    health_check,
    search_paper,
    generate_sentence_view,
    evaluate_pronunciation_view,
    serve_backend_video,
    generate_drag_and_match,
    design_digital_circuit,
    jarvis_health,
    jarvis_configure,
    jarvis_chat,
    jarvis_reset,
    # Add the new hand sign detection functions  
)

from .utils.sign_lang import convert_text_to_gesture, speech_to_text
from .utils.sign2 import animation_view

urlpatterns = [
    # Your existing URLs
    path('upload/', FileUploadAPIView.as_view(), name='file-upload'),
    path('summarize/', SummarizeAPIView.as_view(), name='summarize'),
    path('generate-mcqs/', GenerateMCQsAPIView.as_view(), name='generate-mcqs'),
    path('generate-flashcards/', GenerateFlashcardsAPIView.as_view(), name='generate-flashcards'),
    path('process_audio/', process_audio),
    path('convert-text-to-gesture/', convert_text_to_gesture, name='convert-text-to-gesture'),
    path('speech-to-text/', speech_to_text, name='speech-to-text'),
    path('save-material/', SaveMaterialAPIView.as_view(), name='save-material'),
    path('saved-materials/', get_saved_materials, name='get_saved_materials'),
    path('youtube-search/', youtube_search, name='youtube_search'),
    path('saved-materials/<str:filename>/', delete_saved_material, name='delete_saved_material'),
    path('download/<str:filename>/', download_file, name='download_file'),
    path('animation_view/', animation_view, name='animation_view'),
    path("generate-video/", generate_video),
    path("videos/<str:filename>", serve_backend_video),
    # Image Analysis URLs
    path('analyze-image/', ImageAnalysisView.as_view(), name='analyze_image'),
    
    # Kinesthetic Learning
    path('generate-drag-and-match/', generate_drag_and_match, name='generate_drag_and_match'),
    path('design-digital-circuit/', design_digital_circuit, name='design_digital_circuit'),
    
    # Paper Search URL
    path('search-paper/', search_paper, name='search_paper'),
    
     #speech support
    path('speech-generate/', generate_sentence_view),
    path('speech-evaluate/', evaluate_pronunciation_view),
    # path("visual/mindmap/", visual_mindmap, name="visual-mindmap"),
    # path("visual/test-mindmap/", test_mindmap, name="test-mindmap")
    path('videos/', views.list_videos, name='list_videos'),
    path('videos/<int:video_id>/', views.delete_video, name='delete_video'),
    path('health/',    jarvis_health,     name='jarvis_health'),
    path('configure/', jarvis_configure,  name='jarvis_configure'),
    path('chat/',      jarvis_chat,       name='jarvis_chat'),
    path('reset',     jarvis_reset,      name='jarvis_reset'),
    
]