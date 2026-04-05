"""
Base class for platform-specific browser automation.

Every platform module (X, LinkedIn, Instagram, TikTok, YouTube) inherits
from PlatformAutomation and implements the three hooks that differ per site:
  - post_content   — fill the compose UI and submit
  - check_logged_in — verify saved cookies are still valid
  - get_analytics_url — where to screenshot analytics
"""

from __future__ import annotations

import logging
import os
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional

from playwright.async_api import BrowserContext

logger = logging.getLogger(__name__)


class PlatformAutomation(ABC):
    """Base class for platform-specific browser automation."""

    PLATFORM_NAME: str = ""
    LOGIN_URL: str = ""
    HOME_URL: str = ""
    ANALYTICS_URL: str = ""

    # Default viewport — overridden by Instagram (mobile emulation)
    VIEWPORT: Optional[dict] = None

    # Allowed directory for media uploads
    ALLOWED_MEDIA_DIR = Path(os.getenv("MEDIA_DIR", str(Path.home() / "media"))).resolve()

    @staticmethod
    def validate_media_path(path: str) -> Path:
        """Validate media path is under the allowed directory."""
        resolved = Path(path).resolve()
        try:
            resolved.relative_to(PlatformAutomation.ALLOWED_MEDIA_DIR)
        except ValueError:
            raise ValueError(f"Media path '{path}' is outside allowed directory '{PlatformAutomation.ALLOWED_MEDIA_DIR}'")
        if not resolved.is_file():
            raise FileNotFoundError(f"Media file not found: {path}")
        return resolved

    @abstractmethod
    async def post_content(
        self,
        context: BrowserContext,
        content: str,
        media_paths: list[str] | None = None,
    ) -> dict:
        """Post content to the platform.

        Returns:
            dict with keys ``success`` (bool), ``message`` (str),
            and optionally ``url`` (str).
        """
        ...

    @abstractmethod
    async def check_logged_in(self, context: BrowserContext) -> bool:
        """Return *True* when the saved session is still valid."""
        ...

    async def get_analytics_url(self) -> str:
        """URL to the platform's analytics / insights page."""
        return self.ANALYTICS_URL or self.HOME_URL
