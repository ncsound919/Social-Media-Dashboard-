"""
Celery configuration for the Social Media Dashboard.
Beat schedule for recurring tasks.
"""
import os
from datetime import timedelta

broker_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
result_backend = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

timezone = "America/New_York"
enable_utc = True

task_serializer = "json"
result_serializer = "json"
accept_content = ["json"]

beat_schedule = {
    "check-scheduled-campaigns": {
        "task": "celery_worker.check_scheduled_campaigns",
        "schedule": timedelta(minutes=5),
    },
    "sync-analytics": {
        "task": "celery_worker.sync_analytics",
        "schedule": timedelta(minutes=60),
    },
}
