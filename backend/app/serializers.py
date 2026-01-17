# deaf_dashboard/api/learning_hub/serializers.py
from rest_framework import serializers
from .models import GeneratedVideo

class LearningHubSerializer(serializers.Serializer):
    summary = serializers.CharField()
    mcqs = serializers.ListField(child=serializers.CharField())
    flashcards = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        )
    )

class GeneratedVideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedVideo
        fields = ['id', 'topic', 'filename', 'video_url', 'created_at', 'duration']
        read_only_fields = ['id', 'created_at']
