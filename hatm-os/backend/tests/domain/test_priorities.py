from app.domain.priorities import PriorityItem, rank


def test_rank_is_explainable_and_ordered():
    items = [
        PriorityItem(id="a", title="low", kind="info"),
        PriorityItem(id="b", title="approval", kind="decision", affected=23, blocking=True,
                     hours_to_deadline=20),
        PriorityItem(id="c", title="review", kind="review", affected=3, blocking=True),
    ]
    out = rank(items, top=3)
    assert [x["id"] for x in out] == ["b", "c", "a"]
    assert "بيأثر على 23 شخص" in out[0]["reasoning"]
    assert out[0]["rank"] == 1
    assert all("reasoning" in x for x in out)
