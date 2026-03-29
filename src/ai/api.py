"""
FastAPI application exposing all AI Content Creation Suite endpoints.

Run with:
    uvicorn src.ai.api:app --host 0.0.0.0 --port 8000 --reload

Endpoints:
    POST /api/ai/generate-text
    POST /api/ai/generate-image
    POST /api/ai/generate-video
    GET  /api/ai/generate-video/{job_id}
    POST /api/ai/podcast/narrate
    POST /api/ai/podcast/music
    POST /api/ai/podcast/mix
    POST /api/ai/voicebox/synthesize
    POST /api/ai/voicebox/clone
    GET  /api/ai/images
"""
from __future__ import annotations

import logging
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Social Media Dashboard — AI Content Creation Suite",
    description="Open-source AI tools for generating text, images, videos, and audio.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent.parent.parent
MEDIA_DIR = BASE_DIR / "media" / "generated"
UPLOAD_DIR = MEDIA_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")

# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------


class TextGenerateRequest(BaseModel):
    topic: str
    platform: str = "instagram"
    tone: str = "engaging"
    content_type: str = "caption"


class TextGenerateResponse(BaseModel):
    content: str
    topic: str
    platform: str
    tone: str
    content_type: str
    model: str


class ImageGenerateRequest(BaseModel):
    prompt: str
    size: str = "square"
    style_preset: str = "photorealistic"
    negative_prompt: str = "blurry, low quality, distorted"
    return_base64: bool = True


class VideoGenerateRequest(BaseModel):
    prompt: str
    duration_seconds: int = 3
    resolution: str = "sd"


class VideoJobResponse(BaseModel):
    job_id: str
    status: str
    message: str


class VideoStatusResponse(BaseModel):
    job_id: str
    status: str
    result: Optional[dict] = None


class NarrateRequest(BaseModel):
    script: str
    voice: str = "default"


class MusicRequest(BaseModel):
    mood: str
    duration: int = 30


class MixRequest(BaseModel):
    narration_path: str
    music_path: str
    music_volume_db: float = -20.0


class SynthesizeRequest(BaseModel):
    text: str
    speaker_preset: str = "v2/en_speaker_6"


# ---------------------------------------------------------------------------
# Text generation
# ---------------------------------------------------------------------------


