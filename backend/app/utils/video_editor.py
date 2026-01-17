from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips
from django.conf import settings
import os
import uuid
from datetime import datetime

def create_video(scenes, topic="video"):
    clips = []
    base_dir = settings.BASE_DIR  # /backend
    
    # Create videos directory if it doesn't exist
    videos_dir = os.path.join(base_dir, "videos")
    os.makedirs(videos_dir, exist_ok=True)
    
    # Generate unique filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    safe_topic = "".join(c for c in topic if c.isalnum() or c in (' ', '-', '_')).strip()
    safe_topic = safe_topic.replace(' ', '_')[:50]  # Limit length
    
    filename = f"{safe_topic}_{timestamp}_{unique_id}.mp4"
    output_path = os.path.join(videos_dir, filename)

    print(f"🎬 Assembling Video: {filename}")

    for i, scene in enumerate(scenes):
        audio_path = scene["audio"]
        image_path = scene["image"]

        audio_clip = AudioFileClip(audio_path)
        duration = audio_clip.duration

        img_clip = (
            ImageClip(image_path)
            .set_duration(duration)
            .set_audio(audio_clip)
            .crossfadein(1.0)
        )

        clips.append(img_clip)

    final_video = concatenate_videoclips(clips, method="compose")

    final_video.write_videofile(
        output_path,
        fps=24,
        codec="libx264",
        audio_codec="aac",
        verbose=False,
        logger=None
    )

    # Get video duration
    video_duration = final_video.duration

    # ✅ Close clips to avoid file lock issues
    final_video.close()
    for clip in clips:
        clip.close()

    print(f"🎬 Video ready: {output_path}")
    return output_path, filename, video_duration


def cleanup_temp_files():
    temp_dir = os.path.join(settings.BASE_DIR, "temp")

    for file in os.listdir(temp_dir):
        if file.startswith("temp_"):
            try:
                os.remove(os.path.join(temp_dir, file))
            except Exception as e:
                print("Cleanup error:", e)