try:
    from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips, CompositeVideoClip
except ImportError:
    from moviepy import ImageClip, AudioFileClip, concatenate_videoclips, CompositeVideoClip
from django.conf import settings
from PIL import Image, ImageDraw, ImageFont
import os
import uuid
from datetime import datetime
import textwrap

def create_subtitle_image(text, size=(1920, 200), fontsize=60):
    """Create a subtitle image using Pillow"""
    img = Image.new('RGBA', size, (0, 0, 0, 0))  # Transparent background
    draw = ImageDraw.Draw(img)
    
    # Try to use a bold font, fallback to default
    try:
        font = ImageFont.truetype("arial.ttf", fontsize)
    except:
        try:
            font = ImageFont.truetype("Arial.ttf", fontsize)
        except:
            font = ImageFont.load_default()
    
    # Wrap text to fit width
    wrapper = textwrap.TextWrapper(width=40)
    wrapped_text = wrapper.fill(text)
    
    # Get text size using textbbox
    bbox = draw.textbbox((0, 0), wrapped_text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Center position
    x = (size[0] - text_width) // 2
    y = (size[1] - text_height) // 2
    
    # Draw black outline (stroke effect)
    outline_range = 3
    for adj_x in range(-outline_range, outline_range + 1):
        for adj_y in range(-outline_range, outline_range + 1):
            draw.text((x + adj_x, y + adj_y), wrapped_text, font=font, fill='black', align='center')
    
    # Draw white text on top
    draw.text((x, y), wrapped_text, font=font, fill='white', align='center')
    
    return img


def create_video(scenes, topic="video"):
    clips = []
    base_dir = settings.BASE_DIR
    
    videos_dir = os.path.join(base_dir, "videos")
    temp_dir = os.path.join(base_dir, "temp")
    os.makedirs(videos_dir, exist_ok=True)
    os.makedirs(temp_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]
    safe_topic = "".join(c for c in topic if c.isalnum() or c in (' ', '-', '_')).strip()
    safe_topic = safe_topic.replace(' ', '_')[:50]
    
    filename = f"{safe_topic}_{timestamp}_{unique_id}.mp4"
    output_path = os.path.join(videos_dir, filename)

    print(f"🎬 Assembling Video with Subtitles: {filename}")

    for i, scene in enumerate(scenes):
        audio_path = scene["audio"]
        image_path = scene["image"]
        text = scene.get("text", "")

        audio_clip = AudioFileClip(audio_path)
        duration = audio_clip.duration

        # Create base image clip
        img_clip = (
            ImageClip(image_path)
            .set_duration(duration)
            .set_audio(audio_clip)
            .crossfadein(1.0)
        )

        # Add subtitle if text exists
        if text:
            # Create subtitle image using Pillow
            subtitle_img = create_subtitle_image(text, size=(img_clip.w, 200))
            
            # Save temporarily
            subtitle_path = os.path.join(temp_dir, f"temp_subtitle_{i}.png")
            subtitle_img.save(subtitle_path)
            
            # Create subtitle clip
            subtitle_clip = (
                ImageClip(subtitle_path)
                .set_duration(duration)
                .set_position(('center', img_clip.h - 250))  # Position near bottom
            )
            
            # Composite video with subtitle
            video_clip = CompositeVideoClip([img_clip, subtitle_clip])
        else:
            video_clip = img_clip

        clips.append(video_clip)

    final_video = concatenate_videoclips(clips, method="compose")

    final_video.write_videofile(
        output_path,
        fps=24,
        codec="libx264",
        audio_codec="aac",
        verbose=False,
        logger=None
    )

    video_duration = final_video.duration

    # Close clips to avoid file lock issues
    final_video.close()
    for clip in clips:
        clip.close()

    print(f"✅ Video with subtitles ready: {output_path}")
    return output_path, filename, video_duration


def cleanup_temp_files():
    temp_dir = os.path.join(settings.BASE_DIR, "temp")

    if not os.path.exists(temp_dir):
        return

    for file in os.listdir(temp_dir):
        if file.startswith("temp_"):
            try:
                os.remove(os.path.join(temp_dir, file))
            except Exception as e:
                print("Cleanup error:", e)