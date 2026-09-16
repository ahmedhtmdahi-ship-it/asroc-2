"""Seed a demo project (faked Arabic names) + a past session so the flow can be driven end-to-end.

    docker compose exec api python -m scripts.seed_demo
"""
from datetime import timedelta

from app.adapters.fake import FakeSheetsAdapter
from app.core.timeutil import utcnow
from app.db import SessionLocal
from app.models.project import Project
from app.models.session import Session as Sess
from app.models.trainee import Trainee

ROSTER = [
    ("أحمد محمد علي", "Ahmed Mohamed Ali", "ahmed.ali@example.com"),
    ("أحمد محمود حسن", "Ahmed Mahmoud", "a.mahmoud@example.com"),
    ("أحمد مصطفى", "Ahmed Mostafa", "a.mostafa@example.com"),
    ("سارة عبدالله", "Sara Abdallah", "sara.a@example.com"),
    ("محمد علي", "Mohamed Ali", "m.ali@example.com"),
    ("محمد علي حسن", "Mohamed Ali Hassan", "m.ali.h@example.com"),
    ("نورهان سيد", "Nourhan Sayed", "nourhan@example.com"),
    ("يوسف إبراهيم", "Youssef Ibrahim", "youssef@example.com"),
    ("مريم خالد", "Mariam Khaled", "mariam@example.com"),
    ("عمر فاروق", "Omar Farouk", "omar.f@example.com"),
    ("هدير رمضان", "Hadeer Ramadan", "hadeer@example.com"),
    ("كريم سامي", "Karim Samy", "karim@example.com"),
    ("فاطمة الزهراء", "Fatma Elzahraa", "fatma@example.com"),
    ("مصطفى جمال", "Mostafa Gamal", "mostafa.g@example.com"),
    ("ندى أشرف", "Nada Ashraf", "nada@example.com"),
    ("عبدالرحمن طارق", "Abdelrahman Tarek", "abdo.t@example.com"),
    ("رنا محسن", "Rana Mohsen", "rana@example.com"),
    ("إسلام عادل", "Islam Adel", "islam@example.com"),
    ("منة الله حسام", "Menna Hossam", "menna@example.com"),
    ("بلال عصام", "Bilal Essam", "bilal@example.com"),
    ("شروق ناصر", "Shorouk Nasser", "shorouk@example.com"),
    ("زياد وائل", "Ziad Wael", "ziad@example.com"),
    ("آية مجدي", "Aya Magdy", "aya@example.com"),
    ("حسام الدين", "Hossam Eldin", "hossam@example.com"),
]


def run() -> None:
    db = SessionLocal()
    try:
        if db.query(Project).filter_by(name="React").first():
            print("already seeded")
            return
        prog = Project(name="React", attendance_rules={}, attendance_sheet_id="demo-sheet",
                       attendance_sheet_tab="Attendance",
                       feedback_form_url="https://forms.example.com/react-feedback",
                       start_date=(utcnow() - timedelta(days=30)).date())
        db.add(prog)
        db.flush()
        db.add_all([Trainee(project_id=prog.id, name_ar=ar, name_en=en, email=em)
                    for ar, en, em in ROSTER])
        yesterday = (utcnow() - timedelta(days=1)).replace(hour=15, minute=0, second=0, microsecond=0)
        db.add(Sess(project_id=prog.id, title="React", planned_start=yesterday,
                    planned_end=yesterday + timedelta(hours=2), zoom_meeting_id="81244710932"))
        tomorrow = (utcnow() + timedelta(days=1)).replace(hour=15, minute=0, second=0, microsecond=0)
        db.add(Sess(project_id=prog.id, title="React", planned_start=tomorrow,
                    planned_end=tomorrow + timedelta(hours=2), zoom_meeting_id="81244710932"))
        flutter = Project(name="Flutter", attendance_rules={})
        db.add(flutter)
        db.flush()
        today = utcnow().replace(hour=15, minute=0, second=0, microsecond=0)
        db.add(Sess(project_id=flutter.id, title="Flutter", planned_start=today,
                    planned_end=today + timedelta(hours=2), zoom_meeting_id="88800011122"))
        db.commit()
        FakeSheetsAdapter.seed("demo-sheet", "Attendance", ["Name", "Email"],
                               [[ar, em] for ar, _, em in ROSTER])
        print(f"seeded project {prog.id} with {len(ROSTER)} trainees and 3 sessions")
    finally:
        db.close()


if __name__ == "__main__":
    run()
