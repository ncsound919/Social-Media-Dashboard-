"""
VoiceBox: Voice Synthesis and Cloning using open-source models.

- Bark (suno-ai/bark) for realistic multi-speaker TTS synthesis
- OpenVoice (myshell-ai/OpenVoice) for zero-shot voice cloning
"""
from __future__ import annotations

import json
import logging
import os
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

AI_DEVICE: str = os.environ.get("AI_DEVICE", "cpu")

BASE_DIR = Path(__file__).parent.parent.parent
AUDIO_DIR = BASE_DIR / "media" / "generated" / "audio"
DB_PATH = BASE_DIR / "media" / "generated" / "media_metadata.db"

BARK_SPEAKER_PRESETS = [
    "v2/en_speaker_0",
    "v2/en_speaker_1",
    "v2/en_speaker_2",
    "v2/en_speaker_3",
    "v2/en_speaker_4",
    "v2/en_speaker_5",
    "v2/en_speaker_6",
    "v2/en_speaker_7",
    "v2/en_speaker_8",
    "v2/en_speaker_9",
]

_bark_loaded: bool = False


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


def _load_bark() -> None:
    """Lazy-load Bark models into memory."""
    global _bark_loaded
    if not _bark_loaded:
        from bark import preload_models  # type: ignore

        logger.info("Loading Bark models (this may take a while)...")
        preload_models()
        _bark_loaded = True
        logger.info("Bark models loaded.")


def synthesize_voice(
    text: str,
    speaker_preset: str = "v2/en_speaker_6",
) -> str:
    """
    Synthesize speech from text using Bark.

    Args:
        text: Text to synthesize (supports [laughter], [sighs], etc. Bark prompts).
        speaker_preset: One of the Bark speaker presets.

    Returns:
        Path to the generated WAV file.
    """
    import numpy as np  # type: ignore
    import scipy.io.wavfile as wav  # type: ignore
    from bark import SAMPLE_RATE, generate_audio  # type: ignore

    _ensure_dirs()
    _load_bark()

    if speaker_preset not in BARK_SPEAKER_PRESETS:
        speaker_preset = "v2/en_speaker_6"

    audio_array = generate_audio(text, history_prompt=speaker_preset)

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    filename = f"bark_{timestamp}.wav"
    file_path = str(AUDIO_DIR / filename)

    wav.write(file_path, SAMPLE_RATE, audio_array)

    _save_metadata(
        media_type="audio_synthesis",
        file_path=file_path,
        prompt=text[:200],
        model="suno-ai/bark",
        metadata={"speaker_preset": speaker_preset},
    )
    return file_path


def clone_voice(
    reference_audio_path: str,
    text: str,
) -> str:
    """
    Clone a voice from a reference audio sample and synthesize text with it.

    Uses OpenVoice for zero-shot voice cloning.

    Args:
        reference_audio_path: Path to the reference audio file (WAV or MP3).
        text: Text to synthesize in the cloned voice.

    Returns:
        Path to the generated audio file.
    """
    _ensure_dirs()

    from openvoice import se_extractor  # type: ignore
    from openvoice.api import ToneColorConverter  # type: ignore

    logger.info("Loading OpenVoice ToneColorConverter...")
    # OPENVOICE_CKPT must point to a directory containing config.json and checkpoint.pth.
    # Clone the OpenVoice repository and download the pretrained checkpoints:
    #   git clone https://github.com/myshell-ai/OpenVoice
    #   Then set OPENVOICE_CKPT=/path/to/OpenVoice/checkpoints/converter
    ckpt_converter = os.environ.get(
        "OPENVOICE_CKPT", "checkpoints/converter"
    )
    device = "cuda" if AI_DEVICE == "cuda" else "cpu"
    tone_color_converter = ToneColorConverter(
        f"{ckpt_converter}/config.json", device=device
    )
    tone_color_converter.load_ckpt(f"{ckpt_converter}/checkpoint.pth")

    target_se, _ = se_extractor.get_se(
        reference_audio_path, tone_color_converter, vad=True
    )

    from bark import SAMPLE_RATE, generate_audio  # type: ignore
    import scipy.io.wavfile as wav  # type: ignore

    _load_bark()
    base_audio = generate_audio(text, history_prompt="v2/en_speaker_6")

    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    base_filename = f"clone_base_{timestamp}.wav"
    base_path = str(AUDIO_DIR / base_filename)
    wav.write(base_path, SAMPLE_RATE, base_audio)

    output_filename = f"clone_{timestamp}.wav"
    output_path = str(AUDIO_DIR / output_filename)

    src_se, _ = se_extractor.get_se(base_path, tone_color_converter, vad=False)
    tone_color_converter.convert(
        audio_src_path=base_path,
        src_se=src_se,
        tgt_se=target_se,
        output_path=output_path,
    )

    _save_metadata(
        media_type="audio_clone",
        file_path=output_path,
        prompt=text[:200],
        model="myshell-ai/OpenVoice",
        metadata={"reference_audio": reference_audio_path},
    )
    return output_path


def list_speaker_presets() -> list[str]:
    """Return available Bark speaker presets."""
    return BARK_SPEAKER_PRESETS
