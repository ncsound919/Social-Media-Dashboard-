"""
AI Video Generator using ModelScope text-to-video (open-source).

Uses damo-vilab/text-to-video-ms-1.7b via HuggingFace Diffusers.
Video generation is handled as a Celery background job.
"""
from __future__ import annotations

import base64
import json
import logging
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

AI_DEVICE: str = os.environ.get("AI_DEVICE", "cpu")
VIDEO_MODEL: str = os.environ.get("VIDEO_MODEL", "damo-vilab/text-to-video-ms-1.7b")

# CPU generation is slow; cap duration and surface an estimate to callers.
CPU_MAX_DURATION_SECONDS: int = 3
# Approximate seconds of wall-clock time per frame on CPU (rough estimate).
CPU_SECONDS_PER_FRAME: float = 8.0

BASE_DIR = Path(__file__).parent.parent.parent
VIDEOS_DIR = BASE_DIR / "media" / "generated" / "videos"
DB_PATH = BASE_DIR / "media" / "generated" / "media_metadata.db"

RESOLUTION_PRESETS: Dict[str, tuple[int, int]] = {
    "sd": (256, 256),
    "hd": (512, 512),
}

_pipe: Optional[Any] = None


def _ensure_dirs() -> None:
    VIDEOS_DIR.mkdir(parents=True, exist_ok=True)


def _get_db() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS generated_media (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            media_type TEXT NOT NULL,
            file_path TEXT NOT NULL,
            prompt TEXT,
            model TEXT,
            metadata TEXT,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    return conn


def _save_metadata(
    media_type: str,
    file_path: str,
    prompt: str,
    model: str,
    metadata: Dict[str, Any],
) -> int:
    conn = _get_db()
    cursor = conn.execute(
        "INSERT INTO generated_media (media_type, file_path, prompt, model, metadata, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (
            media_type,
            file_path,
            prompt,
            model,
            json.dumps(metadata),
            datetime.utcnow().isoformat(),
        ),
    )
    conn.commit()
    record_id = cursor.lastrowid
    conn.close()
    return record_id


def _get_pipeline() -> Any:
    """Lazy-load the text-to-video pipeline."""
    global _pipe
    if _pipe is None:
        import torch  # type: ignore
        from diffusers import DiffusionPipeline  # type: ignore

        logger.info("Loading video model: %s on device: %s", VIDEO_MODEL, AI_DEVICE)
        _pipe = DiffusionPipeline.from_pretrained(
            VIDEO_MODEL,
            torch_dtype=torch.float32,
            # trust_remote_code is intentionally omitted (defaults to False)
            # to prevent arbitrary remote code execution from model repos.
        )
        if AI_DEVICE == "cuda":
            _pipe = _pipe.to("cuda")
        logger.info("Video model loaded.")
    return _pipe


def generate_video(
    prompt: str,
    duration_seconds: int = 3,
    resolution: str = "sd",
) -> Dict[str, Any]:
    """
    Generate a short video clip from a text prompt.

    On CPU, duration is capped at CPU_MAX_DURATION_SECONDS (3 s) to keep
    generation time manageable. Callers receive an `estimated_seconds` field
    so the frontend can display a progress estimate.

    Args:
        prompt: Text description of the video.
        duration_seconds: Approximate duration in seconds (1-8; capped to 3 on CPU).
        resolution: Resolution preset (sd or hd).

    Returns:
        Dict with keys: file_path, filename, prompt, duration, resolution, model,
        record_id, estimated_seconds, cpu_mode.
    """
    _ensure_dirs()

    # Cap duration on CPU to avoid extremely long generation times.
    if AI_DEVICE != "cuda":
        duration_seconds = min(duration_seconds, CPU_MAX_DURATION_SECONDS)

    width, height = RESOLUTION_PRESETS.get(resolution, (256, 256))
    num_frames = min(max(duration_seconds * 8, 8), 64)
    estimated_seconds = round(num_frames * CPU_SECONDS_PER_FRAME) if AI_DEVICE != "cuda" else 30

    pipe = _get_pipeline()
    video_frames = pipe(
        prompt,
        num_frames=num_frames,
        width=width,
        height=height,
        num_inference_steps=25,
    ).frames

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"vid_{timestamp}.mp4"
    file_path = VIDEOS_DIR / filename

    from diffusers.utils import export_to_video  # type: ignore
    export_to_video(video_frames, str(file_path))

    record_id = _save_metadata(
        media_type="video",
        file_path=str(file_path),
        prompt=prompt,
        model=VIDEO_MODEL,
        metadata={"duration_seconds": duration_seconds, "resolution": resolution, "num_frames": num_frames},
    )

    return {
        "file_path": str(file_path),
        "filename": filename,
        "prompt": prompt,
        "duration_seconds": duration_seconds,
        "resolution": resolution,
        "model": VIDEO_MODEL,
        "record_id": record_id,
        "estimated_seconds": estimated_seconds,
        "cpu_mode": AI_DEVICE != "cuda",
    }
