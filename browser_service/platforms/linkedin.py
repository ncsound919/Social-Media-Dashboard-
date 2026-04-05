"""
LinkedIn browser automation.

Post flow
---------
1. Navigate to https://www.linkedin.com/feed/
2. Click the "Start a post" button to open the post modal
3. Type content into the modal editor
4. Optionally attach media
5. Click the "Post" button

Login detection: presence of the feed nav-bar / identity module.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

from playwright.async_api import BrowserContext, TimeoutError as PwTimeout

from .base import PlatformAutomation

logger = logging.getLogger(__name__)

_TIMEOUT = 30_000


class LinkedInAutomation(PlatformAutomation):
    PLATFORM_NAME = "linkedin"
    LOGIN_URL = "https://www.linkedin.com/login"
    HOME_URL = "https://www.linkedin.com/feed/"
    ANALYTICS_URL = "https://www.linkedin.com/analytics/"

    # ------------------------------------------------------------------
    async def check_logged_in(self, context: BrowserContext) -> bool:
        page = await context.new_page()
        try:
            await page.goto(self.HOME_URL, wait_until="domcontentloaded", timeout=_TIMEOUT)
            try:
                # The global nav identity module appears when logged in
                await page.wait_for_selector(
                    'div.feed-identity-module, '
                    'div[data-test-id="feed-sort-dropdown"], '
                    'button[aria-label="Start a post"]',
                    timeout=10_000,
                )
                return True
            except PwTimeout:
                return False
        except Exception as exc:
            logger.warning("LinkedIn login check failed: %s", exc)
            return False
        finally:
            await page.close()

    # ------------------------------------------------------------------
    async def post_content(
        self,
        context: BrowserContext,
        content: str,
        media_paths: list[str] | None = None,
    ) -> dict:
        page = await context.new_page()
        try:
            await page.goto(self.HOME_URL, wait_until="domcontentloaded", timeout=_TIMEOUT)

            # 1. Click "Start a post"
            start_post = await page.wait_for_selector(
                'button:has-text("Start a post"), '
                'button[aria-label="Start a post"], '
                'div.share-box-feed-entry__trigger',
                timeout=_TIMEOUT,
            )
            if start_post is None:
                return {"success": False, "message": "Session expired, please re-login"}

            await start_post.click()
            await page.wait_for_timeout(1500)

            # 2. Type into the modal editor
            editor = await page.wait_for_selector(
                'div[role="textbox"][contenteditable="true"], '
                'div.ql-editor[contenteditable="true"]',
                timeout=_TIMEOUT,
            )
            if editor is None:
                return {"success": False, "message": "Could not find post editor"}

            await editor.click()
            await page.keyboard.type(content, delay=25)

            # 3. Attach media
            if media_paths:
                # Click the media (image) toolbar button to reveal file input
                media_btn = await page.query_selector(
                    'button[aria-label="Add media"], '
                    'button[aria-label="Add a photo"], '
                    'button:has(svg[data-test-icon="image-medium"])'
                )
                if media_btn:
                    await media_btn.click()
                    await page.wait_for_timeout(1000)

                file_input = await page.query_selector('input[type="file"]')
                if file_input:
                    for path in media_paths:
                        abs_path = str(Path(path).resolve())
                        if os.path.isfile(abs_path):
                            await file_input.set_input_files(abs_path)
                            await page.wait_for_timeout(2000)
                        else:
                            logger.warning("Media file not found: %s", abs_path)

            # 4. Click "Post"
            post_btn = await page.wait_for_selector(
                'button:has-text("Post"):not([disabled]), '
                'button.share-actions__primary-action',
                timeout=_TIMEOUT,
            )
            if post_btn is None:
                return {"success": False, "message": "Could not find Post button"}

            await post_btn.click()
            await page.wait_for_timeout(3000)

            return {
                "success": True,
                "message": "Post published on LinkedIn",
                "url": page.url,
            }

        except PwTimeout:
            return {
                "success": False,
                "message": "Session expired or LinkedIn UI changed — please re-login",
            }
        except Exception as exc:
            logger.exception("LinkedIn post_content error")
            return {"success": False, "message": f"Error posting to LinkedIn: {exc}"}
        finally:
            await page.close()
