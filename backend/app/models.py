from django.db import models
from django.utils import timezone

class UploadedFile(models.Model):
    file = models.FileField(upload_to="uploads/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

class GeneratedVideo(models.Model):
    topic = models.CharField(max_length=500)
    filename = models.CharField(max_length=255, unique=True)
    video_url = models.CharField(max_length=1000)
    created_at = models.DateTimeField(default=timezone.now)
    duration = models.FloatField(null=True, blank=True)  # in seconds
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.topic} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"