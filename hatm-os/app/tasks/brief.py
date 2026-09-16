from app.celery_app import celery
from app.core.events import publish
from app.core.logging import record_activity, set_actor
from app.services.dashboard import build_brief


@celery.task(name="tasks.daily_brief")
def daily_brief():
    set_actor("system", "scheduler")
    brief = build_brief("morning")
    record_activity("daily_brief", target_type="brief", after=brief)
    publish("brief", kind_of="morning", brief=brief)
    return brief


@celery.task(name="tasks.end_of_day")
def end_of_day():
    set_actor("system", "scheduler")
    brief = build_brief("evening")
    record_activity("end_of_day_summary", target_type="brief", after=brief)
    publish("brief", kind_of="evening", brief=brief)
    return brief
