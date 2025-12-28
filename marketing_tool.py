#!/usr/bin/env python3
"""A lightweight desktop-style dashboard for B2B customer engagement."""
from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List

from rich import box
from rich.align import Align
from rich.console import Console, Group
from rich.layout import Layout
from rich.panel import Panel
from rich.prompt import Prompt
from rich.table import Table
from rich.text import Text
from rich.theme import Theme

BASE_DIR = Path(__file__).parent
DATA_PATH = BASE_DIR / "data" / "state.json"
DEFAULT_SNAPSHOT_PATH = BASE_DIR / "docs" / "dashboard_snapshot.svg"
COLOR_BG_PRIMARY = "#0b1220"
COLOR_BG_SECONDARY = "#11192d"
COLOR_ACCENT_CYAN = "#38bdf8"
COLOR_ACCENT_PURPLE = "#a78bfa"
COLOR_ACCENT_GREEN = "#22c55e"
COLOR_ACCENT_AMBER = "#f59e0b"
DATETIME_HEADER_FMT = "%b %d, %Y %H:%M"
BACKGROUND_STYLE = f"on {COLOR_BG_PRIMARY}"
DIM_BACKGROUND_STYLE = f"on {COLOR_BG_SECONDARY}"
GLASS_ROW_STYLES = [BACKGROUND_STYLE, DIM_BACKGROUND_STYLE]


DASHBOARD_THEME = Theme(
    {
        "muted": "#cbd5e1",
        "info": "#93c5fd",
        "success": COLOR_ACCENT_GREEN,
        "warning": "#eab308",
        "danger": "#ef4444",
    }
)
STYLE_MUTED = "muted"  # matches the "muted" key defined in DASHBOARD_THEME


def themed_console(*, record: bool = False) -> Console:
    return Console(record=record, theme=DASHBOARD_THEME, style=STYLE_MUTED, color_system="truecolor")


def _today_iso() -> str:
    return datetime.now().date().isoformat()


def sample_state() -> Dict[str, Any]:
    tomorrow = datetime.now().date() + timedelta(days=1)
    return {
        "profile": {"business_name": "Acme Components", "owner": "You"},
        "segments": [
            {
                "name": "New Leads",
                "criteria": ["Created < 30 days", "Matches ICP industries"],
                "size": 34,
                "nurtured": 23,
            },
            {
                "name": "Active Customers",
                "criteria": ["Touched product in last 14 days"],
                "size": 18,
                "nurtured": 15,
            },
            {
                "name": "Dormant Accounts",
                "criteria": ["No activity > 30 days"],
                "size": 12,
                "nurtured": 5,
            },
        ],
        "campaigns": [
            {
                "name": "Onboarding Drip",
                "segment": "New Leads",
                "trigger": "Sign-up form",
                "channel": "Email",
                "template": "Welcome Series",
                "status": "scheduled",
                "next_send": tomorrow.isoformat(),
            },
            {
                "name": "Win-back Sequence",
                "segment": "Dormant Accounts",
                "trigger": "Inactivity 30d",
                "channel": "Email",
                "template": "Re-engagement",
                "status": "ready",
                "next_send": tomorrow.isoformat(),
            },
            {
                "name": "Post-demo Follow-up",
                "segment": "Active Customers",
                "trigger": "Demo completed",
                "channel": "Email + Call task",
                "template": "Demo Recap",
                "status": "running",
                "next_send": _today_iso(),
            },
        ],
        "templates": [
            {
                "name": "Welcome Series",
                "medium": "Email",
                "purpose": "Onboarding",
                "last_updated": _today_iso(),
            },
            {
                "name": "Re-engagement",
                "medium": "Email",
                "purpose": "Win-back",
                "last_updated": _today_iso(),
            },
            {
                "name": "Product Tour Deck",
                "medium": "Presentation",
                "purpose": "Sales enablement",
                "last_updated": _today_iso(),
            },
        ],
        "quick_templates": [
            {"name": "Demo Follow-up", "copy": "Thanks for the demo! Here's what we discussed...", "purpose": "Post-demo nurture"},
            {"name": "Quarterly Business Review", "copy": "Let's review your progress this quarter...", "purpose": "Customer success"},
            {"name": "Feature Announcement", "copy": "We've just launched a new feature...", "purpose": "Product updates"},
            {"name": "Case Study Request", "copy": "Your success story would inspire others...", "purpose": "Social proof"},
            {"name": "Renewal Reminder", "copy": "Your subscription renews soon...", "purpose": "Retention"},
            {"name": "Webinar Invitation", "copy": "Join us for an exclusive webinar...", "purpose": "Education"},
            {"name": "Free Trial Ending", "copy": "Your trial ends in 3 days...", "purpose": "Conversion"},
            {"name": "Welcome to Beta", "copy": "You're in! Here's how to get started...", "purpose": "Beta onboarding"},
            {"name": "Referral Request", "copy": "Know someone who'd benefit?", "purpose": "Growth"},
            {"name": "Survey Request", "copy": "Help us improve with 2 quick questions...", "purpose": "Feedback"},
            {"name": "Holiday Greeting", "copy": "Happy holidays from our team...", "purpose": "Relationship building"},
            {"name": "Product Update Digest", "copy": "Here's what's new this month...", "purpose": "Engagement"},
        ],
        "benchmarks": {
            "open_rate": 0.28,
            "click_rate": 0.15,
            "reply_rate": 0.10,
            "industry": "B2B SaaS"
        },
        "integrations": [
            {"name": "CRM (HubSpot)", "status": "connected", "detail": "API token valid"},
            {"name": "Email (SendGrid)", "status": "connected", "detail": "Sender verified"},
            {"name": "Social (LinkedIn)", "status": "pending", "detail": "OAuth to finish"},
        ],
        "connectors": [
            {
                "name": "HubSpot contacts",
                "status": "connected",
                "last_sync": _today_iso(),
                "detail": "Contacts + deals",
            },
            {
                "name": "LinkedIn Ads",
                "status": "pending",
                "last_sync": "—",
                "detail": "Finish OAuth to pull audiences",
            },
            {
                "name": "SendGrid events",
                "status": "connected",
                "last_sync": _today_iso(),
                "detail": "Bounces + clicks ingested",
            },
        ],
        "backend": [
            {
                "service": "Engagement API",
                "status": "healthy",
                "latency_ms": 180,
                "error_rate": "0.2%",
                "version": "v1.4.2",
            },
            {
                "service": "Automation Worker",
                "status": "degraded",
                "latency_ms": 420,
                "error_rate": "1.1%",
                "version": "v1.3.9",
            },
        ],
        "databases": [
            {
                "name": "Postgres",
                "role": "Primary",
                "status": "healthy",
                "storage_gb": 12.4,
                "connections": 58,
            },
            {
                "name": "Redis",
                "role": "Cache",
                "status": "healthy",
                "storage_gb": 1.1,
                "connections": 14,
            },
        ],
        "analytics": {
            "open_rate": 0.46,
            "click_rate": 0.23,
            "reply_rate": 0.14,
            "conversions": 5,
            "ab_tests": [
                {"name": "CTA copy", "winner": "Book a call", "uplift": 0.12},
                {"name": "Send time", "winner": "09:00", "uplift": 0.08},
            ],
        },
        "feedback": [
            {
                "name": "Post-demo pulse",
                "question": "How clear was the value prop?",
                "last_sent": _today_iso(),
                "responses": 12,
            },
            {
                "name": "Onboarding check-in",
                "question": "Did you activate the core workflow?",
                "last_sent": _today_iso(),
                "responses": 8,
            },
        ],
        "actions": [
            {"title": "A/B test CTA for New Leads", "due": _today_iso(), "owner": "You"},
            {"title": "Send nurture to Dormant Accounts", "due": tomorrow.isoformat(), "owner": "You"},
            {"title": "Sync CRM deal stages", "due": tomorrow.isoformat(), "owner": "You"},
        ],
        "strategies": [
            {
                "name": "ABM",
                "full_name": "Account-Based Marketing",
                "description": "Target high-value accounts with personalized campaigns",
                "steps": ["Identify target accounts", "Personalize content", "Multi-channel outreach", "Measure engagement"],
                "channels": ["Email", "LinkedIn", "Call"],
                "best_for_segments": ["New Leads", "Active Customers"],
            },
            {
                "name": "AIDA",
                "full_name": "Attention-Interest-Desire-Action",
                "description": "Classic content funnel framework",
                "steps": ["Grab attention", "Build interest", "Create desire", "Drive action"],
                "channels": ["Email", "Social", "Ads"],
                "best_for_segments": ["All"],
            },
            {
                "name": "RACE",
                "full_name": "Reach-Act-Convert-Engage",
                "description": "Omnichannel planning framework",
                "steps": ["Reach new audience", "Act/Interact", "Convert to leads", "Engage long-term"],
                "channels": ["Social", "Email", "Website"],
                "best_for_segments": ["New Leads", "Dormant Accounts"],
            },
            {
                "name": "7Ps",
                "full_name": "7Ps Marketing Mix",
                "description": "Holistic B2B planning framework",
                "steps": ["Product", "Price", "Place", "Promotion", "People", "Process", "Physical Evidence"],
                "channels": ["All"],
                "best_for_segments": ["Active Customers"],
            },
        ],
        "videos": [
            {
                "template": "Product Tour Deck",
                "output_path": "data/videos/product_tour.mp4",
                "duration": 45,
                "status": "ready",
                "generated": "2025-12-20",
            },
        ],
        "automation_rules": {
            "SMB_CTO": {"segment": "Tech Leads", "cadence": "0-3-7", "channel": "Email+LinkedIn"},
            "Enterprise": {"segment": "VP Sales", "cadence": "0-5-14-30", "ab_tests": 3},
            "Demo_video": {"variants": 2, "length": 90, "format": "MP4 vertical"},
        },
    }


