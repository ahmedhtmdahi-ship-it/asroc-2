"""close_session — the one end-to-end flow of the MVP.

fetch Zoom → durations → match names (AI; ambiguous → Review) → rules →
[APPROVAL] sheet → write → compose emails → [APPROVAL] → send → finalize
"""
from datetime import datetime

from app.adapters import factory
from app.adapters.base import CellUpdate
from app.config import settings
from app.core.errors import ReportNotReady
from app.core.events import publish
from app.core.logging import record_activity
from app.core.timeutil import fmt_date_ar, to_local, utcnow
from app.db import SessionLocal
from app.domain.duration import DurationResult, compute, group_by_identity
from app.domain.rules import evaluate_full
from app.models.attendance import AttendanceRecord
from app.models.message import OutboundMessage
from app.models.session import Session as Sess
from app.models.trainee import Trainee
from app.orchestration.approval import ApprovalGate
from app.orchestration.engine import Definition, PauseSignal, Step, register
from app.orchestration.messaging import compose, execute_send, preview_of

STATUS_AR = {"present": "حاضر", "late": "متأخر", "partial": "جزئي", "absent": "غايب",
             "early_leave": "خرج بدري", "needs_review": "للمراجعة"}


def _iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def _set_status(db, sess: Sess, status: str) -> None:
    if sess.status != status:
        sess.status = status
        db.commit()
        publish("session", session_id=sess.id, status=status)


# ── 1 ────────────────────────────────────────────────────────
def s1_fetch_zoom(ctx: dict) -> dict:
    db = SessionLocal()
    try:
        sess = db.get(Sess, ctx["session_id"])
        _set_status(db, sess, "running")
        zoom = factory.meeting_provider(sess.planned_start)

        uuid = sess.zoom_meeting_uuid
        if not uuid:
            if not sess.zoom_meeting_id:
                raise PauseSignal("zoom_meeting_missing",
                                  message="الجلسة مالهاش Zoom meeting id")
            inst = zoom.find_instance(sess.zoom_meeting_id, sess.planned_start)
            if not inst:
                raise PauseSignal("zoom_instance_not_found",
                                  message="مفيش اجتماع Zoom في التاريخ ده")
            uuid = inst.uuid
            sess.zoom_meeting_uuid = uuid
            db.commit()

        try:
            parts = zoom.fetch_participants(uuid)
        except ReportNotReady as e:
            attempts = int(ctx.get("_report_attempts", 0)) + 1
            if attempts > settings.zoom_report_max_retries:
                raise
            # not a failure — Zoom reports lag 15–30 min. Pause; beat retries.
            raise PauseSignal("zoom_report_not_ready", retry_after=e.retry_after,
                              message="تقرير Zoom لسه مش جاهز — هنحاول تاني",
                              context={"_report_attempts": attempts}) from e

        record_activity("zoom_report_fetched", target_type="session", target_id=sess.id,
                        after={"rows": len(parts), "uuid": uuid})
        return {"participants": [
            {"name": p.name, "email": p.email, "user_id": p.user_id,
             "join": _iso(p.join_time), "leave": _iso(p.leave_time)} for p in parts],
            "_detail": f"{len(parts)} صف"}
    finally:
        db.close()


# ── 2 ────────────────────────────────────────────────────────
class _P:
    def __init__(self, d: dict):
        self.name, self.email, self.user_id = d["name"], d["email"], d["user_id"]
        self.join = datetime.fromisoformat(d["join"])
        self.leave = datetime.fromisoformat(d["leave"])


def s2_compute_durations(ctx: dict) -> dict:
    db = SessionLocal()
    try:
        sess = db.get(Sess, ctx["session_id"])
        ws, we = sess.planned_start, sess.planned_end
        parts = [_P(d) for d in ctx["participants"]]
        computed = []
        for key, rows in group_by_identity(parts).items():
            raw = [(r.join, r.leave) for r in rows]
            res = compute(raw, ws, we)
            computed.append({
                "key": key, "name": rows[0].name, "email": rows[0].email,
                "user_id": rows[0].user_id,
                "raw": [[_iso(a), _iso(b)] for a, b in raw],
                "merged": [[_iso(a), _iso(b)] for a, b in res.merged],
                "total_minutes": res.total_minutes,
                "first_join": _iso(res.first_join), "last_leave": _iso(res.last_leave),
                "disconnects": res.disconnect_count,
            })
        return {"computed": computed,
                "_detail": f"{len(computed)} شخص · دمج {len(parts) - len(computed)} صف"}
    finally:
        db.close()


