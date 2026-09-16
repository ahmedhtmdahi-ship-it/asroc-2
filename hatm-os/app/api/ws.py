"""WebSocket push. Events come from Redis pub/sub (workers) and the local process."""
import asyncio
import contextlib
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.config import settings
from app.core.events import CHANNEL

log = logging.getLogger("hatm.ws")
router = APIRouter()

_clients: set[WebSocket] = set()
_loop: asyncio.AbstractEventLoop | None = None


async def _send_all(payload: str) -> None:
    dead = []
    for ws in list(_clients):
        try:
            await ws.send_text(payload)
        except Exception:  # noqa: BLE001
            dead.append(ws)
    for ws in dead:
        _clients.discard(ws)


def local_broadcast(payload: str) -> None:
    """Called from sync code in the API process (approve endpoint etc.)."""
    if _loop and _clients:
        with contextlib.suppress(RuntimeError):
            asyncio.run_coroutine_threadsafe(_send_all(payload), _loop)


async def redis_listener() -> None:
    """Forward worker-published events to sockets. Silently idle without Redis."""
    global _loop
    _loop = asyncio.get_running_loop()
    try:
        import redis.asyncio as aioredis

        r = aioredis.from_url(settings.redis_url, socket_connect_timeout=2)
        ps = r.pubsub()
        await ps.subscribe(CHANNEL)
        async for msg in ps.listen():
            if msg.get("type") == "message":
                data = msg["data"]
                await _send_all(data.decode() if isinstance(data, bytes) else data)
    except asyncio.CancelledError:
        raise
    except Exception as e:  # noqa: BLE001
        log.warning("redis listener not running: %s", e)


@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    _clients.add(ws)
    try:
        await ws.send_text(json.dumps({"kind": "hello", "clients": len(_clients)}))
        while True:
            await ws.receive_text()      # keep-alive pings from the client
    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(ws)
