from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips
from django.conf import settings
import os

def create_video(scenes):
    clips = []
    base_dir = settings.BASE_DIR  # /backend
    output_path = os.path.join(base_dir, "final_video.mp4")

    print("🎬 Assembling Video...")

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

    # ✅ Close clips to avoid file lock issues
    final_video.close()
    for clip in clips:
        clip.close()

    print("🎬 Moviepy - video ready:", output_path)
    return output_path


def cleanup_temp_files():
    temp_dir = os.path.join(settings.BASE_DIR, "temp")

    for file in os.listdir(temp_dir):
        if file.startswith("temp_"):
            try:
                os.remove(os.path.join(temp_dir, file))
            except Exception as e:
                print("Cleanup error:", e)