# ── 3 ────────────────────────────────────────────────────────
def s3_match_names(ctx: dict) -> dict:
    db = SessionLocal()
    try:
        sess = db.get(Sess, ctx["session_id"])

        # resumed after Review: the records already exist for this run — don't re-match
        if ctx.get("_matched_by_run") == ctx.get("_run_id"):
            left = db.query(AttendanceRecord).filter_by(session_id=sess.id, needs_review=True).count()
            if left:
                raise PauseSignal("needs_review", message=f"{left} اسم لسه محتاج مراجعتك")
            return {"matched": True, "_detail": "بعد المراجعة"}

        roster = db.query(Trainee).filter_by(program_id=sess.program_id, status="active").all()

        res = factory.intelligence_provider().match(
            session_id=sess.id,
            candidates=[{"idx": i, "name": c["name"], "email": c["email"],
                         "user_id": c.get("user_id")} for i, c in enumerate(ctx["computed"])],
            roster=[{"trainee_id": t.id, "name_ar": t.name_ar, "name_en": t.name_en,
                     "email": t.email, "phone": t.phone, "aliases": t.zoom_aliases or []}
                    for t in roster],
        )

        # replay-safe: wipe this session's records and rebuild from the same inputs
        db.query(AttendanceRecord).filter_by(session_id=sess.id).delete()
        db.flush()

        # the AI must never pair two Zoom identities with one trainee
        seen: dict[int, int] = {}
        for m in res["matches"]:
            if m.get("trainee_id") is not None and not m.get("needs_review"):
                seen[m["trainee_id"]] = seen.get(m["trainee_id"], 0) + 1
        dupes = {t for t, n in seen.items() if n > 1}

        needs_review = 0
        for m in res["matches"]:
            c = ctx["computed"][m["candidate_idx"]]
            tid = m.get("trainee_id")
            review = bool(m.get("needs_review"))
            if tid in dupes:
                review, tid = True, None
            rec = AttendanceRecord(
                session_id=sess.id, trainee_id=None if review else tid,
                zoom_name=c["name"], zoom_email=c["email"], zoom_user_id=c.get("user_id"),
                raw_intervals=c["raw"], merged_intervals=c["merged"],
                total_minutes=c["total_minutes"],
                first_join=datetime.fromisoformat(c["first_join"]) if c["first_join"] else None,
                last_leave=datetime.fromisoformat(c["last_leave"]) if c["last_leave"] else None,
                disconnect_count=c["disconnects"],
                match_confidence=m.get("confidence", 0), match_method=m.get("method"),
                needs_review=review, suggestions=m.get("suggestions", []),
                status="needs_review",
            )
            db.add(rec)
            needs_review += int(review)
        db.commit()

        stats = res.get("stats", {})
        record_activity("names_matched", target_type="session", target_id=sess.id, after=stats)
        if needs_review:
            _set_status(db, sess, "needs_review")
            raise PauseSignal("needs_review", message=f"{needs_review} اسم محتاج مراجعتك",
                              context={"_matched_by_run": ctx.get("_run_id"), "match_stats": stats})
        return {"matched": True, "match_stats": stats, "_matched_by_run": ctx.get("_run_id"),
                "_detail": f"{stats.get('auto_matched', 0)} تلقائي"}
    finally:
        db.close()


# ── 4 ────────────────────────────────────────────────────────
def s4_evaluate(ctx: dict) -> dict:
    db = SessionLocal()
    try:
        sess = db.get(Sess, ctx["session_id"])
        _set_status(db, sess, "running")
        rules = sess.program.attendance_rules or {}
        if rules.get("basis") == "actual_duration" and sess.actual_start and sess.actual_end:
            basis = (sess.actual_end - sess.actual_start).total_seconds() / 60
        else:
            basis = sess.planned_minutes

        recs = db.query(AttendanceRecord).filter_by(session_id=sess.id).all()
        counts: dict[str, int] = {}
        for r in recs:
            if r.excluded or r.needs_review:
                continue
            merged = [(datetime.fromisoformat(a), datetime.fromisoformat(b))
                      for a, b in r.merged_intervals]
            d = DurationResult(r.total_minutes, merged, r.first_join, r.last_leave,
                               r.disconnect_count)
            ev = evaluate_full(d, basis, sess.planned_start, sess.planned_end, rules)
            r.status, r.percentage, r.flags = ev.status, ev.percentage, ev.flags
            counts[r.status] = counts.get(r.status, 0) + 1

        # in the roster, not in the report → absent
        present_ids = {r.trainee_id for r in recs if r.trainee_id and not r.excluded}
        for t in db.query(Trainee).filter_by(program_id=sess.program_id, status="active").all():
            if t.id not in present_ids:
                db.add(AttendanceRecord(session_id=sess.id, trainee_id=t.id, total_minutes=0,
                                        percentage=0, status="absent", match_method="none",
                                        match_confidence=1.0))
                counts["absent"] = counts.get("absent", 0) + 1
        db.commit()
        record_activity("attendance_evaluated", target_type="session", target_id=sess.id,
                        after={"counts": counts, "basis_minutes": basis})
        return {"counts": counts, "_detail": " · ".join(
            f"{n} {STATUS_AR.get(k, k)}" for k, n in counts.items())}
    finally:
        db.close()


