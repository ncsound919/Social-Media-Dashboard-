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
from abc import ABC, abstractmethod
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
