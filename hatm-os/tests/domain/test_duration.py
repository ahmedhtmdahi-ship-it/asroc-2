from datetime import datetime as dt

from app.domain.duration import compute, group_by_identity

W0, W1 = dt(2026, 8, 17, 18, 0), dt(2026, 8, 17, 20, 0)   # 2-hour session


def I(h1, m1, h2, m2):  # noqa: E743
    return (dt(2026, 8, 17, h1, m1), dt(2026, 8, 17, h2, m2))


def test_single_full():
    r = compute([I(18, 0, 20, 0)], W0, W1)
    assert r.total_minutes == 120
    assert r.disconnect_count == 0


def test_overlapping_devices():
    """phone + laptop at the same time — must not be summed"""
    r = compute([I(18, 0, 19, 0), I(18, 30, 19, 30)], W0, W1)
    assert r.total_minutes == 90
    assert len(r.merged) == 1


def test_gap_counts_as_disconnect():
    r = compute([I(18, 0, 18, 30), I(19, 0, 19, 30)], W0, W1)
    assert r.total_minutes == 60
    assert r.disconnect_count == 1


def test_touching_intervals_merge():
    r = compute([I(18, 0, 19, 0), I(19, 0, 20, 0)], W0, W1)
    assert r.total_minutes == 120
    assert r.disconnect_count == 0


def test_clipped_before_window():
    r = compute([(dt(2026, 8, 17, 17, 30), dt(2026, 8, 17, 19, 0))], W0, W1)
    assert r.total_minutes == 60
    assert r.first_join == W0


def test_clipped_after_window():
    r = compute([(dt(2026, 8, 17, 19, 0), dt(2026, 8, 17, 21, 0))], W0, W1)
    assert r.total_minutes == 60


def test_fully_outside():
    r = compute([(dt(2026, 8, 17, 15, 0), dt(2026, 8, 17, 16, 0))], W0, W1)
    assert r.total_minutes == 0
    assert r.is_empty


def test_contained_interval():
    r = compute([I(18, 0, 20, 0), I(18, 30, 19, 0)], W0, W1)
    assert r.total_minutes == 120
    assert len(r.merged) == 1


def test_unsorted_input():
    r = compute([I(19, 0, 19, 30), I(18, 0, 18, 30)], W0, W1)
    assert r.total_minutes == 60
    assert r.first_join == dt(2026, 8, 17, 18, 0)


def test_empty():
    r = compute([], W0, W1)
    assert r.total_minutes == 0
    assert r.first_join is None


def test_three_rows_same_person_prototype_case():
    """the doc's fixture: 3 rows, one overlapping → 118 net minutes, 1 disconnect"""
    rows = [I(18, 2, 19, 10), I(19, 15, 20, 0), I(18, 30, 19, 0)]
    r = compute(rows, W0, W1)
    assert r.total_minutes == 113
    assert r.disconnect_count == 1


class P:
    def __init__(self, name, email=None, user_id=None):
        self.name, self.email, self.user_id = name, email, user_id


def test_group_by_identity_priority():
    g = group_by_identity([P("Ahmed", "a@x.com"), P("Ahmed's iPhone", "A@X.com"),
                           P("Sara", None, "u1"), P("sara ", None, None), P("SARA", None, None)])
    assert set(g) == {"email:a@x.com", "uid:u1", "name:sara"}
    assert len(g["email:a@x.com"]) == 2
    assert len(g["name:sara"]) == 2
