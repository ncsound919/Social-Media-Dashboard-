"""
Podcast & Audio Generator using open-source TTS and music generation.

- Coqui TTS for text-to-speech narration
- Meta AudioCraft (MusicGen) for background music
- pydub for audio mixing
"""
from __future__ import annotations

import json
import logging
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

AI_DEVICE: str = os.environ.get("AI_DEVICE", "cpu")

BASE_DIR = Path(__file__).parent.parent.parent
AUDIO_DIR = BASE_DIR / "media" / "generated" / "audio"
DB_PATH = BASE_DIR / "media" / "generated" / "media_metadata.db"

COQUI_MODEL: str = os.environ.get("COQUI_MODEL", "tts_models/en/ljspeech/tacotron2-DDC")
MUSICGEN_MODEL: str = os.environ.get("MUSICGEN_MODEL", "facebook/musicgen-small")

_tts_model: Optional[Any] = None
_music_model: Optional[Any] = None


def _ensure_dirs() -> None:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)


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


def _get_tts() -> Any:
    """Lazy-load the Coqui TTS model."""
    global _tts_model
    if _tts_model is None:
        from TTS.api import TTS  # type: ignore

        logger.info("Loading Coqui TTS model: %s", COQUI_MODEL)
        _tts_model = TTS(COQUI_MODEL)
        logger.info("Coqui TTS model loaded.")
    return _tts_model


def _get_music_model() -> Any:
    """Lazy-load the MusicGen model."""
    global _music_model
    if _music_model is None:
        from audiocraft.models import MusicGen  # type: ignore

        logger.info("Loading MusicGen model: %s", MUSICGEN_MODEL)
        _music_model = MusicGen.get_pretrained(MUSICGEN_MODEL)
        logger.info("MusicGen model loaded.")
    return _music_model


def generate_narration(script: str, voice: str = "default") -> str:
    """
    Generate TTS narration from a script using Coqui TTS.

    Args:
        script: Text to narrate.
        voice: Voice model identifier (passed as speaker name if multi-speaker).

    Returns:
        Path to the generated audio file.
    """
    _ensure_dirs()
    tts = _get_tts()
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"narration_{timestamp}.wav"
    file_path = str(AUDIO_DIR / filename)

    if hasattr(tts, "speakers") and tts.speakers and voice in tts.speakers:
        tts.tts_to_file(text=script, speaker=voice, file_path=file_path)
    else:
        tts.tts_to_file(text=script, file_path=file_path)

    _save_metadata(
        media_type="audio_narration",
        file_path=file_path,
        prompt=script[:200],
        model=COQUI_MODEL,
        metadata={"voice": voice},
    )
    return file_path


def generate_background_music(mood: str, duration: int = 30) -> str:
    """
    Generate background music using Meta's MusicGen.

    Args:
        mood: Mood/style description (e.g., "relaxing ambient", "upbeat pop").
        duration: Duration in seconds.

    Returns:
        Path to the generated audio file.
    """
    _ensure_dirs()
    import torch  # type: ignore
    import torchaudio  # type: ignore

    model = _get_music_model()
    model.set_generation_params(duration=duration)

    wav = model.generate([mood])

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"music_{timestamp}.wav"
    file_path = str(AUDIO_DIR / filename)

    torchaudio.save(file_path, wav[0].cpu(), model.sample_rate)

    _save_metadata(
        media_type="audio_music",
        file_path=file_path,
        prompt=mood,
        model=MUSICGEN_MODEL,
        metadata={"duration": duration},
    )
    return file_path


def mix_podcast(
    narration_path: str,
    music_path: str,
    output_path: Optional[str] = None,
    music_volume_db: float = -20.0,
) -> str:
    """
    Mix narration with background music using pydub.

    Args:
        narration_path: Path to the narration audio file.
        music_path: Path to the background music file.
        output_path: Output file path. Auto-generated if None.
        music_volume_db: Volume adjustment for background music in dB (negative = quieter).

    Returns:
        Path to the mixed output file.
    """
    from pydub import AudioSegment  # type: ignore

    narration = AudioSegment.from_file(narration_path)
    music = AudioSegment.from_file(music_path)

    music = music + music_volume_db

    if len(music) < len(narration):
        repeats = (len(narration) // len(music)) + 1
        music = music * repeats
    music = music[: len(narration)]

    mixed = narration.overlay(music)

    if output_path is None:
        _ensure_dirs()
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        output_path = str(AUDIO_DIR / f"podcast_{timestamp}.mp3")

    mixed.export(output_path, format="mp3")

    _save_metadata(
        media_type="audio_podcast",
        file_path=output_path,
        prompt=f"Mix: {narration_path} + {music_path}",
        model="pydub",
        metadata={"narration": narration_path, "music": music_path, "music_volume_db": music_volume_db},
    )
    return output_path