def load_state() -> Dict[str, Any]:
    if not DATA_PATH.exists():
        return reset_state()
    try:
        with DATA_PATH.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except json.JSONDecodeError:
        return reset_state()


def save_state(state: Dict[str, Any]) -> None:
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DATA_PATH.open("w", encoding="utf-8") as handle:
        json.dump(state, handle, indent=2)


def reset_state() -> Dict[str, Any]:
    state = sample_state()
    save_state(state)
    return state


def _status_color(status: str) -> str:
    mapping = {
        "running": "green",
        "scheduled": "cyan",
        "ready": "yellow",
        "paused": "red",
        "connected": "green",
        "healthy": "green",
        "degraded": "yellow",
        "maintenance": "magenta",
        "pending": "yellow",
        "offline": "red",
        "failed": "red",
    }
    return mapping.get(status.lower(), "white")


def format_pct(value: float) -> str:
    return f"{value * 100:.1f}%"


def build_campaign_table(state: Dict[str, Any]) -> Table:
    table = Table(
        title="Automation",
        box=box.SIMPLE_HEAVY,
        expand=True,
        border_style=COLOR_ACCENT_CYAN,
        style=BACKGROUND_STYLE,
        header_style="bold white",
        title_style=f"bold {COLOR_ACCENT_CYAN}",
        row_styles=GLASS_ROW_STYLES,
    )
    table.add_column("Name")
    table.add_column("Segment")
    table.add_column("Trigger")
    table.add_column("Channel")
    table.add_column("Template")
    table.add_column("Next")
    table.add_column("Status")
    for campaign in state.get("campaigns", []):
        status_value = campaign.get("status", "unknown")
        status = Text(status_value.title(), style=_status_color(status_value))
        table.add_row(
            campaign.get("name", "—"),
            campaign.get("segment", "—"),
            campaign.get("trigger", "—"),
            campaign.get("channel", "—"),
            campaign.get("template", "—"),
            campaign.get("next_send", "—"),
            status,
        )
    return table


