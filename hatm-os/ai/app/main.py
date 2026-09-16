"""HATM OS — AI service (L4). Stateless. Suggests, never executes."""
import time

from fastapi import FastAPI
from pydantic import BaseModel, Field

from app.config import settings
from app.intent import parse
from app.matcher import match
from app.normalize import normalize_ar, phonetic_key
from app.priority import prioritize

app = FastAPI(title="HATM OS — AI Service", version="0.1.0")


class Candidate(BaseModel):
    idx: int
    name: str | None = ""
    email: str | None = None
    user_id: str | None = None


class RosterItem(BaseModel):
    trainee_id: int
    name_ar: str | None = None
    name_en: str | None = None
    email: str | None = None
    phone: str | None = None
    aliases: list[str] = Field(default_factory=list)


class MatchIn(BaseModel):
    session_id: int | None = None
    candidates: list[Candidate]
    roster: list[RosterItem]


class ParseIn(BaseModel):
    text: str
    context: dict = Field(default_factory=dict)


class LearnIn(BaseModel):
    trainee_id: int
    confirmed_alias: str
    session_id: int | None = None


class PrioritizeIn(BaseModel):
    items: list[dict]


@app.get("/health")
def health():
    return {"status": "ok", "embeddings": settings.ai_use_embeddings,
            "threshold": settings.match_threshold, "margin": settings.match_margin}


@app.post("/match")
def match_endpoint(body: MatchIn):
    t0 = time.perf_counter()
    out = match([c.model_dump() for c in body.candidates], [r.model_dump() for r in body.roster])
    out["stats"]["elapsed_ms"] = int((time.perf_counter() - t0) * 1000)
    return out


@app.post("/parse")
def parse_endpoint(body: ParseIn):
    return parse(body.text, body.context)


@app.post("/learn")
def learn(body: LearnIn):
    """Stateless: the backend stores aliases in Trainee.zoom_aliases and sends them back in the roster.
    We only echo the normalised form so the caller can see what will be matched next time."""
    return {"ok": True, "trainee_id": body.trainee_id,
            "alias": body.confirmed_alias, "normalized": normalize_ar(body.confirmed_alias),
            "phonetic": phonetic_key(body.confirmed_alias)}


@app.post("/prioritize")
def prioritize_endpoint(body: PrioritizeIn):
    return prioritize(body.items)


@app.post("/normalize")
def normalize_endpoint(body: dict):
    """Debug helper for tuning."""
    name = body.get("name", "")
    return {"input": name, "normalized": normalize_ar(name), "phonetic": phonetic_key(name)}
