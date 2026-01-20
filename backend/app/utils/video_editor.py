try:
    from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips
except ImportError:
    from moviepy import ImageClip, AudioFileClip, concatenate_videoclips

from django.conf import settings
import os
import uuid
from datetime import datetime
import subprocess


# -----------------------------
# SAFE SRT PARSER + MERGER
# -----------------------------
def merge_srts(scene_srts, scene_durations, output_srt):
    index = 1
    offset = 0.0
    valid_blocks = 0

    def to_sec(t):
        h, m, s = t.replace(",", ".").split(":")
        return int(h) * 3600 + int(m) * 60 + float(s)

    def to_srt(t):
        if t < 0:
            t = 0
        ms = int((t % 1) * 1000)
        t = int(t)
        s = t % 60
        t //= 60
        m = t % 60
        h = t // 60
        return f"{h:02}:{m:02}:{s:02},{ms:03}"

    with open(output_srt, "w", encoding="utf-8") as out:
        for srt_path, duration in zip(scene_srts, scene_durations):
            if not os.path.exists(srt_path) or os.path.getsize(srt_path) == 0:
                offset += duration
                continue

            with open(srt_path, "r", encoding="utf-8") as f:
                blocks = f.read().strip().split("\n\n")

            for block in blocks:
                lines = block.strip().split("\n")
                if len(lines) < 3:
                    continue

                try:
                    start, end = lines[1].split(" --> ")
                    start_sec = to_sec(start) + offset
                    end_sec = to_sec(end) + offset
                except Exception:
                    continue

                text = lines[2].strip()
                if not text:
                    continue

                out.write(
                    f"{index}\n"
                    f"{to_srt(start_sec)} --> {to_srt(end_sec)}\n"
                    f"{text}\n\n"
                )
                index += 1
                valid_blocks += 1

            offset += duration

    if valid_blocks == 0:
        raise RuntimeError("Merged SRT is empty or invalid")


# -----------------------------
# SRT → VTT
# -----------------------------
def srt_to_vtt(srt_path, vtt_path):
    subprocess.run(
        ["ffmpeg", "-y", "-i", srt_path, vtt_path],
        check=True
    )


# -----------------------------
# MUX SUBTITLES
# -----------------------------
def mux_subtitles(video_path, srt_path, output_path):
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i", video_path,
            "-f", "srt",
            "-i", srt_path,
            "-c:v", "copy",
            "-c:a", "copy",
            "-c:s", "mov_text",
            output_path
        ],
        check=True
    )


# -----------------------------
# MAIN VIDEO FUNCTION
# -----------------------------
def create_video(scenes, topic="video"):
    clips = []
    base_dir = settings.BASE_DIR

    videos_dir = os.path.join(base_dir, "videos")
    subtitles_dir = os.path.join(base_dir, "subtitles")
    temp_dir = os.path.join(base_dir, "temp")

    os.makedirs(videos_dir, exist_ok=True)
    os.makedirs(subtitles_dir, exist_ok=True)
    os.makedirs(temp_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    unique_id = str(uuid.uuid4())[:8]

    safe_topic = "".join(
        c for c in topic if c.isalnum() or c in (" ", "-", "_")
    ).strip().replace(" ", "_")[:50]

    filename = f"{safe_topic}_{timestamp}_{unique_id}.mp4"
    output_path = os.path.join(videos_dir, filename)

    print(f"🎬 Assembling Video: {filename}")

    scene_srts = []
    scene_durations = []

    for scene in scenes:
        audio_clip = AudioFileClip(scene["audio"])
        duration = audio_clip.duration

        clip = (
            ImageClip(scene["image"])
            .set_duration(duration)
            .set_audio(audio_clip)
        )

        clips.append(clip)
        scene_srts.append(scene["subtitle"])
        scene_durations.append(duration)

    final_video = concatenate_videoclips(clips, method="compose")

    temp_video = output_path.replace(".mp4", "_nosub.mp4")

    final_video.write_videofile(
        temp_video,
        fps=24,
        codec="libx264",
        audio_codec="aac",
        verbose=False,
        logger=None
    )

    # 🔥 CORRECT ORDER
    merged_srt = os.path.join(temp_dir, "final_subtitles.srt")
    merge_srts(scene_srts, scene_durations, merged_srt)

    final_vtt = os.path.join(
        subtitles_dir,
        filename.replace(".mp4", ".vtt")
    )
    srt_to_vtt(merged_srt, final_vtt)

    mux_subtitles(temp_video, merged_srt, output_path)

    os.remove(temp_video)

    video_duration = final_video.duration
    final_video.close()
    for clip in clips:
        clip.close()

    print(f"🎬 Video ready: {output_path}")
    return output_path, filename, video_duration


# -----------------------------
# CLEANUP
# -----------------------------
def cleanup_temp_files():
    temp_dir = os.path.join(settings.BASE_DIR, "temp")
    for file in os.listdir(temp_dir):
        if file.startswith("temp_"):
            try:
                os.remove(os.path.join(temp_dir, file))
            except Exception:
                pass
