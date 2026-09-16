"""Jinja2 rendering with StrictUndefined — a missing variable is an error, never `{{ name }}` in a real email."""
from dataclasses import dataclass

from jinja2 import Environment, StrictUndefined, TemplateError

from app.core.errors import TemplateRenderError

_env = Environment(undefined=StrictUndefined, autoescape=False)


@dataclass
class Rendered:
    subject: str | None
    body: str


def render(template_body: str, variables: dict,
           template_subject: str | None = None) -> Rendered:
    try:
        body = _env.from_string(template_body).render(**variables).strip()
        subject = (_env.from_string(template_subject).render(**variables).strip()
                   if template_subject else None)
    except TemplateError as e:
        raise TemplateRenderError(f"خطأ في القالب: {e}") from e

    if not body:
        raise TemplateRenderError("الرسالة فاضية بعد الـ render")
    if "{{" in body or (subject and "{{" in subject):
        raise TemplateRenderError("القالب لسه فيه متغيرات مش متبدلة")
    return Rendered(subject, body)


# Built-in defaults; a MessageTemplate row of the same type overrides these.
TEMPLATES: dict[str, dict] = {
    "absence": {
        "subject": "غيابك عن جلسة {{ session_title }}",
        "body": """أهلاً {{ name }}،

لاحظنا غيابك عن جلسة {{ session_title }} بتاريخ {{ session_date }}.

لو فيه ظرف منعك، ابعتلنا رد على الرسالة دي.
الجلسة الجاية: {{ next_session | default("سيتم الإعلان عنها") }}

تحياتنا،
فريق {{ program_name }}""",
        "variables": ["name", "session_title", "session_date", "next_session", "program_name"],
    },
    "partial": {
        "subject": "حضورك الجزئي — {{ session_title }}",
        "body": """أهلاً {{ name }}،

سجّلنا حضورك {{ percentage }}% من جلسة {{ session_title }}
({{ minutes }} دقيقة من أصل {{ total_minutes }}).

الحد الأدنى للحضور {{ min_required }}%.

تحياتنا،
فريق {{ program_name }}""",
        "variables": ["name", "session_title", "percentage", "minutes", "total_minutes",
                      "min_required", "program_name"],
    },
    "feedback": {
        "subject": "رأيك يهمنا — {{ session_title }}",
        "body": """أهلاً {{ name }}،

ياريت تملالنا استمارة التقييم دي، مش هتاخد أكتر من دقيقتين:
{{ form_url }}

شكرًا،
فريق {{ program_name }}""",
        "variables": ["name", "session_title", "form_url", "program_name"],
    },
    "reminder": {
        "subject": "تذكير: {{ subject_ref }}",
        "body": """أهلاً {{ name }}،

تذكير بسيط بخصوص: {{ subject_ref }}
{{ details }}

شكرًا،
فريق {{ program_name }}""",
        "variables": ["name", "subject_ref", "details", "program_name"],
    },
}
