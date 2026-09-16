import asyncio
import contextlib
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api import approvals, command, dashboard, programs, reviews, sessions, ws
from app.config import settings
from app.core.errors import AppError
from app.core.logging import setup_json_logging
from app.db import engine

setup_json_logging()
log = logging.getLogger("hatm.api")


@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(ws.redis_listener())
    yield
    task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await task


app = FastAPI(title="HATM OS API", version="0.1.0", lifespan=lifespan,
              openapi_url="/api/openapi.json", docs_url="/api/docs")

app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origin_list,
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(AppError)
def app_error_handler(request: Request, exc: AppError):
    """{"error": {"code", "message", ...}} — this shape is a contract with the frontend."""
    return JSONResponse(status_code=exc.http_status, content=exc.to_dict())


@app.exception_handler(RequestValidationError)
def validation_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": {
        "code": "VALIDATION_ERROR", "message": "بيانات الطلب مش صحيحة", "details": exc.errors()}})


@app.exception_handler(Exception)
def unhandled_handler(request: Request, exc: Exception):
    log.exception("unhandled error")
    return JSONResponse(status_code=500, content={"error": {
        "code": "INTERNAL_ERROR", "message": f"{type(exc).__name__}: {exc}"[:300]}})


app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(reviews.router, prefix="/api/reviews", tags=["reviews"])
app.include_router(approvals.router, prefix="/api/approvals", tags=["approvals"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(command.router, prefix="/api", tags=["command"])
app.include_router(programs.router, prefix="/api", tags=["setup"])
app.include_router(ws.router, prefix="/api", tags=["ws"])


@app.get("/health")
def health():
    db_ok = True
    try:
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "db": db_ok,
            "adapter_mode": settings.adapter_mode, "ff_send_email": settings.ff_send_email}
