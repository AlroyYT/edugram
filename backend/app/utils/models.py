from django.db import models
from django.contrib.auth.models import User

class SavedMaterial(models.Model):
    MATERIAL_TYPES = [
        ('summary', 'Summary'),
        ('quiz', 'Quiz'),
        ('flashcard', 'Flashcard'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    type = models.CharField(max_length=20, choices=MATERIAL_TYPES)
    content = models.TextField()
    file_name = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.get_type_display()} - {self.file_name}" 