def build_segment_table(state: Dict[str, Any]) -> Table:
    table = Table(
        title="Segments",
        box=box.MINIMAL_HEAVY_HEAD,
        expand=True,
        border_style=COLOR_ACCENT_PURPLE,
        style=BACKGROUND_STYLE,
        header_style="bold white",
        title_style=f"bold {COLOR_ACCENT_PURPLE}",
        row_styles=GLASS_ROW_STYLES,
    )
    table.add_column("Name")
    table.add_column("Criteria")
    table.add_column("Size", justify="right")
    table.add_column("Progress", justify="right")
    for segment in state.get("segments", []):
        size = segment.get("size", 0)
        nurtured = segment.get("nurtured", 0)
        if size > 0:
            pct = (nurtured / size) * 100
            progress_text = f"{pct:.0f}% nurtured"
        else:
            progress_text = "—"
        table.add_row(
            segment.get("name", "—"),
            "\n".join(f"• {c}" for c in segment.get("criteria", [])),
            str(size),
            progress_text,
        )
    return table


def build_template_table(state: Dict[str, Any]) -> Table:
    table = Table(
        title="Creation Studio",
        box=box.MINIMAL_DOUBLE_HEAD,
        expand=True,
        border_style=COLOR_ACCENT_GREEN,
        style=BACKGROUND_STYLE,
        header_style="bold white",
        title_style=f"bold {COLOR_ACCENT_GREEN}",
        row_styles=GLASS_ROW_STYLES,
    )
    table.add_column("Template")
    table.add_column("Medium")
    table.add_column("Purpose")
    table.add_column("Updated")
    for template in state.get("templates", []):
        table.add_row(
            template.get("name", "—"),
            template.get("medium", "—"),
            template.get("purpose", "—"),
            template.get("last_updated", "—"),
        )
    return table


def build_strategies_table(state: Dict[str, Any]) -> Table:
    table = Table(
        title="Strategies",
        box=box.MINIMAL_DOUBLE_HEAD,
        expand=True,
        border_style=COLOR_ACCENT_GREEN,
        style=BACKGROUND_STYLE,
        header_style="bold white",
        title_style=f"bold {COLOR_ACCENT_GREEN}",
        row_styles=GLASS_ROW_STYLES,
    )
    table.add_column("Strategy")
    table.add_column("Description")
    table.add_column("Best Segments")
    table.add_column("Status")
    for strategy in state.get("strategies", []):
        # Status is always "available" for strategies
        status = Text("Available", style="green")
        best_segments = ", ".join(strategy.get("best_for_segments", []))
        table.add_row(
            strategy.get("full_name", strategy.get("name", "—")),
            strategy.get("description", "—"),
            best_segments,
            status,
        )
    return table


def build_videos_table(state: Dict[str, Any]) -> Table:
    table = Table(
        title="Videos",
        box=box.MINIMAL_DOUBLE_HEAD,
        expand=True,
        border_style=COLOR_ACCENT_AMBER,
        style=BACKGROUND_STYLE,
        header_style="bold white",
        title_style=f"bold {COLOR_ACCENT_AMBER}",
        row_styles=GLASS_ROW_STYLES,
    )
    table.add_column("Template")
    table.add_column("Duration")
    table.add_column("Status")
    table.add_column("Generated")
    table.add_column("Path")
    for video in state.get("videos", []):
        status_value = video.get("status", "unknown")
        status = Text(status_value.title(), style=_status_color(status_value))
        duration = video.get("duration", "—")
        duration_str = f"{duration}s" if isinstance(duration, int) else str(duration)
        table.add_row(
            video.get("template", "—"),
            duration_str,
            status,
            video.get("generated", "—"),
            video.get("output_path", "—"),
        )
    return table


def build_integration_table(state: Dict[str, Any]) -> Table:
    table = Table(
        title="Connectors",
        box=box.SIMPLE,
        expand=True,
        border_style=COLOR_ACCENT_CYAN,
        style=BACKGROUND_STYLE,
        header_style="bold white",
        title_style=f"bold {COLOR_ACCENT_CYAN}",
        row_styles=GLASS_ROW_STYLES,
    )
    table.add_column("System")
    table.add_column("Status")
    table.add_column("Last Sync")
    table.add_column("Detail")
    connectors = state.get("connectors")
    # Support older saved states that only tracked integrations.
    if connectors is None:
        connectors = state.get("integrations", [])
    for connector in connectors:
        status = connector.get("status", "unknown")
        table.add_row(
            connector.get("name", "—"),
            Text(status.title(), style=_status_color(status)),
            connector.get("last_sync", "—"),
            connector.get("detail", "—"),
        )
    return table


def build_backend_table(state: Dict[str, Any]) -> Table:
    table = Table(
        title="Backend Services",
        box=box.SIMPLE,
        expand=True,
        border_style=COLOR_ACCENT_PURPLE,
        style=BACKGROUND_STYLE,
        header_style="bold white",
        title_style=f"bold {COLOR_ACCENT_PURPLE}",
        row_styles=GLASS_ROW_STYLES,
    )
    table.add_column("Service")
    table.add_column("Status")
    table.add_column("Latency (ms)", justify="right")
    table.add_column("Errors")
    table.add_column("Version")
    for service in state.get("backend", []):
        status = service.get("status", "unknown")
        table.add_row(
            service.get("service", "—"),
            Text(status.title(), style=_status_color(status)),
            str(service.get("latency_ms", "—")),
            str(service.get("error_rate", "—")),
            service.get("version", "—"),
        )
    return table


def build_database_table(state: Dict[str, Any]) -> Table:
    table = Table(
        title="Databases",
        box=box.SIMPLE,
        expand=True,
        border_style=COLOR_ACCENT_GREEN,
        style=BACKGROUND_STYLE,
        header_style="bold white",
        title_style=f"bold {COLOR_ACCENT_GREEN}",
        row_styles=GLASS_ROW_STYLES,
    )
    table.add_column("Name")
    table.add_column("Role")
    table.add_column("Status")
    table.add_column("Storage (GB)", justify="right")
    table.add_column("Connections", justify="right")
    for db in state.get("databases", []):
        status = db.get("status", "unknown")
        table.add_row(
            db.get("name", "—"),
            db.get("role", "—"),
            Text(status.title(), style=_status_color(status)),
            str(db.get("storage_gb", "—")),
            str(db.get("connections", "—")),
        )
    return table