# ── 5 ────────────────────────────────────────────────────────
def s5_approve_sheet(ctx: dict) -> dict:
    if ctx.get("sheet_approved") or ctx.get("sheet_rejected"):
        return {}
    db = SessionLocal()
    try:
        sess = db.get(Sess, ctx["session_id"])
        prog = sess.program
        if not prog.attendance_sheet_id:
            return {"sheet_skipped": True, "_detail": "البرنامج مالوش شيت"}
        recs = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == sess.id,
            AttendanceRecord.trainee_id.isnot(None),
            AttendanceRecord.excluded.is_(False)).all()
        rows = []
        for r in sorted(recs, key=lambda x: x.percentage):
            t = db.get(Trainee, r.trainee_id)
            rows.append({"trainee_id": r.trainee_id, "name": t.name_ar if t else "",
                         "minutes": round(r.total_minutes), "percentage": r.percentage,
                         "status": r.status})
        a = ApprovalGate().create(
            type="update_sheet",
            payload={"session_id": sess.id, "stage": "sheet"},
            preview={"summary": f"تحديث شيت الحضور — {len(rows)} صف · {sess.title} "
                                f"{fmt_date_ar(sess.planned_start)}",
                     "session_id": sess.id, "session_title": sess.title,
                     "sheet_id": prog.attendance_sheet_id,
                     "tab": prog.attendance_sheet_tab or "Attendance",
                     "column": _sheet_column(sess), "counts": ctx.get("counts", {}),
                     "rows": rows},
            workflow_run_id=ctx.get("_run_id"),
        )
        _set_status(db, sess, "awaiting_approval")
        raise PauseSignal("approval", resume_token="sheet", message=f"approval:{a.id}")
    finally:
        db.close()


def _sheet_column(sess: Sess) -> str:
    return f"{sess.title} {to_local(sess.planned_start).strftime('%Y-%m-%d')}"


# ── 6 ────────────────────────────────────────────────────────
def s6_write_sheet(ctx: dict) -> dict:
    if ctx.get("sheet_skipped") or ctx.get("sheet_rejected"):
        return {"_detail": "اتخطى"}
    db = SessionLocal()
    try:
        sess = db.get(Sess, ctx["session_id"])
        _set_status(db, sess, "running")
        prog = sess.program
        gate = ApprovalGate()
        approval = gate.require_approved(int(ctx["sheet_approval_id"]))

        sh = factory.sheet_provider()
        sheet, tab = prog.attendance_sheet_id, prog.attendance_sheet_tab or "Attendance"
        col = _sheet_column(sess)
        sh.ensure_column(sheet, tab, col)

        recs = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == sess.id,
            AttendanceRecord.trainee_id.isnot(None),
            AttendanceRecord.excluded.is_(False)).all()
        updates, missing = [], []
        for r in recs:
            t = db.get(Trainee, r.trainee_id)
            if not t or not t.email:
                missing.append(t.name_ar if t else r.trainee_id)
                continue
            row = sh.find_row_by_key(sheet, tab, "Email", t.email)
            if row:
                updates.append(CellUpdate(row, col, f"{r.status} ({int(round(r.percentage))}%)"))
            else:
                missing.append(t.name_ar)

        before = sh.snapshot(sheet, tab, [u.row for u in updates], [col])   # read → snapshot → write
        n = sh.batch_write(sheet, tab, updates)
        after = {f"{col}!{u.row}": u.value for u in updates}
        record_activity("write_attendance_sheet", target_type="session", target_id=sess.id,
                        before=before, after=after)
        gate.mark_executed(approval.id, {"cells_written": n, "missing": missing})
        return {"cells_written": n, "sheet_missing": missing, "_detail": f"{n} خلية"}
    finally:
        db.close()


