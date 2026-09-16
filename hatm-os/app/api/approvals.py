from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.api.deps import current_user
from app.api.schemas import PayloadPatch, RejectIn
from app.core.errors import NotFound
from app.db import get_db
from app.models.approval import Approval
from app.orchestration.approval import ApprovalGate
from app.tasks.attendance import resume_workflow
from app.tasks.followup import send_approved_messages

router = APIRouter(dependencies=[Depends(current_user)])


def _approval(a: Approval, full: bool = True) -> dict:
    preview = a.preview if full else {k: v for k, v in a.preview.items() if k not in ("messages", "rows")}
    return {"id": a.id, "type": a.type, "status": a.status, "preview": preview,
            "payload": a.payload if full else None,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "expires_at": a.expires_at.isoformat(), "decided_by": a.decided_by,
            "decided_at": a.decided_at.isoformat() if a.decided_at else None,
            "reject_reason": a.reject_reason, "workflow_run_id": a.workflow_run_id}


def _continue(a: Approval, approved: bool) -> None:
    """After a decision: resume the owning workflow, or send a standalone batch."""
    stage = a.payload.get("stage", "sheet")
    if a.workflow_run_id:
        extra = {f"{stage}_approved": True, f"{stage}_approval_id": a.id} if approved \
            else {f"{stage}_rejected": True}
        resume_workflow.delay(a.workflow_run_id, extra)
    elif approved and a.type == "send_messages":
        send_approved_messages.delay(a.id)


@router.get("")
def list_approvals(status: str = "pending", db: DBSession = Depends(get_db)):
    rows = db.query(Approval).filter_by(status=status).order_by(Approval.created_at.desc()) \
        .limit(50).all()
    return {"approvals": [_approval(a, full=False) for a in rows]}


@router.get("/{approval_id}")
def get_approval(approval_id: int, db: DBSession = Depends(get_db)):
    a = db.get(Approval, approval_id)
    if not a:
        raise NotFound("الموافقة مش موجودة")
    return _approval(a)


@router.post("/{approval_id}/approve")
def approve(approval_id: int, actor: str = Depends(current_user)):
    a = ApprovalGate().decide(approval_id, True, actor=actor)
    if a.status == "approved" and a.decided_by == actor and not _already_continued(a):
        _continue(a, True)
    return {"id": a.id, "status": a.status}


@router.post("/{approval_id}/reject")
def reject(approval_id: int, body: RejectIn, actor: str = Depends(current_user)):
    a = ApprovalGate().decide(approval_id, False, actor=actor, reason=body.reason)
    if a.status == "rejected" and not _already_continued(a):
        _continue(a, False)
    return {"id": a.id, "status": a.status}


@router.patch("/{approval_id}/payload")
def patch_payload(approval_id: int, body: PayloadPatch, actor: str = Depends(current_user)):
    a = ApprovalGate().patch_payload(approval_id, body.edited_content, actor)
    return _approval(a)


_continued: set[int] = set()


def _already_continued(a: Approval) -> bool:
    """Double-click on approve: decide() is idempotent, and we resume only once per process."""
    if a.id in _continued:
        return True
    _continued.add(a.id)
    return False