def build_feedback_table(state: Dict[str, Any]) -> Table:
    table = Table(
        title="Feedback & Surveys",
        box=box.SIMPLE,
        expand=True,
        border_style=COLOR_ACCENT_CYAN,
        style=BACKGROUND_STYLE,
        header_style="bold white",
        title_style=f"bold {COLOR_ACCENT_CYAN}",
        row_styles=GLASS_ROW_STYLES,
    )
    table.add_column("Name")
    table.add_column("Question")
    table.add_column("Last Sent")
    table.add_column("Responses", justify="right")
    for form in state.get("feedback", []):
        table.add_row(
            form.get("name", "—"),
            form.get("question", "—"),
            form.get("last_sent", "-"),
            str(form.get("responses", "-")),
        )
    return table


def build_analytics_panel(state: Dict[str, Any]) -> Panel:
    analytics = state.get("analytics", {})
    benchmarks = state.get("benchmarks", {})
    
    lines = []
    
    # Display metrics with benchmark comparisons
    open_rate = analytics.get('open_rate', 0)
    click_rate = analytics.get('click_rate', 0)
    reply_rate = analytics.get('reply_rate', 0)
    
    benchmark_open = benchmarks.get('open_rate', 0)
    benchmark_click = benchmarks.get('click_rate', 0)
    benchmark_reply = benchmarks.get('reply_rate', 0)
    
    if benchmark_open > 0:
        open_diff = ((open_rate - benchmark_open) / benchmark_open) * 100
        open_indicator = f" ({open_diff:+.0f}% vs avg)" if open_diff != 0 else ""
        lines.append(f"Open rate: {format_pct(open_rate)}{open_indicator}")
    else:
        lines.append(f"Open rate: {format_pct(open_rate)}")
    
    if benchmark_click > 0:
        click_diff = ((click_rate - benchmark_click) / benchmark_click) * 100
        click_indicator = f" ({click_diff:+.0f}% vs avg)" if click_diff != 0 else ""
        lines.append(f"Click rate: {format_pct(click_rate)}{click_indicator}")
    else:
        lines.append(f"Click rate: {format_pct(click_rate)}")
    
    if benchmark_reply > 0:
        reply_diff = ((reply_rate - benchmark_reply) / benchmark_reply) * 100
        reply_indicator = f" ({reply_diff:+.0f}% vs avg)" if reply_diff != 0 else ""
        lines.append(f"Reply rate: {format_pct(reply_rate)}{reply_indicator}")
    else:
        lines.append(f"Reply rate: {format_pct(reply_rate)}")
    
    lines.append(f"Conversions this week: {analytics.get('conversions', 0)}")
    
    ab_tests = analytics.get("ab_tests", [])
    if ab_tests:
        lines.append("A/B tests:")
        for test in ab_tests:
            lines.append(
                f" • {test.get('name', '—')} winner: {test.get('winner', '—')} (+{format_pct(test.get('uplift', 0))})"
            )
    body = "\n".join(lines)
    return Panel(
        body,
        title="Analytics & A/B Tests",
        box=box.ROUNDED,
        border_style=COLOR_ACCENT_AMBER,
        style=BACKGROUND_STYLE,
        title_align="left",
        padding=(1, 2),
    )


