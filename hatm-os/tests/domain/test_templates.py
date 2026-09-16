import pytest

from app.core.errors import AppError
from app.domain.templates import TEMPLATES, render


def test_render_ok():
    t = TEMPLATES["absence"]
    r = render(t["body"], {"name": "أحمد", "session_title": "React", "session_date": "17 أغسطس",
                           "program_name": "برنامج React"}, t["subject"])
    assert "أحمد" in r.body
    assert "{{" not in r.body
    assert r.subject == "غيابك عن جلسة React"
    assert "سيتم الإعلان عنها" in r.body      # default filter still works


def test_missing_variable_raises():
    with pytest.raises(AppError):
        render("أهلاً {{ name }} في {{ missing }}", {"name": "أحمد"})


def test_empty_body_raises():
    with pytest.raises(AppError):
        render("{{ x }}", {"x": ""})


def test_all_builtin_templates_render_with_declared_vars():
    for name, t in TEMPLATES.items():
        vars_ = {v: "x" for v in t["variables"]}
        r = render(t["body"], vars_, t["subject"])
        assert r.body and "{{" not in r.body, name
