"""Every side effect on the outside world passes through here."""
from datetime import timedelta

from app.config import settings
from app.core.errors import AppError, ApprovalExpired, ApprovalRequired, NotFound
from app.core.events import publish
from app.core.idempotency import approval_key
from app.core.logging import get_actor, record_activity
from app.core.timeutil import utcnow
from app.db import SessionLocal
from app.models.approval import Approval


class ApprovalGate:
    def create(self, type: str, payload: dict, preview: dict,
               workflow_run_id: str | None = None) -> Approval:
        key = approval_key(type, payload)
        db = SessionLocal()
        try:
            existing = db.query(Approval).filter_by(idempotency_key=key).first()
            if existing:
                return existing          # same request → same approval, never two
            a = Approval(
                type=type, payload=payload, preview=preview, idempotency_key=key,
                workflow_run_id=workflow_run_id,
                expires_at=utcnow() + timedelta(hours=settings.approval_expiry_hours),
            )
            db.add(a)
            db.commit()
            db.refresh(a)
            record_activity("approval_created", target_type="approval", target_id=a.id,
                            after={"type": type, "summary": preview.get("summary")})
            publish("approval", approval_id=a.id, status="pending", type=type)
            return a
        finally:
            db.close()

    def decide(self, approval_id: int, approved: bool, actor: str,
               reason: str | None = None) -> Approval:
        db = SessionLocal()
        try:
            a = db.get(Approval, approval_id)
            if not a:
                raise NotFound("الموافقة مش موجودة")
            if a.status != "pending":
                return a                 # double-click protection: already decided
            now = utcnow()
            if a.expires_at <= now:
                a.status = "expired"
                db.commit()
                raise ApprovalExpired("الموافقة انتهت صلاحيتها")
            before = {"status": "pending"}
            a.status = "approved" if approved else "rejected"
            a.decided_by = actor
            a.decided_at = now
            a.reject_reason = reason
            db.commit()
            db.refresh(a)
            record_activity("approval_approved" if approved else "approval_rejected",
                            target_type="approval", target_id=a.id, before=before,
                            after={"status": a.status, "by": actor, "reason": reason,
                                   "type": a.type, "summary": a.preview.get("summary")})
            publish("approval", approval_id=a.id, status=a.status, type=a.type)
            return a
        finally:
            db.close()

    def patch_payload(self, approval_id: int, patch: dict, actor: str) -> Approval:
        """Edit before deciding. Stays pending; the key is re-derived from the new payload."""
        db = SessionLocal()
        try:
            a = db.get(Approval, approval_id)
            if not a:
                raise NotFound("الموافقة مش موجودة")
            if a.status != "pending":
                raise AppError("مينفعش تعدّل موافقة اتقررت")
            before = dict(a.payload)
            new_payload = {**a.payload, **patch}
            new_preview = dict(a.preview)
            if "messages" in patch:
                new_preview["messages"] = patch["messages"]
                active = [m for m in patch["messages"] if not m.get("excluded")]
                new_preview["recipient_count"] = len(active)
            a.payload = new_payload
            a.preview = new_preview
            a.idempotency_key = approval_key(a.type, new_payload)
            db.commit()
            db.refresh(a)
            record_activity("approval_edited", target_type="approval", target_id=a.id,
                            before=before, after=new_payload)
            publish("approval", approval_id=a.id, status="pending", type=a.type, edited=True)
            return a
        finally:
            db.close()

    def require_approved(self, approval_id: int) -> Approval:
        """Executing code calls this first. Anything but `approved` is a hard stop."""
        db = SessionLocal()
        try:
            a = db.get(Approval, approval_id)
            if not a:
                raise NotFound("الموافقة مش موجودة")
            if a.status == "executed":
                raise ApprovalRequired("الموافقة دي اتنفذت قبل كده", approval_id=approval_id)
            if a.status != "approved":
                raise ApprovalRequired(f"الإجراء محتاج موافقة (الحالة: {a.status})",
                                       approval_id=approval_id)
            return a
        finally:
            db.close()

    def mark_executed(self, approval_id: int, result: dict | None = None) -> None:
        db = SessionLocal()
        try:
            a = db.get(Approval, approval_id)
            if a and a.status == "approved":
                a.status = "executed"
                a.executed_at = utcnow()
                db.commit()
                actor_type, actor_id = get_actor()
                record_activity("approval_executed", target_type="approval", target_id=a.id,
                                after=result or {})
                publish("approval", approval_id=a.id, status="executed", type=a.type)
        finally:
            db.close()

    def expire_stale(self) -> int:
        db = SessionLocal()
        try:
            n = db.query(Approval).filter(
                Approval.status == "pending", Approval.expires_at <= utcnow(),
            ).update({"status": "expired"}, synchronize_session=False)
            db.commit()
            return n
        finally:
            db.close()
