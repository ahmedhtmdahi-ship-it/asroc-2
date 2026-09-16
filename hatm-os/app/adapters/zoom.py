"""Zoom Server-to-Server OAuth adapter."""
import base64
import logging
import time
import urllib.parse
from datetime import datetime

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.adapters.base import MeetingInstance, MeetingProvider, RawParticipant
from app.config import settings
from app.core.errors import ReportNotReady, ZoomError
from app.core.timeutil import to_utc_naive

BASE = "https://api.zoom.us/v2"
log = logging.getLogger("hatm.zoom")


def _parse_ts(s: str) -> datetime:
    return to_utc_naive(datetime.fromisoformat(s.replace("Z", "+00:00")))


class _Retryable(Exception):
    pass


class ZoomAdapter(MeetingProvider):
    def __init__(self):
        if not (settings.zoom_account_id and settings.zoom_client_id
                and settings.zoom_client_secret):
            raise ZoomError("بيانات Zoom ناقصة في .env (ZOOM_ACCOUNT_ID / CLIENT_ID / CLIENT_SECRET)")
        self._token: str | None = None
        self._exp: float = 0

    # ── auth ────────────────────────────────────────────────
    def _get_token(self) -> str:
        if self._token and time.time() < self._exp - 60:
            return self._token
        creds = base64.b64encode(
            f"{settings.zoom_client_id}:{settings.zoom_client_secret}".encode()).decode()
        r = httpx.post(
            "https://zoom.us/oauth/token",
            params={"grant_type": "account_credentials",
                    "account_id": settings.zoom_account_id},
            headers={"Authorization": f"Basic {creds}"},
            timeout=15,
        )
        if r.status_code != 200:
            raise ZoomError(f"فشل تسجيل الدخول لـ Zoom ({r.status_code})")
        data = r.json()
        self._token = data["access_token"]
        self._exp = time.time() + data.get("expires_in", 3600)
        return self._token

    def _headers(self) -> dict:
        return {"Authorization": f"Bearer {self._get_token()}"}

    # ── UUID encoding ───────────────────────────────────────
    @staticmethod
    def encode_uuid(uuid: str) -> str:
        """UUIDs starting with '/' or containing '//' must be double-encoded or Zoom 404s."""
        if uuid.startswith("/") or "//" in uuid:
            return urllib.parse.quote(urllib.parse.quote(uuid, safe=""), safe="")
        return urllib.parse.quote(uuid, safe="")

    # ── instances (recurring meetings) ─────────────────────
    def list_instances(self, meeting_id: str) -> list[MeetingInstance]:
        r = httpx.get(f"{BASE}/past_meetings/{meeting_id}/instances",
                      headers=self._headers(), timeout=30)
        if r.status_code == 404:
            return []
        if r.status_code >= 400:
            raise ZoomError(f"Zoom instances: {r.status_code} {r.text[:200]}")
        return [MeetingInstance(uuid=m["uuid"], start_time=_parse_ts(m["start_time"]))
                for m in r.json().get("meetings", []) if m.get("start_time")]

    def find_instance(self, meeting_id: str, target_date: datetime) -> MeetingInstance | None:
        """Closest instance to the planned start (within 6 hours)."""
        target = to_utc_naive(target_date)
        best, best_diff = None, None
        for inst in self.list_instances(meeting_id):
            diff = abs((inst.start_time - target).total_seconds())
            if best_diff is None or diff < best_diff:
                best, best_diff = inst, diff
        if best is not None and best_diff is not None and best_diff < 6 * 3600:
            return best
        return None

    # ── participant report (lags 15–30 min) ────────────────
    @retry(stop=stop_after_attempt(3),
           wait=wait_exponential(multiplier=2, min=2, max=20),
           retry=retry_if_exception_type(_Retryable), reraise=True)
    def _page(self, uuid_enc: str, token: str | None) -> dict:
        params: dict = {"page_size": 300}
        if token:
            params["next_page_token"] = token
        r = httpx.get(f"{BASE}/report/meetings/{uuid_enc}/participants",
                      headers=self._headers(), params=params, timeout=45)
        if r.status_code == 404:
            raise ReportNotReady(retry_after=settings.zoom_report_retry_minutes * 60)
        if r.status_code == 429:
            raise _Retryable("rate limited")
        if r.status_code >= 500:
            raise _Retryable(f"zoom {r.status_code}")
        if r.status_code >= 400:
            raise ZoomError(f"Zoom report: {r.status_code} {r.text[:200]}")
        return r.json()

    def fetch_participants(self, meeting_uuid: str) -> list[RawParticipant]:
        enc = self.encode_uuid(meeting_uuid)
        out: list[RawParticipant] = []
        token = None
        while True:
            try:
                data = self._page(enc, token)
            except _Retryable as e:
                raise ZoomError(f"Zoom مش بيرد: {e}") from e
            for p in data.get("participants", []):
                if not p.get("join_time") or not p.get("leave_time"):
                    continue
                out.append(RawParticipant(
                    name=(p.get("name") or "").strip(),
                    email=(p.get("user_email") or "").strip().lower() or None,
                    user_id=p.get("id") or None,
                    join_time=_parse_ts(p["join_time"]),
                    leave_time=_parse_ts(p["leave_time"]),
                ))
            token = data.get("next_page_token")
            if not token:
                break
            time.sleep(0.3)
        log.info("zoom participants fetched", extra={"uuid": meeting_uuid, "rows": len(out)})
        return out
