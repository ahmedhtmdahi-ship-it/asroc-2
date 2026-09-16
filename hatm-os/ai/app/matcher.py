"""Tiered name matching. Suggests only — never executes.

email (1.00) → alias (1.00) → phone (0.95) → fuzzy (0.50–0.95) → embedding (ambiguous only)
Decision: auto ⟺ best ≥ 0.88 AND best − second ≥ 0.10. Otherwise needs_review.
"""
import logging
import re
from dataclasses import dataclass, field

from rapidfuzz import fuzz

from app.config import settings
from app.normalize import is_kunya, normalize_ar, phonetic_key, tokens

log = logging.getLogger("ai.matcher")


@dataclass
class Scored:
    trainee_id: int
    score: float
    reason: str


@dataclass
class RosterEntry:
    trainee_id: int
    names: list[str]                    # normalised name_ar / name_en / aliases
    keys: list[str]                     # phonetic key strings
    email: str | None
    phone_digits: str | None
    aliases: set[str] = field(default_factory=set)
    single_tokens: set[str] = field(default_factory=set)
    key_tokens: set[str] = field(default_factory=set)


def _digits(s: str | None) -> str:
    return re.sub(r"\D", "", s or "")


def build_roster(roster: list[dict]) -> list[RosterEntry]:
    out = []
    for r in roster:
        raw_names = [r.get("name_ar"), r.get("name_en"), *(r.get("aliases") or [])]
        names = [normalize_ar(n) for n in raw_names if n]
        names = [n for n in names if n]
        keys = [" ".join(phonetic_key(n)) for n in raw_names if n]
        aliases = {normalize_ar(a) for a in (r.get("aliases") or []) if a}
        toks: set[str] = set()
        for n in names:
            toks.update(n.split(" "))
        ktoks: set[str] = set()
        for n in raw_names:
            if n:
                ktoks.update(phonetic_key(n))
        out.append(RosterEntry(
            trainee_id=r["trainee_id"], names=names, keys=keys,
            email=(r.get("email") or "").strip().lower() or None,
            phone_digits=_digits(r.get("phone"))[-9:] or None,
            aliases=aliases, single_tokens=toks, key_tokens=ktoks))
    return out


