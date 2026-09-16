"""≥100 mocked Arabic/English Zoom names. Precision on auto-matches must be 100%."""
import pytest

from app.matcher import match

R = "review"      # must land in Review (needs_review=True); the true id, if any, is in `hint`
N = "none"        # no plausible trainee

# (zoom name, email, expected: trainee_id | "review" | "none", hint id for review cases)
CASES = [
    # ── exact Arabic ───────────────────────────────────────────
    ("أحمد محمد علي", None, 1, None), ("أحمد محمود حسن", None, 2, None), ("أحمد مصطفى", None, 3, None),
    ("سارة عبدالله", None, 4, None), ("نورهان سيد", None, 7, None), ("يوسف إبراهيم", None, 8, None),
    ("مريم خالد", None, 9, None), ("عمر فاروق", None, 10, None), ("هدير رمضان", None, 11, None),
    ("كريم سامي", None, 12, None), ("فاطمة الزهراء", None, 13, None), ("مصطفى جمال", None, 14, None),
    ("ندى أشرف", None, 15, None), ("عبدالرحمن طارق", None, 16, None), ("رنا محسن", None, 17, None),
    ("إسلام عادل", None, 18, None), ("منة الله حسام", None, 19, None), ("بلال عصام", None, 20, None),
    ("شروق ناصر", None, 21, None), ("زياد وائل", None, 22, None), ("آية مجدي", None, 23, None),
    ("حسام الدين محمد", None, 24, None), ("خالد سعيد", None, 25, None), ("يارا هشام", None, 26, None),
    ("مروان عبدالعزيز", None, 27, None), ("ياسمين فتحي", None, 28, None), ("عمرو حسين", None, 29, None),
    ("محمود عبدالحميد", None, 30, None),
    # ── spelling variants: hamza, taa marbuta, alef maqsura, spaces, diacritics ──
    ("احمد مصطفي", None, 3, None), ("ساره عبد الله", None, 4, None), ("اسلام عادل", None, 18, None),
    ("ايه مجدي", None, 23, None), ("فاطمه الزهراء", None, 13, None), ("ندي اشرف", None, 15, None),
    ("عبد الرحمن طارق", None, 16, None), ("منه الله حسام", None, 19, None), ("هَدِير رَمَضان", None, 11, None),
    ("يوسف ابراهيم", None, 8, None), ("مروان عبد العزيز", None, 27, None), ("زياد وايل", None, 22, None),
    # ── English / transliteration ──────────────────────────────
    ("Ahmed Mohamed Ali", None, 1, None), ("Ahmad Mohammed Aly", None, 1, None),
    ("Sara Abdallah", None, 4, None), ("Sarah Abdullah", None, 4, None),
    ("Nourhan Sayed", None, 7, None), ("Norhan Said", None, 7, None),
    ("Youssef Ibrahim", None, 8, None), ("Yousef Ebrahim", None, 8, None),
    ("Mariam Khaled", None, 9, None), ("Maryam Khalid", None, 9, None),
    ("Omar Farouk", None, 10, None), ("Hadeer Ramadan", None, 11, None), ("Karim Samy", None, 12, None),
    ("Kareem Sami", None, 12, None), ("Fatma Elzahraa", None, 13, None), ("Mostafa Gamal", None, 14, None),
    ("Mustafa Jamal", None, 14, None), ("Nada Ashraf", None, 15, None), ("Abdelrahman Tarek", None, 16, None),
    ("Abdulrahman Tarik", None, 16, None), ("Rana Mohsen", None, 17, None), ("Islam Adel", None, 18, None),
    ("Eslam Adil", None, 18, None), ("Bilal Essam", None, 20, None), ("Belal Issam", None, 20, None),
    ("Shorouk Nasser", None, 21, None), ("Ziad Wael", None, 22, None), ("Zeyad Wail", None, 22, None),
    ("Aya Magdy", None, 23, None), ("Khaled Saied", None, 25, None), ("Yara Hesham", None, 26, None),
    ("Marwan Abdelaziz", None, 27, None), ("Yasmin Fathy", None, 28, None), ("Yasmine Fathi", None, 28, None),
    ("Amr Hussein", None, 29, None), ("Amr Hussain", None, 29, None),
    ("Mahmoud Abdelhamid", None, 30, None),              # roster has no name_en → translit key
    ("AHMED MOSTAFA", None, 3, None), ("ahmed mahmoud hassan", None, 2, None),
    ("Hossam Eldin Mohamed", None, 24, None),
    # ── noise: devices, titles, emoji, digits ──────────────────
    ("Sara's iPhone", None, 4, None), ("Nourhan Sayed (iPad)", None, 7, None),
    ("م/ كريم سامي", None, 12, None), ("Dr. Mariam Khaled", None, 9, None),
    ("المهندس بلال عصام", None, 20, None), ("هدير رمضان ✨", None, 11, None),
    ("زياد وائل 🔥🔥", None, 22, None), ("Omar Farouk 2", None, 10, None),
    ("ندى_أشرف", None, 15, None), ("شروق ناصر - Galaxy S21", None, 21, None),
    ("Eng. Marwan Abdelaziz", None, 27, None),
    # ── email wins regardless of the name ──────────────────────
    ("Zoom User", "ahmed.ali@example.com", 1, None), ("iPhone", "rana@example.com", 17, None),
    ("Galaxy A52", "bilal@example.com", 20, None), ("xx", "MENNA@example.com", 19, None),
    # ── saved alias ────────────────────────────────────────────
    ("احمد م", None, 1, None), ("احمد م.", None, 1, None),
    # ── phone typed in the name ────────────────────────────────
    ("01001234567", None, 30, None), ("محمود 0100 123 4567", None, 30, None),
    # ── partial / reordered names ──────────────────────────────
    ("محمد أحمد علي", None, 1, None),         # all tokens present, reordered (doc: token_set)
    ("علي أحمد محمد", None, 1, None),
    ("Abdelrahman", None, 16, None),          # unique first name
    ("عبدالرحمن", None, 16, None),
    ("نورهان", None, 7, None),
    ("Nourhan", None, 7, None),
    ("هدير", None, 11, None),
    ("منة", None, 19, None),
    ("Shorouk", None, 21, None),
    # ── ambiguous: MUST go to review (false positive = worst outcome) ──
    ("أحمد", None, R, None), ("Ahmed", None, R, None), ("احمد محمد", None, 1, None),
    ("Ahmed M.", None, R, None), ("محمد علي", None, R, 5), ("Mohamed Ali", None, R, 5),
    ("محمد علي ح", None, R, 6), ("محمد", None, R, None), ("Mohamed", None, R, None),
    ("أبو يوسف", None, R, None), ("Abu Youssef", None, R, None), ("أم مريم", None, R, None),
    ("محمود", None, R, 30),                   # one محمود first-name but 'أحمد محمود حسن' competes
    ("حسام", None, R, None),                   # حسام الدين vs منة الله حسام
    ("Hossam", None, R, None),
    ("خالد", None, R, None),                   # خالد سعيد vs مريم خالد
    ("علي", None, R, None), ("Ali", None, R, None),
    ("مصطفى", None, R, None), ("Mostafa", None, R, None),
    # ── not in the roster at all ───────────────────────────────
    ("Zoom User", None, N, None), ("Guest", None, N, None), ("iPhone", None, N, None),
    ("user123", None, N, None), ("Test", None, N, None), ("", None, N, None),
    ("محمد عبدالسلام", None, R, None), ("Mona Zaki", None, N, None), ("طارق عبدالرحمن", None, 16, None),
    ("رضوى الشربيني", None, N, None), ("John Smith", None, N, None),
]