def build_actions_panel(state: Dict[str, Any]) -> Panel:
    actions = state.get("actions", [])
    if not actions:
        return Panel(
            "You're all set for today.",
            title="Today's Focus",
            box=box.ROUNDED,
            border_style=COLOR_ACCENT_AMBER,
            style=BACKGROUND_STYLE,
            padding=(1, 2),
        )
    
    # Sort actions by due date
    today = datetime.now().date()
    tomorrow = today + timedelta(days=1)
    
    def parse_date(date_str: str) -> datetime.date | None:
        try:
            return datetime.strptime(date_str, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return None
    
    sorted_actions = sorted(actions, key=lambda x: parse_date(x.get('due', '')) or date.max)
    
    lines = []
    for item in sorted_actions:
        title = item.get('title', 'Untitled')
        due_str = item.get('due', '—')
        due_date = parse_date(due_str)
        
        # Color code based on due date
        if due_date == today:
            color = "red"
            priority = "🔴 "
        elif due_date == tomorrow:
            color = "yellow"
            priority = "🟡 "
        else:
            color = "white"
            priority = ""
        
        lines.append(Text(f"{priority}• {title} (due {due_str})", style=color))
    
    # Group is used to display multiple Text objects with different styles in a Panel
    # (string join would lose the color formatting for each line)
    return Panel(
        Group(*lines),
        title="Today's Focus",
        box=box.ROUNDED,
        border_style=COLOR_ACCENT_AMBER,
        style=BACKGROUND_STYLE,
        padding=(1, 2),
    )


def build_quick_actions_menu() -> Text:
    """Build a compact quick actions menu."""
    actions_text = Text()
    actions_text.append("Quick Actions: ", style="bold cyan")
    actions_text.append("[1] New Campaign  ", style="cyan")
    actions_text.append("[2] Export Report  ", style="cyan")
    actions_text.append("[3] Sync All  ", style="cyan")
    actions_text.append("[4] Reset Data  ", style="cyan")
    actions_text.append("[5] View Templates  ", style="cyan")
    actions_text.append("[6] Export Cards", style="cyan")
    return actions_text


def export_status_cards(state: Dict[str, Any], base_path: Path) -> None:
    """Export individual SVG panels for campaigns, analytics, etc."""
    base_path.parent.mkdir(parents=True, exist_ok=True)
    
    profile = state.get("profile", {})
    business_name = profile.get("business_name", "B2B Dashboard")
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # Export Campaigns card
    console_campaigns = themed_console(record=True)
    console_campaigns.print(build_campaign_table(state))
    card_path = base_path.parent / f"card_campaigns_{timestamp}.svg"
    console_campaigns.save_svg(str(card_path), title=f"{business_name} - Campaigns")
    
    # Export Analytics card
    console_analytics = themed_console(record=True)
    console_analytics.print(build_analytics_panel(state))
    card_path = base_path.parent / f"card_analytics_{timestamp}.svg"
    console_analytics.save_svg(str(card_path), title=f"{business_name} - Analytics")
    
    # Export Segments card
    console_segments = themed_console(record=True)
    console_segments.print(build_segment_table(state))
    card_path = base_path.parent / f"card_segments_{timestamp}.svg"
    console_segments.save_svg(str(card_path), title=f"{business_name} - Segments")
    
    # Export Actions card
    console_actions = themed_console(record=True)
    console_actions.print(build_actions_panel(state))
    card_path = base_path.parent / f"card_actions_{timestamp}.svg"
    console_actions.save_svg(str(card_path), title=f"{business_name} - Today's Focus")
    
    status_console = themed_console()
    status_console.print(f"[green]✓[/green] Exported 4 status cards to {base_path.parent}/")


def render_brief_mode(state: Dict[str, Any], console: Console) -> None:
    """Render a compact morning brief with Today's Focus and top 3 metrics."""
    profile = state.get("profile", {})
    business_name = profile.get("business_name", "B2B Dashboard")
    
    # Create a simple layout
    console.print()
    console.print(f"[bold cyan]✦ {business_name} - Morning Brief[/bold cyan]", justify="center")
    console.print(f"[dim]{datetime.now().strftime('%B %d, %Y %H:%M')}[/dim]", justify="center")
    console.print()
    
    # Today's Focus
    actions = state.get("actions", [])
    console.print("[bold yellow]Today's Focus:[/bold yellow]")
    if actions:
        today = datetime.now().date()
        for item in actions[:3]:  # Show top 3
            title = item.get('title', 'Untitled')
            due_str = item.get('due', '—')
            try:
                due_date = datetime.strptime(due_str, "%Y-%m-%d").date()
                if due_date == today:
                    console.print(f"  🔴 {title}")
                else:
                    console.print(f"  • {title}")
            except (ValueError, TypeError):
                console.print(f"  • {title}")
    else:
        console.print("  ✓ You're all set for today!")
    console.print()
    
    # Top 3 Metrics
    analytics = state.get("analytics", {})
    benchmarks = state.get("benchmarks", {})
    console.print("[bold green]Top Metrics:[/bold green]")
    
    open_rate = analytics.get('open_rate', 0)
    benchmark_open = benchmarks.get('open_rate', 0)
    if benchmark_open > 0:
        open_diff = ((open_rate - benchmark_open) / benchmark_open) * 100
        console.print(f"  📧 Open rate: {format_pct(open_rate)} ({open_diff:+.0f}% vs avg)")
    else:
        console.print(f"  📧 Open rate: {format_pct(open_rate)}")
    
    click_rate = analytics.get('click_rate', 0)
    benchmark_click = benchmarks.get('click_rate', 0)
    if benchmark_click > 0:
        click_diff = ((click_rate - benchmark_click) / benchmark_click) * 100
        console.print(f"  👆 Click rate: {format_pct(click_rate)} ({click_diff:+.0f}% vs avg)")
    else:
        console.print(f"  👆 Click rate: {format_pct(click_rate)}")
    
    conversions = analytics.get('conversions', 0)
    console.print(f"  🎯 Conversions this week: {conversions}")
    console.print()


def render_dashboard(state: Dict[str, Any], console: Console, now: datetime | None = None) -> None:
    now = now or datetime.now()
    layout = Layout()
    layout.split_column(
        Layout(name="header", size=3),
        Layout(name="quick_actions", size=1),
        Layout(name="body", ratio=1),
        Layout(name="footer", size=6),
    )
    layout["body"].split_row(Layout(name="left"), Layout(name="right"))
    layout["left"].split_column(Layout(name="campaigns"), Layout(name="segments"))
    layout["right"].split_column(
        Layout(name="templates"),
        Layout(name="videos"),
        Layout(name="strategies_analytics"),
    )

    profile = state.get("profile", {})
    business_name = profile.get("business_name", "B2B Dashboard")
    header_text = Text(
        f"✦ {business_name} • B2B Engagement Command Center",
        style="bold #e2e8f0",
        justify="center",
    )
    subtitle = Text(f"{profile.get('owner', 'Owner')} • Updated {now.strftime(DATETIME_HEADER_FMT)}", style=STYLE_MUTED)
    layout["header"].update(
        Panel(
            Align.center(header_text),
            subtitle_align="right",
            subtitle=subtitle,
            border_style=COLOR_ACCENT_AMBER,
            box=box.ROUNDED,
            style=BACKGROUND_STYLE,
            padding=(0, 2),
        )
    )
    
    # Add quick actions menu
    layout["quick_actions"].update(Align.center(build_quick_actions_menu()))

    layout["campaigns"].update(build_campaign_table(state))
    layout["segments"].update(build_segment_table(state))
    layout["templates"].update(build_template_table(state))
    layout["videos"].update(build_videos_table(state))
    # Split strategies and analytics horizontally
    layout["strategies_analytics"].split_row(
        Layout(name="strategies"),
        Layout(name="analytics"),
    )
    layout["strategies"].update(build_strategies_table(state))
    layout["analytics"].update(build_analytics_panel(state))

    footer_layout = Layout()
    footer_layout.split_column(
        Layout(name="footer_top"),
        Layout(name="footer_bottom"),
    )
    footer_layout["footer_top"].split_row(
        Layout(name="connectors"),
        Layout(name="backend"),
        Layout(name="database"),
    )
    footer_layout["footer_bottom"].split_row(
        Layout(name="feedback"),
        Layout(name="actions"),
    )
    footer_layout["connectors"].update(build_integration_table(state))
    footer_layout["backend"].update(build_backend_table(state))
    footer_layout["database"].update(build_database_table(state))
    footer_layout["feedback"].update(build_feedback_table(state))
    footer_layout["actions"].update(build_actions_panel(state))
    layout["footer"].update(footer_layout)

    console.print(layout)


def apply_strategy_to_segment(args: argparse.Namespace, state: Dict[str, Any]) -> None:
    """Auto-generate campaigns/actions from selected strategy for a segment."""
    strategy_name = args.select_strategy
    segment_name = args.segment
    
    # Find the strategy
    strategies = state.get("strategies", [])
    strategy = None
    for s in strategies:
        if s.get("name") == strategy_name or s.get("full_name") == strategy_name:
            strategy = s
            break
    
    if not strategy:
        raise SystemExit(f"Strategy '{strategy_name}' not found. Available: {', '.join(s.get('name', '') for s in strategies)}")
    
    # Verify segment exists
    segments = state.get("segments", [])
    segment_exists = any(seg.get("name") == segment_name for seg in segments)
    if not segment_exists:
        raise SystemExit(f"Segment '{segment_name}' not found. Available: {', '.join(seg.get('name', '') for seg in segments)}")
    
    # Generate campaigns based on strategy steps
    campaigns: List[Dict[str, Any]] = state.setdefault("campaigns", [])
    channels = strategy.get("channels", ["Email"])
    steps = strategy.get("steps", [])
    
    tomorrow = (datetime.now().date() + timedelta(days=1)).isoformat()
    
    # Create a campaign for the first step of the strategy
    if steps and channels:
        campaign_name = f"{strategy.get('name', 'Strategy')}: {steps[0]}"
        # Select a concrete channel from the strategy context:
        # - Prefer the first channel that is not the special "All" marker.
        # - If all channels are "All" (e.g., ["All"]), keep "All" to indicate omnichannel.
        # - If channels is unexpectedly empty, fall back to "Email".
        non_all_channels = [ch for ch in channels if ch != "All"]
        if non_all_channels:
            channel = non_all_channels[0]
        else:
            channel = channels[0] if channels else "Email"
        
        campaigns.append({
            "name": campaign_name,
            "segment": segment_name,
            "trigger": f"Strategy: {strategy.get('name', '')}",
            "channel": channel,
            "template": f"{strategy.get('name', '')} Template",
            "status": "ready",
            "next_send": tomorrow,
        })
    
    save_state(state)
    console = themed_console()
    console.print(f"[green]✓[/green] Applied strategy '{strategy.get('full_name', strategy_name)}' to segment '{segment_name}'")
    console.print(f"  Generated {1} campaign(s)")


def generate_marketing_video(args: argparse.Namespace, state: Dict[str, Any]) -> None:
    """Generate video from template using MoviePy."""
    template_name = args.template
    output_path = args.output
    
    # Verify template exists
    templates = state.get("templates", [])
    template = None
    for t in templates:
        if t.get("name") == template_name:
            template = t
            break
    
    if not template:
        raise SystemExit(f"Template '{template_name}' not found. Available: {', '.join(t.get('name', '') for t in templates)}")
    
    # Create output directory
    output_file = Path(output_path)
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    # Simple video generation using MoviePy
    try:
        from moviepy.editor import TextClip, CompositeVideoClip
        
        # Create a simple text-based video
        duration = 10  # 10 seconds default
        txt_clip = None
        video = None
        try:
            txt_clip = TextClip(
                f"{template_name}\n\nGenerated by Marketing Tool",
                fontsize=50,
                color='white',
                bg_color='black',
                size=(1280, 720),
                method='caption',
            )
            txt_clip = txt_clip.set_duration(duration)
            
            video = CompositeVideoClip([txt_clip])
            video.write_videofile(str(output_file), fps=24, codec='libx264', audio=False, logger=None)
        finally:
            if video is not None:
                video.close()
            if txt_clip is not None:
                txt_clip.close()
        
        # Add to state (update existing entry for the same output_path instead of duplicating)
        videos: List[Dict[str, Any]] = state.setdefault("videos", [])
        output_path_str = str(output_path)

        # Check for existing video with the same output_path
        existing_video = None
        for video_entry in videos:
            if video_entry.get("output_path") == output_path_str:
                existing_video = video_entry
                break

        video_data = {
            "template": template_name,
            "output_path": output_path_str,
            "duration": duration,
            "status": "ready",
            "generated": _today_iso(),
        }

        if existing_video is not None:
            existing_video.update(video_data)
        else:
            videos.append(video_data)
        
        save_state(state)
        console = themed_console()
        console.print(f"[green]✓[/green] Generated video from template '{template_name}' to '{output_path}'")
        
    except ImportError:
        raise SystemExit("MoviePy not installed. Install with: pip install moviepy")
    except Exception as e:
        raise SystemExit(f"Failed to generate video: {e}")


def generate_auto_plan(creative_idea: str, automation_rules: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """
    Match user's creative idea to automation rules and generate a plan.
    Uses keyword matching with scoring to determine which rule best applies.
    The rule with the most keyword matches wins.
    
    Args:
        creative_idea: The user's creative campaign idea
        automation_rules: Optional dict of automation rules. If not provided, loads from sample_state()
    
    Returns:
        Dict containing the matched rule and auto-configured plan
    """
    if not creative_idea or not creative_idea.strip():
        # Handle empty input gracefully
        creative_idea = "General campaign"
    
    idea_lower = creative_idea.lower()
    
    # Define keyword patterns for each rule
    # NOTE: These patterns are hardcoded and must be kept in sync with automation_rules
    # in sample_state(). If you add/modify rules, update both locations.
    rule_patterns = {
        "SMB_CTO": ["smb", "cto", "tech lead", "technical", "small business", "medium business"],
        "Enterprise": ["enterprise", "vp", "sales", "large", "corporation"],
        "Demo_video": ["demo", "video", "presentation", "recording", "mp4"],
    }
    
    # Score each rule based on keyword matches
    scores = {}
    for rule_name, keywords in rule_patterns.items():
        score = sum(1 for keyword in keywords if keyword in idea_lower)
        if score > 0:
            scores[rule_name] = score
    
    # Find the best matching rule (highest score wins, first alphabetically if tied)
    matched_rule = None
    if scores:
        max_score = max(scores.values())
        # Get all rules with max score and pick first alphabetically for determinism
        best_rules = sorted([name for name, score in scores.items() if score == max_score])
        matched_rule = best_rules[0]
    
    # Default plan if no match found
    default_plan = {
        "rule_matched": "Default",
        "segment": "General Audience",
        "cadence": "0-7",
        "channel": "Email",
        "variants": 1,
        "auto_handled": ["Segment selection", "Basic scheduling"],
    }
    
    if not matched_rule:
        return default_plan
    
    # Load the actual rules - use provided rules or load from sample state
    if automation_rules is None:
        state = sample_state()
        automation_rules = state.get("automation_rules", {})
    
    rule_config = automation_rules.get(matched_rule, {})
    
    # Build the auto plan
    auto_plan = {
        "rule_matched": matched_rule,
        "segment": rule_config.get("segment", "General Audience"),
        "cadence": rule_config.get("cadence", "0-7"),
        "channel": rule_config.get("channel", "Email"),
        "variants": rule_config.get("variants", 1),
        "ab_tests": rule_config.get("ab_tests"),
        "length": rule_config.get("length"),
        "format": rule_config.get("format"),
        "auto_handled": [],
    }
    
    # Track what was auto-handled - using a more maintainable approach
    handlers = [
        ("segment", "Segment", None),
        ("cadence", "Cadence", None),  # Cadence values are already formatted strings like "0-3-7"
        ("channel", "Channel", None),
        ("ab_tests", "A/B tests", " variants"),
        ("variants", "Creative variants", None),
        ("length", "Video length", "s"),
        ("format", "Format", None),
    ]
    
    for key, label, suffix in handlers:
        value = auto_plan.get(key)
        if value:
            suffix_str = suffix if suffix else ""
            auto_plan["auto_handled"].append(f"{label}: {value}{suffix_str}")
    
    return auto_plan


def render_creative_studio(creative_idea: str, auto_plan: Dict[str, Any], console: Console) -> None:
    """
    Render the Creative Studio UI with a 70/30 split layout.
    Left (70%): Creation Studio for editing content
    Right (30%): Auto-magic status showing what was handled automatically
    """
    layout = Layout()
    layout.split_row(
        Layout(name="studio", ratio=70),
        Layout(name="automagic", ratio=30),
    )
    
    # Build the Creation Studio panel (left side - 70%)
    studio_content = []
    studio_content.append(f"[bold {COLOR_ACCENT_CYAN}]Your Creative Idea:[/bold {COLOR_ACCENT_CYAN}]")
    studio_content.append(f"  {creative_idea}")
    studio_content.append("")
    studio_content.append(f"[bold {COLOR_ACCENT_GREEN}]Script (editable):[/bold {COLOR_ACCENT_GREEN}]")
    studio_content.append("  → Opening hook: Grab attention in first 3 seconds")
    studio_content.append("  → Problem statement: What pain point are we solving?")
    studio_content.append("  → Solution demo: Show the product in action")
    studio_content.append("  → Call to action: Book a demo / Start trial")
    studio_content.append("")
    studio_content.append(f"[bold {COLOR_ACCENT_PURPLE}]Thumbnails:[/bold {COLOR_ACCENT_PURPLE}]")
    studio_content.append("  [Thumbnail A] Bold text with product screenshot")
    studio_content.append("  [Thumbnail B] Face + emotion-driven design")
    studio_content.append("")
    studio_content.append(f"[bold {COLOR_ACCENT_AMBER}]Voiceover:[/bold {COLOR_ACCENT_AMBER}]")
    studio_content.append("  Professional voice (auto-generated available)")
    studio_content.append("")
    studio_content.append(f"[bold {COLOR_ACCENT_GREEN}]Actions:[/bold {COLOR_ACCENT_GREEN}]")
    studio_content.append("  [Launch] Deploy campaign (segments, timing, syncs handled)")
    studio_content.append("  [Preview] See how it looks across channels")
    studio_content.append("  [Edit] Modify script, thumbnails, or voiceover")
    
    studio_panel = Panel(
        "\n".join(studio_content),
        title="Creation Studio",
        box=box.ROUNDED,
        border_style=COLOR_ACCENT_CYAN,
        style=BACKGROUND_STYLE,
        padding=(1, 2),
    )
    
    # Build the Auto-magic Status panel (right side - 30%)
    auto_content = []
    auto_content.append(f"[bold {COLOR_ACCENT_PURPLE}]Rule Matched:[/bold {COLOR_ACCENT_PURPLE}]")
    auto_content.append(f"  {auto_plan.get('rule_matched', 'None')}")
    auto_content.append("")
    auto_content.append(f"[bold {COLOR_ACCENT_GREEN}]Auto-handled:[/bold {COLOR_ACCENT_GREEN}]")
    
    auto_handled = auto_plan.get("auto_handled", [])
    if auto_handled:
        for item in auto_handled:
            auto_content.append(f"  ✓ {item}")
    else:
        auto_content.append("  (none)")
    
    auto_content.append("")
    auto_content.append(f"[bold {COLOR_ACCENT_AMBER}]Status:[/bold {COLOR_ACCENT_AMBER}]")
    auto_content.append("  ✓ Segments configured")
    auto_content.append("  ✓ Scheduling ready")
    auto_content.append("  ✓ Syncs prepared")
    auto_content.append("  → Ready to launch!")
    
    auto_panel = Panel(
        "\n".join(auto_content),
        title="Auto-magic Status",
        box=box.ROUNDED,
        border_style=COLOR_ACCENT_AMBER,
        style=BACKGROUND_STYLE,
        padding=(1, 2),
    )
    
    layout["studio"].update(studio_panel)
    layout["automagic"].update(auto_panel)
    
    # Print header
    header_text = Text(
        "✦ Creative Mode • Easy Campaign Creation",
        style="bold #e2e8f0",
        justify="center",
    )
    header_panel = Panel(
        Align.center(header_text),
        border_style=COLOR_ACCENT_AMBER,
        box=box.ROUNDED,
        style=BACKGROUND_STYLE,
        padding=(0, 2),
    )
    console.print(header_panel)
    console.print()
    console.print(layout)
    console.print()
    console.print(f"[dim]The system has handled the dirty work (segments, scheduling, syncs) automatically.[/dim]")
    console.print(f"[{COLOR_ACCENT_GREEN}]Press Launch when ready to deploy your campaign![/{COLOR_ACCENT_GREEN}]")


def creative_mode(console: Console) -> None:
    """
    Handle the creative mode workflow.
    Prompts user for a creative idea, generates an auto plan, and renders the studio.
    """
    creative_idea = Prompt.ask(
        "What's your creative idea?",
        default="Demo campaign"
    )
    
    # generate_auto_plan already handles empty/whitespace input, no need for duplicate validation
    auto_plan = generate_auto_plan(creative_idea)
    render_creative_studio(creative_idea, auto_plan, console)


def add_campaign(args: argparse.Namespace, state: Dict[str, Any]) -> None:
    campaigns: List[Dict[str, Any]] = state.setdefault("campaigns", [])
    campaigns.append(
        {
            "name": args.name,
            "segment": args.segment,
            "trigger": args.trigger,
            "channel": args.channel,
            "template": args.template,
            "status": args.status,
            "next_send": args.next_send or _today_iso(),
        }
    )
    save_state(state)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Desktop-style dashboard for B2B customer engagement."
    )
    parser.add_argument("--summary", action="store_true", help="Show dashboard summary.")
    parser.add_argument("--snapshot", action="store_true", help="Export dashboard SVG.")
    parser.add_argument(
        "--snapshot-path",
        type=Path,
        default=DEFAULT_SNAPSHOT_PATH,
        help="Where to save the SVG snapshot.",
    )
    parser.add_argument("--reset-sample", action="store_true", help="Restore sample data.")
    parser.add_argument("--creative-mode", action="store_true", help="Launch Creative Mode for easy campaign creation.")
    parser.add_argument("--add-campaign", action="store_true", help="Add a new automation.")
    parser.add_argument("--name", help="Campaign name when adding automation.")
    parser.add_argument("--segment", help="Target segment for automation.")
    parser.add_argument("--trigger", help="Trigger condition.")
    parser.add_argument("--channel", help="Primary channel.")
    parser.add_argument("--template", help="Template name to use.")
    parser.add_argument(
        "--status",
        choices=["scheduled", "ready", "running", "paused"],
        default="scheduled",
        help="Initial campaign status (default: scheduled).",
    )
    parser.add_argument(
        "--next-send",
        dest="next_send",
        help="Next send date (YYYY-MM-DD). Defaults to today.",
    )
    parser.add_argument("--brief", action="store_true", help="Morning brief view - Today's Focus + top 3 metrics.")
    parser.add_argument("--export-cards", action="store_true", help="Export individual SVG panels for Slack/Teams.")
    parser.add_argument(
        "--select-strategy",
        help="Apply marketing strategy to segment (requires --segment).",
    )
    parser.add_argument(
        "--generate-video",
        action="store_true",
        help="Generate video from template (requires --template and --output).",
    )
    parser.add_argument(
        "--output",
        help="Output path for generated video.",
    )
    return parser.parse_args()


def ensure_valid_campaign_args(args: argparse.Namespace) -> None:
    required = {
        "name": args.name,
        "segment": args.segment,
        "trigger": args.trigger,
        "channel": args.channel,
        "template": args.template,
    }
    missing = [key for key, value in required.items() if not value]
    if missing:
        raise SystemExit(f"Missing required fields for campaign: {', '.join(missing)}")


def validate_next_send(next_send: str | None) -> str | None:
    if not next_send:
        return None
    try:
        datetime.strptime(next_send, "%Y-%m-%d")
        return next_send
    except ValueError:
        raise SystemExit("Invalid --next-send date. Use YYYY-MM-DD.")


def should_render_dashboard(args: argparse.Namespace) -> bool:
    if args.summary or args.snapshot:
        return True
    # Don't render full dashboard for brief mode or export-cards
    if args.brief or args.export_cards:
        return False
    # Default to rendering the dashboard when no mutating actions are requested.
    return not any([args.add_campaign, args.reset_sample, args.select_strategy, args.generate_video])


def main() -> None:
    args = parse_args()
    state = load_state()

    args.next_send = validate_next_send(args.next_send)

    if args.reset_sample:
        state = reset_state()

    if args.add_campaign:
        ensure_valid_campaign_args(args)
        add_campaign(args, state)
    
    if args.select_strategy:
        if not args.segment:
            raise SystemExit("--select-strategy requires --segment to be specified")
        apply_strategy_to_segment(args, state)
    
    if args.generate_video:
        if not args.template or not args.output:
            raise SystemExit("--generate-video requires both --template and --output to be specified")
        generate_marketing_video(args, state)

    # Handle brief mode
    if args.brief:
        console = themed_console()
        render_brief_mode(state, console)
        return

    # Handle export-cards mode
    if args.export_cards:
        export_status_cards(state, args.snapshot_path)
        return

    console = themed_console(record=args.snapshot)

    if args.creative_mode:
        creative_mode(console)
        return

    render_time = datetime.now()

    if should_render_dashboard(args):
        render_dashboard(state, console, now=render_time)

    if args.snapshot:
        args.snapshot_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Add branded watermark
        profile = state.get("profile", {})
        business_name = profile.get("business_name", "B2B Dashboard")
        watermark = f"Generated by {business_name} Marketing Tool • {datetime.now().strftime('%Y-%m-%d')}"
        
        console.save_svg(str(args.snapshot_path), title=watermark)
        status_console = themed_console()
        status_console.print(f"Saved snapshot to {args.snapshot_path}")


if __name__ == "__main__":
    main()