def _combo(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    ts = fuzz.token_set_ratio(a, b)
    tso = fuzz.token_sort_ratio(a, b)
    r = fuzz.ratio(a, b)
    return (0.45 * ts + 0.35 * tso + 0.20 * r) / 100.0


def contains_all(cand_toks: list[str], cand_keys: list[str], entry: RosterEntry) -> bool:
    """Every candidate token appears in the roster name (by text or by phonetic key)."""
    return all(t in entry.single_tokens or k in entry.key_tokens
               for t, k in zip(cand_toks, cand_keys, strict=True))


def fuzzy_score(cand_norm: str, cand_keys: str, entry: RosterEntry) -> tuple[float, str]:
    best, reason = 0.0, "fuzzy"
    n_cand = len(cand_norm.split(" "))
    for n in entry.names:
        s = _combo(cand_norm, n)
        if s > best:
            best, reason = s, "token_set"
    for k in entry.keys:
        s = _combo(cand_keys, k)
        if s > best:
            best, reason = s, "translit"
    # a lone first name can never be a confident match by itself
    if n_cand == 1 and best > 0.90:
        best = 0.90
    return best, reason


class Embedder:
    """Lazy sentence-transformers wrapper. Only used for ambiguous cases, only if enabled."""
    _model = None
    _failed = False

    @classmethod
    def available(cls) -> bool:
        if not settings.ai_use_embeddings or cls._failed:
            return False
        if cls._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                cls._model = SentenceTransformer(settings.ai_embedding_model)
            except Exception as e:  # noqa: BLE001
                log.warning("embeddings unavailable: %s", e)
                cls._failed = True
                return False
        return True

    @classmethod
    def similarity(cls, a: str, bs: list[str]) -> list[float]:
        import numpy as np
        vecs = cls._model.encode([a, *bs], normalize_embeddings=True)
        return [float(np.dot(vecs[0], v)) for v in vecs[1:]]


def match_one(cand: dict, roster: list[RosterEntry]) -> dict:
    name = cand.get("name") or ""
    email = (cand.get("email") or "").strip().lower()
    norm = normalize_ar(name)
    keys = " ".join(phonetic_key(name))
    base = {"candidate_idx": cand["idx"], "trainee_id": None, "confidence": 0.0,
            "method": "none", "needs_review": True, "suggestions": []}

    # 1. exact email
    if email:
        hits = [e for e in roster if e.email == email]
        if len(hits) == 1:
            return {**base, "trainee_id": hits[0].trainee_id, "confidence": 1.0,
                    "method": "email", "needs_review": False}

    # 2. saved alias
    if norm:
        hits = [e for e in roster if norm in e.aliases]
        if len(hits) == 1:
            return {**base, "trainee_id": hits[0].trainee_id, "confidence": 1.0,
                    "method": "alias", "needs_review": False}

    # 3. phone number typed into the name
    d = _digits(name)
    if len(d) >= 9:
        hits = [e for e in roster if e.phone_digits and d.endswith(e.phone_digits)]
        if len(hits) == 1:
            return {**base, "trainee_id": hits[0].trainee_id, "confidence": 0.95,
                    "method": "phone", "needs_review": False}

    if not norm:
        return base

    # 4. fuzzy (normalised text + transliteration keys)
    scored = []
    for e in roster:
        s, reason = fuzzy_score(norm, keys, e)
        if s >= settings.fuzzy_floor:
            scored.append(Scored(e.trainee_id, round(s, 3), reason))
    scored.sort(key=lambda x: -x.score)

    # containment rule: "أحمد" / "محمد علي" inside several roster names → always review;
    # inside exactly one → a capped, confident match (the margin rule still applies).
    cand_toks, cand_keys = tokens(name), phonetic_key(name)
    containers = [e for e in roster if contains_all(cand_toks, cand_keys, e)]
    force_review = len(containers) > 1
    if len(containers) == 1 and cand_toks:
        tid = containers[0].trainee_id
        hit = next((x for x in scored if x.trainee_id == tid), None)
        if hit is None:
            scored.insert(0, Scored(tid, 0.90, "contained"))
        elif hit.score < 0.90:
            hit.score, hit.reason = 0.90, "contained"
        scored.sort(key=lambda x: -x.score)

    # 5. embeddings for the ambiguous zone only
    if scored and scored[0].score < settings.match_threshold and Embedder.available():
        top = scored[:5]
        by_id = {e.trainee_id: e for e in roster}
        sims = Embedder.similarity(norm, [by_id[s.trainee_id].names[0] for s in top])
        for s, sim in zip(top, sims, strict=True):
            blended = round(0.6 * s.score + 0.4 * sim, 3)
            if blended > s.score:
                s.score, s.reason = blended, "embedding"
        scored.sort(key=lambda x: -x.score)

    suggestions = [{"trainee_id": s.trainee_id, "score": s.score, "reason": s.reason}
                   for s in scored[:3]]
    if not scored:
        return base

    best = scored[0]
    second = scored[1].score if len(scored) > 1 else 0.0
    method = "embedding" if best.reason == "embedding" else "fuzzy"
    auto = (best.score >= settings.match_threshold
            and (best.score - second) >= settings.match_margin
            and not force_review
            and not is_kunya(name))
    if auto:
        return {**base, "trainee_id": best.trainee_id, "confidence": best.score,
                "method": method, "needs_review": False, "suggestions": suggestions}
    return {**base, "confidence": best.score, "method": method, "needs_review": True,
            "suggestions": suggestions}


def match(candidates: list[dict], roster_raw: list[dict]) -> dict:
    roster = build_roster(roster_raw)
    results = [match_one(c, roster) for c in candidates]

    # never let two Zoom identities auto-match the same trainee
    owners: dict[int, list[dict]] = {}
    for r in results:
        if r["trainee_id"] is not None and not r["needs_review"]:
            owners.setdefault(r["trainee_id"], []).append(r)
    for tid, rs in owners.items():
        if len(rs) > 1:
            for r in rs:
                if r["method"] == "email":
                    continue            # two devices, same verified email — legit
                r.update({"trainee_id": None, "needs_review": True,
                          "suggestions": r["suggestions"] or
                          [{"trainee_id": tid, "score": r["confidence"], "reason": "duplicate"}]})

    auto = sum(1 for r in results if not r["needs_review"] and r["trainee_id"] is not None)
    review = sum(1 for r in results if r["needs_review"] and r["suggestions"])
    unmatched = sum(1 for r in results if r["needs_review"] and not r["suggestions"])
    return {"matches": results,
            "stats": {"auto_matched": auto, "needs_review": review, "unmatched": unmatched}}


__all__ = ["match", "match_one", "build_roster", "tokens"]
