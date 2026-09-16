from fastapi import Header

from app.config import settings
from app.core.errors import Unauthorized
from app.core.logging import set_actor


def current_user(authorization: str | None = Header(default=None),
                 x_api_token: str | None = Header(default=None)) -> str:
    """Single-operator MVP: optional shared token. Sets the ActivityLog actor."""
    if settings.api_token:
        token = x_api_token or (authorization or "").removeprefix("Bearer ").strip()
        if token != settings.api_token:
            raise Unauthorized("التوكن غلط أو ناقص")
    set_actor("human", settings.operator_name)
    return settings.operator_name
