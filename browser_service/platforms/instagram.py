"""
Instagram browser automation (mobile-emulated viewport).

Post flow — mobile emulation (iPhone 12 Pro)
----------------------------------------------
1. Navigate to https://www.instagram.com/
2. Click the "+" create button in the bottom nav
3. Select media via hidden file input
4. Advance through the crop / filter screens
5. Enter caption text, click Share

Desktop Instagram has very limited posting capability, so we use a
mobile-sized viewport and the ``isMobile`` flag to trigger the mobile
web experience.
"""

from __future__ import annotations

import logging

from playwright.async_api import BrowserContext, TimeoutError as PwTimeout

from .base import PlatformAutomation

logger = logging.getLogger(__name__)

_TIMEOUT = 30_000


class InstagramAutomation(PlatformAutomation):
    PLATFORM_NAME = "instagram"
    LOGIN_URL = "https://www.instagram.com/accounts/login/"
    HOME_URL = "https://www.instagram.com/"
    ANALYTICS_URL = "https://www.instagram.com/accounts/insights/"

    # iPhone 12 Pro viewport
    VIEWPORT = {"width": 390, "height": 844}

    # ------------------------------------------------------------------
    async def check_logged_in(self, context: BrowserContext) -> bool:
        page = await context.new_page()
        try:
            await page.goto(self.HOME_URL, wait_until="domcontentloaded", timeout=_TIMEOUT)
            try:
                # Bottom nav bar only shows when logged in on mobile web
                await page.wait_for_selector(
                    'svg[aria-label="Home"], '
                    'a[href="/accounts/activity/"], '
                    'nav[role="navigation"] a[href*="/direct/"]',
                    timeout=10_000,
                )
                return True
            except PwTimeout:
                return False
        except Exception as exc:
            logger.warning("Instagram login check failed: %s", exc)
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

            # Dismiss any "Turn on Notifications" / cookie dialogs
            for dismiss_text in ["Not Now", "Decline", "Accept"]:
                try:
                    btn = await page.wait_for_selector(
                        f'button:has-text("{dismiss_text}")', timeout=3000
                    )
                    if btn:
                        await btn.click()
                        await page.wait_for_timeout(500)
                except PwTimeout:
                    pass

            # 1. Click the create / "+" button
            create_btn = await page.wait_for_selector(
                'svg[aria-label="New post"], '
                'a[href="/create/style/"], '
                'div[role="menuitem"]:has-text("Create"), '
                'svg[aria-label="New Post"]',
                timeout=_TIMEOUT,
            )
            if create_btn is None:
                return {"success": False, "message": "Session expired, please re-login"}

            await create_btn.click()
            await page.wait_for_timeout(1500)

            # 2. Upload media via file input
            if not media_paths:
                return {
                    "success": False,
                    "message": "Instagram requires at least one media file",
                }

            file_input = await page.wait_for_selector(
                'input[type="file"][accept*="image"], input[type="file"]',
                timeout=_TIMEOUT,
            )
            if file_input is None:
                return {"success": False, "message": "Could not find file upload input"}

            valid_paths: list[str] = []
            for p in media_paths:
                try:
                    resolved = self.validate_media_path(p)
                    valid_paths.append(str(resolved))
                except (ValueError, FileNotFoundError) as exc:
                    logger.warning("Skipping media: %s", exc)

            if not valid_paths:
                return {"success": False, "message": "No valid media files found"}

            await file_input.set_input_files(valid_paths[0])
            await page.wait_for_timeout(2000)

            # 3. Advance through crop / filter screens
            for _ in range(2):
                try:
                    next_btn = await page.wait_for_selector(
                        'button:has-text("Next"), '
                        'div[role="button"]:has-text("Next")',
                        timeout=5000,
                    )
                    if next_btn:
                        await next_btn.click()
                        await page.wait_for_timeout(1500)
                except PwTimeout:
                    break

            # 4. Enter caption
            try:
                caption_box = await page.wait_for_selector(
                    'textarea[aria-label="Write a caption..."], '
                    'div[role="textbox"][contenteditable="true"], '
                    'textarea[placeholder*="caption"]',
                    timeout=10_000,
                )
                if caption_box:
                    await caption_box.click()
                    await page.keyboard.type(content, delay=25)
            except PwTimeout:
                logger.warning("Caption field not found — posting without caption")

            # 5. Click Share
            share_btn = await page.wait_for_selector(
                'button:has-text("Share"), '
                'div[role="button"]:has-text("Share")',
                timeout=_TIMEOUT,
            )
            if share_btn is None:
                return {"success": False, "message": "Could not find Share button"}

            await share_btn.click()
            await page.wait_for_timeout(4000)

            return {
                "success": True,
                "message": "Post published on Instagram",
                "url": page.url,
            }

        except PwTimeout:
            return {
                "success": False,
                "message": "Session expired or Instagram UI changed — please re-login",
            }
        except Exception as exc:
            logger.exception("Instagram post_content error")
            return {"success": False, "message": "Error posting to Instagram — check server logs"}
        finally:
            await page.close()
