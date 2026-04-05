"""
Browser Automation Micro-service for the Social Media Dashboard.

Runs on port 8040.  Exposes endpoints for:
  - platform login (headful, user-interactive)
  - posting content (single & multi-platform)
  - session management
  - post scheduling (APScheduler)
  - analytics screenshot scraping

Requires: ``playwright install chromium`` to be run once before first use.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from browser_service.platforms import VALID_PLATFORMS, get_platform

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("browser_service")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
SESSION_DIR = Path.home() / ".social-dashboard" / "sessions"
SCHEDULE_FILE = Path.home() / ".social-dashboard" / "scheduled_posts.json"

SESSION_DIR.mkdir(parents=True, exist_ok=True)
SCHEDULE_FILE.parent.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Pydantic request / response models
# ---------------------------------------------------------------------------

class PostRequest(BaseModel):
    content: str
    media_paths: list[str] = Field(default_factory=list)
    preview: bool = True


class MultiPostRequest(BaseModel):
    content: str
    media_paths: list[str] = Field(default_factory=list)
    platforms: list[str]
    preview: bool = True


class ScheduleRequest(BaseModel):
    content: str
    media_paths: list[str] = Field(default_factory=list)
    platforms: list[str]
    scheduled_at: str  # ISO-8601 datetime
    preview: bool = False


class PostResponse(BaseModel):
    success: bool
    message: str
    url: Optional[str] = None


class ScheduledPost(BaseModel):
    id: str
    content: str
    media_paths: list[str]
    platforms: list[str]
    scheduled_at: str
    preview: bool
    created_at: str
    status: str = "pending"


# ---------------------------------------------------------------------------
# Helpers — schedule persistence
# ---------------------------------------------------------------------------

def _load_schedule() -> list[dict]:
    if SCHEDULE_FILE.exists():
        try:
            return json.loads(SCHEDULE_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            logger.warning("Corrupt schedule file — resetting")
    return []


def _save_schedule(posts: list[dict]) -> None:
    SCHEDULE_FILE.write_text(
        json.dumps(posts, indent=2, default=str), encoding="utf-8"
    )


# ---------------------------------------------------------------------------
# Helpers — Playwright lifecycle
# ---------------------------------------------------------------------------

async def _get_playwright():
    """Lazy-import and start Playwright."""
    from playwright.async_api import async_playwright

    pw = await async_playwright().start()
    return pw


def _session_path(platform: str) -> Path:
    return SESSION_DIR / f"{platform}.json"


async def _launch_browser(pw, *, headless: bool = True, platform_obj=None):
    """Launch Chromium and return (browser, context)."""
    browser = await pw.chromium.launch(headless=headless)

    ctx_kwargs: dict = {}
    if platform_obj and platform_obj.VIEWPORT:
        ctx_kwargs["viewport"] = platform_obj.VIEWPORT
        ctx_kwargs["is_mobile"] = True
        ctx_kwargs["user_agent"] = (
            "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) "
            "AppleWebKit/605.1.15 (KHTML, like Gecko) "
            "Version/16.0 Mobile/15E148 Safari/604.1"
        )

    sess = _session_path(platform_obj.PLATFORM_NAME) if platform_obj else None
    if sess and sess.exists():
        ctx_kwargs["storage_state"] = str(sess)

    context = await browser.new_context(**ctx_kwargs)
    return browser, context


# ---------------------------------------------------------------------------
# Scheduler — fires pending posts
# ---------------------------------------------------------------------------

_scheduler_lock = asyncio.Lock()


async def _check_scheduled_posts() -> None:
    """Called every 60 s by APScheduler.  Fires any overdue posts."""
    async with _scheduler_lock:
        posts = _load_schedule()
        now = datetime.now(timezone.utc)
        changed = False

        for post in posts:
            if post.get("status") != "pending":
                continue
            try:
                scheduled = datetime.fromisoformat(post["scheduled_at"])
                if scheduled.tzinfo is None:
                    scheduled = scheduled.replace(tzinfo=timezone.utc)
            except (ValueError, KeyError):
                continue

            if scheduled > now:
                continue

            logger.info("Firing scheduled post %s to %s", post["id"], post["platforms"])
            post["status"] = "processing"
            changed = True
            _save_schedule(posts)

            results: list[dict] = []
            for plat in post.get("platforms", []):
                try:
                    result = await _do_post(
                        plat, post["content"], post.get("media_paths", []), preview=post.get("preview", False)
                    )
                    results.append(result)
                except Exception as exc:
                    results.append({"success": False, "message": str(exc)})

            all_ok = all(r.get("success") for r in results)
            post["status"] = "completed" if all_ok else "partial_failure"
            post["results"] = results
            changed = True

        if changed:
            _save_schedule(posts)


def _start_scheduler():
    """Start APScheduler with an async interval job."""
    from apscheduler.schedulers.asyncio import AsyncIOScheduler

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        _check_scheduled_posts,
        "interval",
        seconds=60,
        id="check_scheduled",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("APScheduler started — checking scheduled posts every 60 s")
    return scheduler


# ---------------------------------------------------------------------------
# Core posting logic (reused by direct + scheduled flows)
# ---------------------------------------------------------------------------

async def _do_post(
    platform: str,
    content: str,
    media_paths: list[str],
    *,
    preview: bool = True,
) -> dict:
    """Execute a single-platform post and return the result dict."""
    platform_obj = get_platform(platform)
    pw = await _get_playwright()
    try:
        headless = not preview
        browser, context = await _launch_browser(pw, headless=headless, platform_obj=platform_obj)
        try:
            # Verify session validity
            logged_in = await platform_obj.check_logged_in(context)
            if not logged_in:
                return {"success": False, "message": f"Session expired for {platform} — please re-login"}

            if preview:
                # Headful — fill content, then wait for user to manually post or close
                result = await platform_obj.post_content(context, content, media_paths or [])
                # In preview mode the post_content already ran headfully; the user
                # saw the browser and either confirmed or closed it.
                return result
            else:
                result = await platform_obj.post_content(context, content, media_paths or [])
                return result
        finally:
            await context.close()
            await browser.close()
    finally:
        await pw.stop()


# ---------------------------------------------------------------------------
# Lifespan (startup / shutdown)
# ---------------------------------------------------------------------------

_scheduler_ref = None  # keep alive


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scheduler_ref
    _scheduler_ref = _start_scheduler()
    logger.info("Browser automation service starting on port 8040")
    yield
    if _scheduler_ref:
        _scheduler_ref.shutdown(wait=False)
    logger.info("Browser automation service stopped")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Social Media Dashboard — Browser Automation Service",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Health ---------------------------------------------------------------

@app.get("/api/browser/health")
async def health():
    saved = [
        p.stem
        for p in SESSION_DIR.glob("*.json")
        if p.stem in VALID_PLATFORMS
    ]
    return {
        "status": "ok",
        "service": "browser-automation",
        "platforms_with_sessions": saved,
        "valid_platforms": VALID_PLATFORMS,
    }


# ---- Sessions -------------------------------------------------------------

@app.get("/api/browser/sessions")
async def list_sessions():
    sessions: list[dict] = []
    for plat in VALID_PLATFORMS:
        sp = _session_path(plat)
        if sp.exists():
            stat = sp.stat()
            age_seconds = (datetime.now().timestamp() - stat.st_mtime)
            sessions.append({
                "platform": plat,
                "exists": True,
                "age_seconds": round(age_seconds),
                "age_human": _human_age(age_seconds),
                "path": str(sp),
            })
        else:
            sessions.append({"platform": plat, "exists": False})
    return {"sessions": sessions}


def _human_age(seconds: float) -> str:
    if seconds < 60:
        return f"{int(seconds)}s"
    if seconds < 3600:
        return f"{int(seconds // 60)}m"
    if seconds < 86400:
        return f"{int(seconds // 3600)}h"
    return f"{int(seconds // 86400)}d"


@app.delete("/api/browser/session/{platform}")
async def delete_session(platform: str):
    if platform not in VALID_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")
    sp = _session_path(platform)
    if sp.exists():
        sp.unlink()
        return {"success": True, "message": f"Session for {platform} deleted"}
    return {"success": False, "message": f"No session found for {platform}"}


# ---- Login ----------------------------------------------------------------

@app.post("/api/browser/login/{platform}")
async def login(platform: str):
    if platform not in VALID_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")

    platform_obj = get_platform(platform)
    pw = await _get_playwright()
    try:
        browser = await pw.chromium.launch(headless=False)
        ctx_kwargs: dict = {}
        if platform_obj.VIEWPORT:
            ctx_kwargs["viewport"] = platform_obj.VIEWPORT
            ctx_kwargs["is_mobile"] = True
            ctx_kwargs["user_agent"] = (
                "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) "
                "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                "Version/16.0 Mobile/15E148 Safari/604.1"
            )
        context = await browser.new_context(**ctx_kwargs)
        page = await context.new_page()

        try:
            await page.goto(platform_obj.LOGIN_URL, wait_until="domcontentloaded", timeout=30_000)
            logger.info(
                "Login browser opened for %s — waiting for user to complete login...",
                platform,
            )

            # Wait until the user navigates away from the login page.
            # We poll the URL; once it no longer contains the login path
            # fragment we assume login succeeded.  Timeout: 5 minutes.
            login_fragments = ["login", "signin", "accounts/login", "flow/login"]
            for _ in range(300):  # 300 × 1 s = 5 min
                await page.wait_for_timeout(1000)
                current = page.url.lower()
                if not any(frag in current for frag in login_fragments):
                    break
            else:
                await context.close()
                await browser.close()
                return {"success": False, "message": "Login timed out (5 min)"}

            # Extra wait for cookies to settle
            await page.wait_for_timeout(3000)

            # Save session
            sp = _session_path(platform)
            await context.storage_state(path=str(sp))
            logger.info("Session saved for %s → %s", platform, sp)

            return {"success": True, "message": f"Logged in to {platform} — session saved"}
        finally:
            await context.close()
            await browser.close()
    finally:
        await pw.stop()


# ---- Post (single platform) -----------------------------------------------

@app.post("/api/browser/post/{platform}", response_model=PostResponse)
async def post_single(platform: str, body: PostRequest):
    if platform not in VALID_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")

    sp = _session_path(platform)
    if not sp.exists():
        raise HTTPException(
            status_code=400,
            detail=f"No saved session for {platform} — please login first",
        )

    result = await _do_post(
        platform,
        body.content,
        body.media_paths,
        preview=body.preview,
    )
    return PostResponse(**result)


# ---- Post (multi platform) ------------------------------------------------

@app.post("/api/browser/post/multi")
async def post_multi(body: MultiPostRequest):
    for plat in body.platforms:
        if plat not in VALID_PLATFORMS:
            raise HTTPException(status_code=400, detail=f"Unknown platform: {plat}")

    results: dict[str, dict] = {}
    for plat in body.platforms:
        sp = _session_path(plat)
        if not sp.exists():
            results[plat] = {
                "success": False,
                "message": f"No saved session for {plat} — please login first",
            }
            continue
        result = await _do_post(plat, body.content, body.media_paths, preview=body.preview)
        results[plat] = result

    return {"results": results}


# ---- Schedule --------------------------------------------------------------

@app.post("/api/browser/schedule")
async def create_scheduled_post(body: ScheduleRequest):
    for plat in body.platforms:
        if plat not in VALID_PLATFORMS:
            raise HTTPException(status_code=400, detail=f"Unknown platform: {plat}")

    # Validate ISO datetime
    try:
        datetime.fromisoformat(body.scheduled_at)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ISO datetime for scheduled_at")

    post = ScheduledPost(
        id=uuid.uuid4().hex[:12],
        content=body.content,
        media_paths=body.media_paths,
        platforms=body.platforms,
        scheduled_at=body.scheduled_at,
        preview=body.preview,
        created_at=datetime.now(timezone.utc).isoformat(),
    )

    posts = _load_schedule()
    posts.append(post.model_dump())
    _save_schedule(posts)
    logger.info("Scheduled post %s for %s", post.id, post.scheduled_at)

    return post.model_dump()


@app.get("/api/browser/schedule")
async def list_scheduled():
    return {"scheduled_posts": _load_schedule()}


@app.delete("/api/browser/schedule/{post_id}")
async def delete_scheduled(post_id: str):
    posts = _load_schedule()
    original_len = len(posts)
    posts = [p for p in posts if p.get("id") != post_id]
    if len(posts) == original_len:
        raise HTTPException(status_code=404, detail=f"Scheduled post {post_id} not found")
    _save_schedule(posts)
    return {"success": True, "message": f"Scheduled post {post_id} removed"}


# ---- Analytics screenshot --------------------------------------------------

@app.post("/api/browser/scrape-analytics/{platform}")
async def scrape_analytics(platform: str):
    if platform not in VALID_PLATFORMS:
        raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")

    sp = _session_path(platform)
    if not sp.exists():
        raise HTTPException(
            status_code=400,
            detail=f"No saved session for {platform} — please login first",
        )

    platform_obj = get_platform(platform)
    analytics_url = await platform_obj.get_analytics_url()

    pw = await _get_playwright()
    try:
        browser, context = await _launch_browser(pw, headless=True, platform_obj=platform_obj)
        try:
            page = await context.new_page()
            await page.goto(analytics_url, wait_until="domcontentloaded", timeout=30_000)
            # Let charts / JS render
            await page.wait_for_timeout(5000)

            screenshot_bytes = await page.screenshot(full_page=True)
            b64 = base64.b64encode(screenshot_bytes).decode("utf-8")

            return {
                "success": True,
                "platform": platform,
                "analytics_url": analytics_url,
                "screenshot_base64": b64,
            }
        finally:
            await context.close()
            await browser.close()
    except Exception as exc:
        logger.exception("Analytics scrape error for %s", platform)
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        await pw.stop()


# ---------------------------------------------------------------------------
# Entry-point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8040,
        reload=True,
        log_level="info",
    )
