from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery = Celery("hatm", broker=settings.redis_url, backend=settings.redis_url)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone=settings.timezone,
    enable_utc=True,
    task_acks_late=True,              # worker dies → task goes back to the queue
    worker_prefetch_multiplier=1,
    task_track_started=True,
    task_default_queue="default",
    task_always_eager=settings.celery_eager,
    task_eager_propagates=settings.celery_eager,
    broker_connection_retry_on_startup=True,
)

celery.conf.beat_schedule = {
    "check-pending-zoom-reports": {"task": "tasks.check_zoom_reports",
                                   "schedule": crontab(minute="*/15")},
    "feedback-reminders": {"task": "tasks.feedback_reminders", "schedule": crontab(minute=0)},
    "daily-brief": {"task": "tasks.daily_brief", "schedule": crontab(hour=7, minute=0)},
    "end-of-day-summary": {"task": "tasks.end_of_day", "schedule": crontab(hour=21, minute=0)},
    "expire-approvals": {"task": "tasks.expire_approvals", "schedule": crontab(minute=30)},
    "auto-close-sessions": {"task": "tasks.auto_close_sessions",
                            "schedule": crontab(minute="*/30")},
}

import app.tasks.attendance  # noqa: E402,F401 — register tasks
import app.tasks.brief  # noqa: E402,F401
import app.tasks.followup  # noqa: E402,F401
