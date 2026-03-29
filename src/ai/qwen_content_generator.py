"""
AI Text & Caption Generator using Qwen2.5 (open-source LLM).

Supports HuggingFace Transformers pipeline or an Ollama local API backend
depending on the environment variable AI_BACKEND (transformers|ollama).
Models are loaded lazily on first request to avoid startup overhead.
"""
from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

AI_DEVICE: str = os.environ.get("AI_DEVICE", "cpu")
AI_BACKEND: str = os.environ.get("AI_BACKEND", "transformers")
# Default to the lighter 3B model for CPU-friendly deployments.
# Override with QWEN_MODEL=Qwen/Qwen2.5-7B-Instruct for higher quality on GPU.
QWEN_MODEL: str = os.environ.get("QWEN_MODEL", "Qwen/Qwen2.5-3B-Instruct")
OLLAMA_URL: str = os.environ.get("OLLAMA_URL", "http://localhost:11434")

PLATFORM_HINTS: Dict[str, str] = {
    "twitter": "Keep it under 280 characters. Include 2-3 relevant hashtags.",
    "instagram": "Write an engaging caption up to 2200 characters. Include 5-10 hashtags at the end.",
    "linkedin": "Professional tone, 1300 characters max. Focus on value and insight.",
    "tiktok": "Short, punchy, fun. Include trending hashtags. Hook in first sentence.",
}

_pipeline: Optional[Any] = None


def _get_pipeline() -> Any:
    """Lazy-load the HuggingFace pipeline."""
    global _pipeline
    if _pipeline is None:
        import torch  # type: ignore
        from transformers import pipeline  # type: ignore

        logger.info("Loading Qwen model: %s on device: %s", QWEN_MODEL, AI_DEVICE)
        _pipeline = pipeline(
            "text-generation",
            model=QWEN_MODEL,
            device_map="cpu" if AI_DEVICE == "cpu" else "auto",
            torch_dtype=torch.float32 if AI_DEVICE == "cpu" else torch.float16,
            model_kwargs={"low_cpu_mem_usage": True},
            trust_remote_code=False,
        )
        logger.info("Qwen model loaded.")
    return _pipeline


def _ollama_generate(prompt: str) -> str:
    """Call the Ollama local API for text generation."""
    ollama_model = os.environ.get("OLLAMA_MODEL", "qwen2.5:7b")
    payload = json.dumps({"model": ollama_model, "prompt": prompt, "stream": False}).encode()
    req = urllib.request.Request(
        f"{OLLAMA_URL}/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode())
        return data.get("response", "").strip()


def _build_prompt(
    topic: str,
    platform: str,
    tone: str,
    content_type: str,
) -> str:
    hint = PLATFORM_HINTS.get(platform.lower(), "")
    return (
        f"You are a professional social media content creator.\n\n"
        f"Topic: {topic}\n"
        f"Platform: {platform}\n"
        f"Tone: {tone}\n"
        f"Content type: {content_type}\n"
        f"Platform guidance: {hint}\n\n"
        f"Generate the {content_type} now. Return only the final content, no explanations."
    )


def generate_content(
    topic: str,
    platform: str = "instagram",
    tone: str = "engaging",
    content_type: str = "caption",
) -> Dict[str, Any]:
    """
    Generate social media content using the configured AI backend.

    Args:
        topic: Subject of the content.
        platform: Target platform (twitter, instagram, linkedin, tiktok).
        tone: Desired tone (engaging, professional, humorous, inspirational).
        content_type: Type of content (caption, hashtags, blog_draft, calendar_idea, post_copy).

    Returns:
        Dict with keys: content, topic, platform, tone, content_type, model.
    """
    prompt = _build_prompt(topic, platform, tone, content_type)

    if AI_BACKEND == "ollama":
        text = _ollama_generate(prompt)
    else:
        pipe = _get_pipeline()
        outputs = pipe(prompt, max_new_tokens=512, do_sample=True, temperature=0.7)
        generated = outputs[0]["generated_text"]
        text = generated[len(prompt):].strip() if generated.startswith(prompt) else generated.strip()

    return {
        "content": text,
        "topic": topic,
        "platform": platform,
        "tone": tone,
        "content_type": content_type,
        "model": QWEN_MODEL if AI_BACKEND != "ollama" else os.environ.get("OLLAMA_MODEL", "qwen2.5:7b"),
    }


def generate_hashtags(topic: str, platform: str = "instagram", count: int = 10) -> List[str]:
    """Generate a list of relevant hashtags for a topic."""
    result = generate_content(
        topic=topic,
        platform=platform,
        tone="engaging",
        content_type=f"list of {count} relevant hashtags (one per line, starting with #)",
    )
    lines = result["content"].splitlines()
    return [line.strip() for line in lines if line.strip().startswith("#")]


def generate_content_calendar(topic: str, days: int = 7) -> List[Dict[str, str]]:
    """Generate a content calendar with ideas for each day."""
    result = generate_content(
        topic=topic,
        platform="general",
        tone="professional",
        content_type=(
            f"content calendar with {days} daily post ideas. "
            f"Format each as: Day N: [Platform] - [Idea]"
        ),
    )
    ideas = []
    for line in result["content"].splitlines():
        line = line.strip()
        if line:
            ideas.append({"idea": line})
    return ideas