@app.post("/api/ai/generate-text", response_model=TextGenerateResponse, tags=["Text AI"])
async def generate_text(req: TextGenerateRequest) -> TextGenerateResponse:
    """Generate social media captions, hashtags, blog drafts, and more with Qwen."""
    from src.ai.qwen_content_generator import generate_content

    try:
        result = generate_content(
            topic=req.topic,
            platform=req.platform,
            tone=req.tone,
            content_type=req.content_type,
        )
        return TextGenerateResponse(**result)
    except Exception as exc:
        logger.exception("Text generation failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Image generation
# ---------------------------------------------------------------------------


@app.post("/api/ai/generate-image", tags=["Image AI"])
async def generate_image(req: ImageGenerateRequest) -> dict:
    """Generate an image from a text prompt using Stable Diffusion."""
    from src.ai.stable_diffusion_service import generate_image as sd_generate

    try:
        result = sd_generate(
            prompt=req.prompt,
            size=req.size,
            style_preset=req.style_preset,
            negative_prompt=req.negative_prompt,
            return_base64=req.return_base64,
        )
        return result
    except Exception as exc:
        logger.exception("Image generation failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/ai/images", tags=["Image AI"])
async def list_images(limit: int = 20) -> list:
    """List previously generated images."""
    from src.ai.stable_diffusion_service import list_generated_images

    return list_generated_images(limit=limit)


# ---------------------------------------------------------------------------
# Video generation (async via Celery)
# ---------------------------------------------------------------------------


@app.post("/api/ai/generate-video", response_model=VideoJobResponse, tags=["Video AI"])
async def generate_video(req: VideoGenerateRequest) -> VideoJobResponse:
    """
    Enqueue a video generation job. Returns a job_id to poll for results.
    """
    try:
        from celery_worker import app as celery_app

        task = celery_app.send_task(
            "celery_worker.generate_video_task",
            kwargs={
                "prompt": req.prompt,
                "duration_seconds": req.duration_seconds,
                "resolution": req.resolution,
            },
            queue="ai_tasks",
        )
        return VideoJobResponse(
            job_id=task.id,
            status="queued",
            message="Video generation job enqueued. Poll /api/ai/generate-video/{job_id} for status.",
        )
    except Exception as exc:
        logger.exception("Failed to enqueue video job: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/ai/generate-video/{job_id}", response_model=VideoStatusResponse, tags=["Video AI"])
async def get_video_status(job_id: str) -> VideoStatusResponse:
    """Poll the status of a video generation job."""
    try:
        from celery.result import AsyncResult  # type: ignore
        from celery_worker import app as celery_app

        result = AsyncResult(job_id, app=celery_app)
        status = result.status
        job_result = None
        if result.ready():
            job_result = result.get(propagate=False)
            if isinstance(job_result, Exception):
                job_result = {"error": str(job_result)}
        return VideoStatusResponse(job_id=job_id, status=status, result=job_result)
    except Exception as exc:
        logger.exception("Failed to get video job status: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Podcast / Audio
# ---------------------------------------------------------------------------


@app.post("/api/ai/podcast/narrate", tags=["Podcast AI"])
async def podcast_narrate(req: NarrateRequest) -> dict:
    """Generate TTS narration from a script using Coqui TTS."""
    from src.ai.podcast_studio import generate_narration

    try:
        path = generate_narration(script=req.script, voice=req.voice)
        return {"file_path": path, "script_preview": req.script[:100]}
    except Exception as exc:
        logger.exception("Narration generation failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/ai/podcast/music", tags=["Podcast AI"])
async def podcast_music(req: MusicRequest) -> dict:
    """Generate background music with Meta's MusicGen."""
    from src.ai.podcast_studio import generate_background_music

    try:
        path = generate_background_music(mood=req.mood, duration=req.duration)
        return {"file_path": path, "mood": req.mood, "duration": req.duration}
    except Exception as exc:
        logger.exception("Music generation failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/ai/podcast/mix", tags=["Podcast AI"])
async def podcast_mix(req: MixRequest) -> dict:
    """Mix narration and background music into a podcast episode."""
    from src.ai.podcast_studio import mix_podcast

    try:
        path = mix_podcast(
            narration_path=req.narration_path,
            music_path=req.music_path,
            music_volume_db=req.music_volume_db,
        )
        return {"file_path": path}
    except Exception as exc:
        logger.exception("Podcast mixing failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# VoiceBox
# ---------------------------------------------------------------------------


@app.post("/api/ai/voicebox/synthesize", tags=["VoiceBox AI"])
async def voicebox_synthesize(req: SynthesizeRequest) -> dict:
    """Synthesize realistic speech from text using Bark."""
    from src.ai.voicebox import synthesize_voice

    try:
        path = synthesize_voice(text=req.text, speaker_preset=req.speaker_preset)
        return {"file_path": path, "speaker_preset": req.speaker_preset}
    except Exception as exc:
        logger.exception("Voice synthesis failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/ai/voicebox/clone", tags=["VoiceBox AI"])
async def voicebox_clone(
    text: str = Form(...),
    reference_audio: UploadFile = File(...),
) -> dict:
    """Clone a voice from a reference audio sample and synthesize text."""
    from src.ai.voicebox import clone_voice

    safe_suffix = Path(reference_audio.filename).suffix.lower()
    if safe_suffix not in {".wav", ".mp3", ".ogg", ".flac", ".m4a"}:
        raise HTTPException(status_code=400, detail="Unsupported audio file type.")
    upload_path = UPLOAD_DIR / f"ref_{int(datetime.utcnow().timestamp() * 1000)}{safe_suffix}"
    try:
        with open(upload_path, "wb") as f:
            shutil.copyfileobj(reference_audio.file, f)
        path = clone_voice(reference_audio_path=str(upload_path), text=text)
        return {"file_path": path}
    except Exception as exc:
        logger.exception("Voice cloning failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        if upload_path.exists():
            upload_path.unlink()


@app.get("/api/ai/voicebox/speakers", tags=["VoiceBox AI"])
async def voicebox_speakers() -> list:
    """List available Bark speaker presets."""
    from src.ai.voicebox import list_speaker_presets

    return list_speaker_presets()


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get("/api/ai/health", tags=["Health"])
async def health() -> dict:
    """Service health check."""
    return {"status": "ok", "device": os.environ.get("AI_DEVICE", "cpu")}
