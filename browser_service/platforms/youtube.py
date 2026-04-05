"""
YouTube browser automation (via YouTube Studio).

Post flow
---------
1. Navigate to https://studio.youtube.com
2. Click "CREATE" → "Upload videos"
3. Select the video file via hidden file input
4. Fill in title and description
5. Walk through the upload wizard (details → video elements → checks → visibility)
6. Set visibility to Public and click Publish / Done

Login is handled through Google accounts; session cookies cover
``studio.youtube.com``.
"""

from __future__ import annotations

import logging

from playwright.async_api import BrowserContext, TimeoutError as PwTimeout

from .base import PlatformAutomation

logger = logging.getLogger(__name__)

_TIMEOUT = 30_000


class YouTubeAutomation(PlatformAutomation):
    PLATFORM_NAME = "youtube"
    LOGIN_URL = "https://accounts.google.com/signin"
    HOME_URL = "https://studio.youtube.com"
    ANALYTICS_URL = "https://studio.youtube.com/channel/analytics"

    # ------------------------------------------------------------------
    async def check_logged_in(self, context: BrowserContext) -> bool:
        page = await context.new_page()
        try:
            await page.goto(self.HOME_URL, wait_until="domcontentloaded", timeout=_TIMEOUT)
            try:
                # Studio dashboard elements only visible when authenticated
                await page.wait_for_selector(
                    'ytcp-button#create-icon, '
                    'ytcp-button#upload-icon, '
                    'div#dashboard',
                    timeout=10_000,
                )
                return True
            except PwTimeout:
                return False
        except Exception as exc:
            logger.warning("YouTube login check failed: %s", exc)
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
            await page.wait_for_timeout(2000)

            if not media_paths:
                return {
                    "success": False,
                    "message": "YouTube requires a video file to upload",
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

            # 1. Click CREATE button
            create_btn = await page.wait_for_selector(
                'ytcp-button#create-icon, '
                'button#create-icon, '
                'tp-yt-paper-icon-button#create-icon',
                timeout=_TIMEOUT,
            )
            if create_btn is None:
                return {"success": False, "message": "Session expired, please re-login"}

            await create_btn.click()
            await page.wait_for_timeout(1000)

            # 2. Click "Upload videos" from dropdown
            upload_option = await page.wait_for_selector(
                'tp-yt-paper-item:has-text("Upload videos"), '
                'a#menu-item-0, '
                'tp-yt-paper-item:first-child',
                timeout=10_000,
            )
            if upload_option:
                await upload_option.click()
                await page.wait_for_timeout(1500)

            # 3. Upload video via file input
            file_input = await page.wait_for_selector(
                'input[type="file"][accept*="video"], input[type="file"]',
                timeout=_TIMEOUT,
            )
            if file_input is None:
                return {"success": False, "message": "Could not find file upload input"}

            await file_input.set_input_files(video_path)
            # Wait for processing to start
            await page.wait_for_timeout(5000)

            # 4. Fill title (first textbox in details)
            title_box = await page.wait_for_selector(
                'div#textbox[contenteditable="true"], '
                'ytcp-social-suggestions-textbox div[contenteditable="true"]',
                timeout=_TIMEOUT,
            )
            if title_box:
                await title_box.click()
                await page.keyboard.press("Control+a")
                # Use the content as title — first line or truncated
                title_text = content.split("\n")[0][:100] if content else "Untitled"
                await page.keyboard.type(title_text, delay=20)

            # 5. Fill description (second textbox)
            desc_boxes = await page.query_selector_all(
                'div#textbox[contenteditable="true"], '
                'ytcp-social-suggestions-textbox div[contenteditable="true"]'
            )
            if len(desc_boxes) >= 2:
                await desc_boxes[1].click()
                await page.keyboard.type(content, delay=20)

            # 6. Walk through wizard — click "NEXT" until we reach Visibility
            for step in range(3):
                try:
                    next_btn = await page.wait_for_selector(
                        'ytcp-button#next-button, '
                        'button#next-button',
                        timeout=10_000,
                    )
                    if next_btn:
                        await next_btn.click()
                        await page.wait_for_timeout(2000)
                except PwTimeout:
                    break

            # 7. Set visibility to Public
            try:
                public_radio = await page.wait_for_selector(
                    'tp-yt-paper-radio-button[name="PUBLIC"], '
                    'div#radioLabel:has-text("Public")',
                    timeout=10_000,
                )
                if public_radio:
                    await public_radio.click()
                    await page.wait_for_timeout(1000)
            except PwTimeout:
                logger.warning("Could not find Public visibility option")

            # 8. Click Publish / Done
            done_btn = await page.wait_for_selector(
                'ytcp-button#done-button, '
                'button#done-button',
                timeout=_TIMEOUT,
            )
            if done_btn:
                await done_btn.click()
                await page.wait_for_timeout(5000)

            return {
                "success": True,
                "message": "Video published on YouTube",
                "url": page.url,
            }

        except PwTimeout:
            return {
                "success": False,
                "message": "Session expired or YouTube UI changed — please re-login",
            }
        except Exception as exc:
            logger.exception("YouTube post_content error")
            return {"success": False, "message": "Error posting to YouTube — check server logs"}
        finally:
            await page.close()