def _run(roster):
    """Each case is matched on its own — the test set deliberately has many spellings of the
    same trainee, which the batch-level duplicate guard would (correctly) send to review."""
    matches = []
    for i, (n, e, _, _) in enumerate(CASES):
        matches.append(match([{"idx": i, "name": n, "email": e, "user_id": None}], roster)["matches"][0])
    stats = {"auto_matched": sum(1 for m in matches if not m["needs_review"] and m["trainee_id"]),
             "needs_review": sum(1 for m in matches if m["needs_review"] and m["suggestions"]),
             "unmatched": sum(1 for m in matches if m["needs_review"] and not m["suggestions"])}
    return {"matches": matches, "stats": stats}


def test_at_least_100_cases():
    assert len(CASES) >= 100


def test_precision_is_100_percent(roster):
    """Every auto-match must be right. No exceptions."""
    out = _run(roster)
    wrong = []
    for m, (name, email, expected, _) in zip(out["matches"], CASES, strict=True):
        if not m["needs_review"] and m["trainee_id"] is not None:
            if expected in (R, N) or m["trainee_id"] != expected:
                wrong.append((name, email, expected, m))
    assert wrong == [], f"FALSE POSITIVES: {wrong}"


def test_ambiguous_and_unknown_go_to_review(roster):
    out = _run(roster)
    bad = []
    for m, (name, _email, expected, hint) in zip(out["matches"], CASES, strict=True):
        if expected == R:
            if not m["needs_review"]:
                bad.append((name, "auto-matched", m))
            elif hint and hint not in [s["trainee_id"] for s in m["suggestions"]]:
                bad.append((name, f"true id {hint} missing from suggestions", m["suggestions"]))
        if expected == N and not m["needs_review"]:
            bad.append((name, "unknown name got matched", m))
    assert bad == [], bad


