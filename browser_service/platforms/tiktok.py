"""
TikTok browser automation.

Post flow
---------
1. Navigate to https://www.tiktok.com/creator#/upload
2. Upload video via file input
3. Fill in caption / description
4. Click "Post" button

TikTok creator studio is the most reliable entry-point for desktop
uploads; the main feed does not expose a compose flow.
"""

from __future__ import annotations

import logging

from playwright.async_api import BrowserContext, TimeoutError as PwTimeout

from .base import PlatformAutomation

logger = logging.getLogger(__name__)

_TIMEOUT = 30_000


class TikTokAutomation(PlatformAutomation):
    PLATFORM_NAME = "tiktok"
    LOGIN_URL = "https://www.tiktok.com/login"
    HOME_URL = "https://www.tiktok.com/"
    ANALYTICS_URL = "https://www.tiktok.com/creator#/analytics"

    UPLOAD_URL = "https://www.tiktok.com/creator#/upload"

    # ------------------------------------------------------------------
    async def check_logged_in(self, context: BrowserContext) -> bool:
        page = await context.new_page()
        try:
            await page.goto(self.HOME_URL, wait_until="domcontentloaded", timeout=_TIMEOUT)
            try:
                # Avatar / profile icon only visible when logged in
                await page.wait_for_selector(
                    'div[data-e2e="profile-icon"], '
                    'a[data-e2e="upload-icon"], '
                    'span[data-e2e="nav-profile"]',
                    timeout=10_000,
                )
                return True
            except PwTimeout:
                return False
        except Exception as exc:
            logger.warning("TikTok login check failed: %s", exc)
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
            await page.goto(self.UPLOAD_URL, wait_until="domcontentloaded", timeout=_TIMEOUT)
            await page.wait_for_timeout(2000)

            # 1. Upload video via file input
            if not media_paths:
                return {
                    "success": False,
                    "message": "TikTok requires at least one video file",
                }

            video_path: str | None = None
            for p in media_paths:
                try:
                    resolved = self.validate_media_path(p)
                    video_path = str(resolved)
                    break
                except (ValueError, FileNotFoundError) as exc:
                    logger.warning("Skipping media: %s", exc)

            if video_path is None:
                return {"success": False, "message": "No valid video file found"}

            file_input = await page.wait_for_selector(
                'input[type="file"][accept*="video"], input[type="file"]',
                timeout=_TIMEOUT,
            )
            if file_input is None:
                return {
                    "success": False,
                    "message": "Could not find upload input — session may be expired, please re-login",
                }

            await file_input.set_input_files(video_path)
            # Wait for upload to begin processing
            await page.wait_for_timeout(5000)

            # 2. Fill caption / description
            caption_box = await page.wait_for_selector(
                'div[contenteditable="true"][data-text="true"], '
                'div[contenteditable="true"].public-DraftEditor-content, '
                'div[contenteditable="true"]',
                timeout=_TIMEOUT,
            )
            if caption_box:
                await caption_box.click()
                # Clear any pre-filled text
                await page.keyboard.press("Control+a")
                await page.keyboard.type(content, delay=25)

            # 3. Click Post
            post_btn = await page.wait_for_selector(
                'button:has-text("Post"), '
                'button[data-e2e="post-button"], '
                'div.btn-post button',
                timeout=_TIMEOUT,
            )
            if post_btn is None:
                return {"success": False, "message": "Could not find Post button"}

            await post_btn.click()
            await page.wait_for_timeout(5000)

            return {
                "success": True,
                "message": "Video posted on TikTok",
                "url": page.url,
            }

        except PwTimeout:
            return {
                "success": False,
                "message": "Session expired or TikTok UI changed — please re-login",
            }
        except Exception as exc:
            logger.exception("TikTok post_content error")
            return {"success": False, "message": "Error posting to TikTok — check server logs"}
        finally:
            await page.close()
