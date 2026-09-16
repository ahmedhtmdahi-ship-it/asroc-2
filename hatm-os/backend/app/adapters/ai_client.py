"""HTTP client for the AI service (L4). It only ever returns suggestions."""
import httpx

from app.adapters.base import IntelligenceProvider
from app.config import settings
from app.core.errors import AIServiceError


class AIClient(IntelligenceProvider):
    def __init__(self, base_url: str | None = None):
        self.base = (base_url or settings.ai_service_url).rstrip("/")

    def _post(self, path: str, body: dict) -> dict:
        try:
            r = httpx.post(f"{self.base}{path}", json=body, timeout=settings.ai_timeout)
            r.raise_for_status()
            return r.json()
        except httpx.HTTPError as e:
            raise AIServiceError(f"خدمة الذكاء مش متاحة: {e}") from e

    def match(self, session_id: int, candidates: list, roster: list) -> dict:
        return self._post("/match", {"session_id": session_id,
                                     "candidates": candidates, "roster": roster})

    def parse(self, text: str, context: dict) -> dict:
        return self._post("/parse", {"text": text, "context": context})
