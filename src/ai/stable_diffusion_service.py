"""
AI Image Generator using Stable Diffusion (open-source).

Uses the `diffusers` library with stabilityai/stable-diffusion-xl-base-1.0
or runwayml/stable-diffusion-v1-5. Models are loaded lazily on first request.
Generated images are saved to media/generated/images/ with metadata.
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
SD_MODEL: str = os.environ.get(
    "SD_MODEL", "stabilityai/stable-diffusion-xl-base-1.0"
)

BASE_DIR = Path(__file__).parent.parent.parent
IMAGES_DIR = BASE_DIR / "media" / "generated" / "images"
DB_PATH = BASE_DIR / "media" / "generated" / "media_metadata.db"

SIZE_PRESETS: Dict[str, tuple[int, int]] = {
    "square": (1024, 1024),
    "portrait": (768, 1024),
    "landscape": (1024, 768),
}

STYLE_PROMPTS: Dict[str, str] = {
    "photorealistic": "photorealistic, highly detailed, 8k resolution",
    "illustration": "digital illustration, vibrant colors, artistic",
    "watercolor": "watercolor painting, soft edges, artistic style",
    "cinematic": "cinematic lighting, dramatic, movie still",
    "minimal": "minimalist design, clean, simple",
    "vintage": "vintage style, retro aesthetic, film grain",
}

_pipe: Optional[Any] = None


def _ensure_dirs() -> None:
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)


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
    """Lazy-load the Stable Diffusion pipeline."""
    global _pipe
    if _pipe is None:
        import torch  # type: ignore
        from diffusers import DiffusionPipeline  # type: ignore

        logger.info("Loading Stable Diffusion model: %s on device: %s", SD_MODEL, AI_DEVICE)
        dtype = torch.float16 if AI_DEVICE == "cuda" else torch.float32
        _pipe = DiffusionPipeline.from_pretrained(SD_MODEL, torch_dtype=dtype)
        if AI_DEVICE == "cuda":
            _pipe = _pipe.to("cuda")
        logger.info("Stable Diffusion model loaded.")
    return _pipe


def generate_image(
    prompt: str,
    size: str = "square",
    style_preset: str = "photorealistic",
    negative_prompt: str = "blurry, low quality, distorted",
    return_base64: bool = True,
) -> Dict[str, Any]:
    """
    Generate an image from a text prompt.

    Args:
        prompt: Text description of the desired image.
        size: Image size preset (square, portrait, landscape).
        style_preset: Visual style (photorealistic, illustration, watercolor, cinematic, minimal, vintage).
        negative_prompt: Things to avoid in the image.
        return_base64: If True, include base64-encoded image in response.

    Returns:
        Dict with keys: file_path, base64 (optional), prompt, size, style, record_id.
    """
    _ensure_dirs()
    width, height = SIZE_PRESETS.get(size, (1024, 1024))
    style_suffix = STYLE_PROMPTS.get(style_preset, "")
    full_prompt = f"{prompt}, {style_suffix}" if style_suffix else prompt

    pipe = _get_pipeline()
    image = pipe(
        prompt=full_prompt,
        negative_prompt=negative_prompt,
        width=width,
        height=height,
        num_inference_steps=30,
    ).images[0]

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"img_{timestamp}.png"
    file_path = IMAGES_DIR / filename
    image.save(str(file_path))

    record_id = _save_metadata(
        media_type="image",
        file_path=str(file_path),
        prompt=prompt,
        model=SD_MODEL,
        metadata={"size": size, "style": style_preset, "width": width, "height": height},
    )

    result: Dict[str, Any] = {
        "file_path": str(file_path),
        "filename": filename,
        "prompt": prompt,
        "size": size,
        "style": style_preset,
        "model": SD_MODEL,
        "record_id": record_id,
    }

    if return_base64:
        with open(file_path, "rb") as f:
            result["base64"] = base64.b64encode(f.read()).decode("utf-8")

    return result


def list_generated_images(limit: int = 20) -> list[Dict[str, Any]]:
    """Return metadata for recently generated images."""
    conn = _get_db()
    rows = conn.execute(
        "SELECT id, file_path, prompt, model, metadata, created_at "
        "FROM generated_media WHERE media_type = 'image' "
        "ORDER BY created_at DESC LIMIT ?",
        (limit,),
    ).fetchall()
    conn.close()
    results = []
    for row in rows:
        meta = {}
        try:
            meta = json.loads(row[4]) if row[4] else {}
        except json.JSONDecodeError:
            pass
        results.append(
            {
                "id": row[0],
                "file_path": row[1],
                "prompt": row[2],
                "model": row[3],
                "created_at": row[5],
                **meta,
            }
        )
    return results
