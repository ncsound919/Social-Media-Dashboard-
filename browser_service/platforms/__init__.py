"""
Platform registry — use ``get_platform(name)`` to obtain the concrete
PlatformAutomation subclass for a given social network.
"""

from __future__ import annotations

from .base import PlatformAutomation
from .instagram import InstagramAutomation
from .linkedin import LinkedInAutomation
from .tiktok import TikTokAutomation
from .x_twitter import XTwitterAutomation
from .youtube import YouTubeAutomation

_REGISTRY: dict[str, type[PlatformAutomation]] = {
    "x": XTwitterAutomation,
    "linkedin": LinkedInAutomation,
    "instagram": InstagramAutomation,
    "tiktok": TikTokAutomation,
    "youtube": YouTubeAutomation,
}

VALID_PLATFORMS: list[str] = list(_REGISTRY.keys())


def get_platform(name: str) -> PlatformAutomation:
    """Factory — returns an *instance* of the requested platform handler.

    Raises ``ValueError`` for unknown platform names.
    """
    key = name.lower().strip()
    cls = _REGISTRY.get(key)
    if cls is None:
        raise ValueError(
            f"Unknown platform '{name}'. Valid options: {', '.join(VALID_PLATFORMS)}"
        )
    return cls()
