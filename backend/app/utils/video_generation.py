import os
from django.conf import settings

def get_video_path(topic):
    """
    Returns the absolute path of the ASL video file for the given topic.
    """
    video_folder = os.path.join(settings.MEDIA_ROOT, "asl_videos")

    sanitized_topic = topic.strip().lower().replace(" ", "_")
    video_path = os.path.join(video_folder, f"{sanitized_topic}.mp4")

    return video_path if os.path.exists(video_path) else None
