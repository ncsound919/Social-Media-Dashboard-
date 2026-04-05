"""
X / Twitter browser automation.

Post flow
---------
1. Navigate to https://x.com/compose/post  (compose dialog)
2. Type content into the contenteditable compose area
3. Optionally attach media via the media-upload input
4. Click the "Post" button

Login detection: after the user completes the OAuth / password flow the
browser redirects to ``https://x.com/home`` — we detect that URL.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

from playwright.async_api import BrowserContext, TimeoutError as PwTimeout

from .base import PlatformAutomation

logger = logging.getLogger(__name__)

_TIMEOUT = 30_000  # 30 s default selector timeout


class XTwitterAutomation(PlatformAutomation):
    PLATFORM_NAME = "x"
    LOGIN_URL = "https://x.com/i/flow/login"
    HOME_URL = "https://x.com/home"
    ANALYTICS_URL = "https://analytics.twitter.com"

    # ------------------------------------------------------------------
    # Login check
    # ------------------------------------------------------------------
    async def check_logged_in(self, context: BrowserContext) -> bool:
        page = await context.new_page()
        try:
            await page.goto(self.HOME_URL, wait_until="domcontentloaded", timeout=_TIMEOUT)
            # If we land on /home and can find the compose button, we're in.
            try:
                await page.wait_for_selector(
                    'a[href="/compose/post"], a[data-testid="SideNav_NewTweet_Button"]',
                    timeout=10_000,
                )
                return True
            except PwTimeout:
                return False
        except Exception as exc:
            logger.warning("X login check failed: %s", exc)
            return False
        finally:
            await page.close()

    # ------------------------------------------------------------------
    # Post content
    # ------------------------------------------------------------------
    async def post_content(
        self,
        context: BrowserContext,
        content: str,
        media_paths: list[str] | None = None,
    ) -> dict:
        page = await context.new_page()
        try:
            # 1. Navigate to compose URL
            await page.goto(
                "https://x.com/compose/post",
                wait_until="domcontentloaded",
                timeout=_TIMEOUT,
            )

            # 2. Wait for the compose text area
            compose_box = await page.wait_for_selector(
                'div[data-testid="tweetTextarea_0"], '
                'div[role="textbox"][data-testid="tweetTextarea_0"], '
                'div[contenteditable="true"][role="textbox"]',
                timeout=_TIMEOUT,
            )
            if compose_box is None:
                return {"success": False, "message": "Could not find compose box — session may be expired, please re-login"}

            await compose_box.click()
            await page.keyboard.type(content, delay=30)

            # 3. Attach media
            if media_paths:
                for path in media_paths:
                    abs_path = str(Path(path).resolve())
                    if not os.path.isfile(abs_path):
                        logger.warning("Media file not found: %s", abs_path)
                        continue
                    # X exposes a hidden file input we can set directly
                    file_input = await page.wait_for_selector(
                        'input[data-testid="fileInput"], input[type="file"]',
                        timeout=10_000,
                    )
                    if file_input:
                        await file_input.set_input_files(abs_path)
                        # Wait a moment for upload to process
                        await page.wait_for_timeout(2000)

            # 4. Click Post
            post_btn = await page.wait_for_selector(
                'button[data-testid="tweetButton"], '
                'button[data-testid="tweetButtonInline"]',
                timeout=_TIMEOUT,
            )
            if post_btn is None:
                return {"success": False, "message": "Could not find Post button"}

            await post_btn.click()

            # 5. Wait for navigation / confirmation
            await page.wait_for_timeout(3000)

            return {
                "success": True,
                "message": "Post published on X",
                "url": page.url,
            }

        except PwTimeout:
            return {
                "success": False,
                "message": "Session expired or X UI changed — please re-login",
            }
        except Exception as exc:
            logger.exception("X post_content error")
            return {"success": False, "message": f"Error posting to X: {exc}"}
        finally:
            await page.close()