# ── 7 ────────────────────────────────────────────────────────
def s7_compose_messages(ctx: dict) -> dict:
    db = SessionLocal()
    try:
        sess = db.get(Sess, ctx["session_id"])
        prog = sess.program
        recs = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == sess.id,
            AttendanceRecord.trainee_id.isnot(None),
            AttendanceRecord.excluded.is_(False),
            AttendanceRecord.status.in_(["absent", "partial"])).all()
        ids = []
        for r in recs:
            t = db.get(Trainee, r.trainee_id)
            if not t or not t.email:
                continue
            msg_type = "absence" if r.status == "absent" else "partial"
            m = compose(db, trainee=t, msg_type=msg_type, session=sess, program=prog, rec=r)
            ids.append(m.id)
        db.commit()
        return {"message_ids": ids, "_detail": f"{len(ids)} رسالة"}
    finally:
        db.close()


# ── 8 ────────────────────────────────────────────────────────
def s8_approve_messages(ctx: dict) -> dict:
    if ctx.get("messages_approved") or ctx.get("messages_rejected"):
        return {}
    if not ctx.get("message_ids"):
        return {"messages_skipped": True, "_detail": "مفيش رسايل"}
    db = SessionLocal()
    try:
        sess = db.get(Sess, ctx["session_id"])
        msgs = db.query(OutboundMessage).filter(
            OutboundMessage.id.in_(ctx["message_ids"])).all()
        preview_msgs = preview_of(db, msgs)
        a = ApprovalGate().create(
            type="send_messages",
            payload={"session_id": sess.id, "stage": "messages",
                     "message_ids": [m.id for m in msgs],
                     "messages": [{"message_id": p["message_id"], "excluded": False}
                                  for p in preview_msgs]},
            preview={"summary": f"{len(msgs)} رسالة متابعة — {sess.title} "
                                f"{fmt_date_ar(sess.planned_start)}",
                     "session_id": sess.id, "recipient_count": len(msgs),
                     "channel": "email", "send_enabled": settings.ff_send_email,
                     "messages": preview_msgs},
            workflow_run_id=ctx.get("_run_id"),
        )
        for m in msgs:
            m.approval_id = a.id
            m.status = "pending_approval"
        db.commit()
        _set_status(db, sess, "awaiting_approval")
        raise PauseSignal("approval", resume_token="messages", message=f"approval:{a.id}")
    finally:
        db.close()


# ── 9 ────────────────────────────────────────────────────────
def s9_send_messages(ctx: dict) -> dict:
    if ctx.get("messages_skipped") or ctx.get("messages_rejected"):
        return {"_detail": "اتخطى"}
    result = execute_send(int(ctx["messages_approval_id"]))
    detail = f"{result['sent']} اتبعتت" if settings.ff_send_email else \
        f"{result['drafted']} draft (الإرسال مقفول)"
    return {"send_result": result, "_detail": detail}


# ── 10 ───────────────────────────────────────────────────────
def s10_finalize(ctx: dict) -> dict:
    db = SessionLocal()
    try:
        sess = db.get(Sess, ctx["session_id"])
        sess.closed_at = utcnow()
        _set_status(db, sess, "closed")
        record_activity("session_closed", target_type="session", target_id=sess.id,
                        after={"counts": ctx.get("counts"), "cells_written": ctx.get("cells_written"),
                               "send_result": ctx.get("send_result")})
        return {"closed": True}
    finally:
        db.close()


register(Definition(
    name="close_session",
    steps=[
        Step("fetch_zoom", s1_fetch_zoom, "تنزيل تقرير Zoom", retryable=True,
             max_retries=settings.zoom_report_max_retries),
        Step("compute_durations", s2_compute_durations, "حساب دقايق الحضور"),
        Step("match_names", s3_match_names, "مطابقة الأسماء مع المتدربين"),
        Step("evaluate", s4_evaluate, "تطبيق قواعد البرنامج"),
        Step("approve_sheet", s5_approve_sheet, "موافقة تحديث الشيت"),
        Step("write_sheet", s6_write_sheet, "تحديث شيت الحضور"),
        Step("compose_messages", s7_compose_messages, "تجهيز رسائل المتابعة"),
        Step("approve_messages", s8_approve_messages, "موافقة الرسائل"),
        Step("send_messages", s9_send_messages, "إرسال الرسائل"),
        Step("finalize", s10_finalize, "إغلاق الجلسة"),
    ],
))
