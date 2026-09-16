"""Push events to connected WebSocket clients (via Redis pub/sub when available)."""
import json
import logging
import time

from app.config import settings

log = logging.getLogger("hatm.events")
CHANNEL = "hatm:events"
_redis_down_until = 0.0


def publish(kind: str, **data) -> None:
    """Fire-and-forget. Called from workers and the API process alike."""
    global _redis_down_until
    payload = json.dumps({"kind": kind, **data}, ensure_ascii=False, default=str)
    if time.monotonic() >= _redis_down_until:
        try:
            import redis

            r = redis.Redis.from_url(settings.redis_url, socket_connect_timeout=1)
            r.publish(CHANNEL, payload)
        except Exception as e:  # noqa: BLE001 — events are best-effort
            _redis_down_until = time.monotonic() + 60     # don't retry on every event
            log.debug("event publish skipped: %s", e)
    from app.api.ws import local_broadcast

    local_broadcast(payload)
