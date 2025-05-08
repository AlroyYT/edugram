# deaf_dashboard/api/learning_hub/serializers.py
from rest_framework import serializers

class LearningHubSerializer(serializers.Serializer):
    summary = serializers.CharField()
    mcqs = serializers.ListField(child=serializers.CharField())
    flashcards = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        )
    )