def test_recall_and_review_rate(roster):
    out = _run(roster)
    should = [(m, c) for m, c in zip(out["matches"], CASES, strict=True) if isinstance(c[2], int)]
    hit = sum(1 for m, c in should if not m["needs_review"] and m["trainee_id"] == c[2])
    recall = hit / len(should)
    review_rate = sum(1 for m in out["matches"] if m["needs_review"]) / len(CASES)
    expected_reviews = sum(1 for c in CASES if c[2] in (R, N))
    print(f"\nprecision=100% recall={recall:.1%} ({hit}/{len(should)}) "
          f"review_rate={review_rate:.1%} (expected≈{expected_reviews / len(CASES):.1%}) "
          f"stats={out['stats']}")
    assert recall >= 0.90, f"recall {recall:.1%} below 90%"


def test_contract_shape(roster):
    out = match([{"idx": 0, "name": "احمد م.", "email": None, "user_id": None},
                 {"idx": 1, "name": "Mohamed Ali", "email": "m.ali@x.com", "user_id": "abc"}], roster)
    assert set(out) == {"matches", "stats"}
    for m in out["matches"]:
        assert set(m) == {"candidate_idx", "trainee_id", "confidence", "method", "needs_review",
                          "suggestions"}
        assert m["method"] in ("email", "alias", "phone", "fuzzy", "embedding", "none")
        if m["trainee_id"] is not None and not m["needs_review"]:
            assert m["confidence"] >= 0.88          # contract: never below threshold
    assert set(out["stats"]) == {"auto_matched", "needs_review", "unmatched"}


def test_two_devices_same_email_both_match(roster):
    out = match([{"idx": 0, "name": "sara", "email": "sara.a@example.com"},
                 {"idx": 1, "name": "Sara's iPhone", "email": "sara.a@example.com"}], roster)
    assert [m["trainee_id"] for m in out["matches"]] == [4, 4]


def test_two_names_cannot_take_one_trainee(roster):
    out = match([{"idx": 0, "name": "Nourhan Sayed", "email": None},
                 {"idx": 1, "name": "نورهان سيد", "email": None}], roster)
    assert all(m["needs_review"] for m in out["matches"])


def test_speed_50_participants(roster):
    import time
    cands = [{"idx": i, "name": CASES[i % len(CASES)][0], "email": None} for i in range(50)]
    t0 = time.perf_counter()
    match(cands, roster)
    assert time.perf_counter() - t0 < 2.0


@pytest.mark.parametrize("name", ["أبو يوسف", "Abu Youssef", "ام محمد"])
def test_kunya_never_auto(roster, name):
    out = match([{"idx": 0, "name": name, "email": None}], roster)
    assert out["matches"][0]["needs_review"]
