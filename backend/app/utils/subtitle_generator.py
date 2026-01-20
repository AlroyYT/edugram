import os

def generate_sentence_srt(text, duration, srt_path):
    """
    Generates a simple, valid SRT file for one scene.
    Subtitle stays on screen for the full audio duration.
    """

    def to_srt_time(seconds):
        ms = int((seconds % 1) * 1000)
        seconds = int(seconds)
        s = seconds % 60
        seconds //= 60
        m = seconds % 60
        h = seconds // 60
        return f"{h:02}:{m:02}:{s:02},{ms:03}"

    os.makedirs(os.path.dirname(srt_path), exist_ok=True)

    with open(srt_path, "w", encoding="utf-8") as f:
        f.write(
            "1\n"
            f"{to_srt_time(0)} --> {to_srt_time(duration)}\n"
            f"{text}\n\n"
        )

    return srt_path
