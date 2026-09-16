"""A faked team, project and task list, shaped like the real ones."""
from datetime import datetime

# name_ar, name_en, role, email, drive_email, telegram_chat_id
TEAM = [
    ("منى سمير", "Mona Samir", "تصميم", "mona@example.com", "mona@example.com", "1001"),
    ("طارق فؤاد", "Tarek Fouad", "تسويق", "tarek@example.com", "t.fouad@example.com", "1002"),
    ("هالة نبيل", "Hala Nabil", "محتوى", "hala@example.com", "hala@example.com", "1003"),
    ("سيف الدين", "Seif Eldin", "لوجستيات", "seif@example.com", "seif@example.com", None),
    ("ليلى منصور", "Laila Mansour", "تنسيق", "laila@example.com", "laila@example.com", "1005"),
]

PROJECTS = [
    ("أسيوط بشبابها", "root-folder-asyut"),
    ("برنامج React", "root-folder-react"),
]

# title, person index, kind, folder_path, expected, due_at
TASKS = [
    ("تصميم بوستر المؤتمر", 0, "file", "التصميم/البوسترات",
     {"type": "image", "min_count": 1, "naming_pattern": r"^poster[-_]", "min_kb": 50},
     datetime(2026, 8, 17, 12, 0)),
    ("صور اليوم الأول", 1, "file", "التصوير/اليوم الأول",
     {"type": "image", "min_count": 30}, datetime(2026, 8, 18, 12, 0)),
    ("تأكيد حجز القاعة", 3, "confirm", None, {}, datetime(2026, 8, 15, 12, 0)),
    ("خطة المحتوى", 2, "file", "المحتوى", {"min_count": 1}, datetime(2026, 8, 20, 12, 0)),
]

# id, name, mime, size, modified_at, modified_by_email — what Drive would return
DRIVE_FILES = [
    ("f1", "poster-main.png", "image/png", 240_000,
     datetime(2026, 8, 17, 10, 30), "mona@example.com"),
    ("f2", "poster-main (2).png", "image/png", 240_000,
     datetime(2026, 8, 17, 10, 35), "mona@example.com"),
    ("f3", "empty.png", "image/png", 0,
     datetime(2026, 8, 17, 11, 0), "mona@example.com"),
    ("f4", "خطة المحتوى", "application/vnd.google-apps.document", None,
     datetime(2026, 8, 19, 9, 0), "hala@example.com"),
]
