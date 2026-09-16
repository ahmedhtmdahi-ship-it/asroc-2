from app.celery_app import celery
from app.core.logging import set_actor
from app.orchestration.followup import create_reminder_approval, sync_replies
from app.orchestration.messaging import execute_send


@celery.task(name="tasks.feedback_reminders")
def feedback_reminders():
    set_actor("system", "scheduler")
    replied = sync_replies()
    created = create_reminder_approval()
    return {"replied": replied, **created}


@celery.task(name="tasks.send_approved_messages", bind=True, max_retries=2)
def send_approved_messages(self, approval_id: int):
    """Standalone approvals (reminders, ad-hoc batches) that aren't part of a workflow run."""
    set_actor("system", "scheduler")
    try:
        return execute_send(approval_id)
    except Exception as e:  # noqa: BLE001
        raise self.retry(exc=e, countdown=120) from e
