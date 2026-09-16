import pytest

ROSTER = [
    (1, "أحمد محمد علي", "Ahmed Mohamed Ali", "ahmed.ali@example.com", None, ["احمد م"]),
    (2, "أحمد محمود حسن", "Ahmed Mahmoud Hassan", "a.mahmoud@example.com", None, []),
    (3, "أحمد مصطفى", "Ahmed Mostafa", "a.mostafa@example.com", None, []),
    (4, "سارة عبدالله", "Sara Abdallah", "sara.a@example.com", None, []),
    (5, "محمد علي", "Mohamed Ali", "m.ali@example.com", None, []),
    (6, "محمد علي حسن", "Mohamed Ali Hassan", "m.ali.h@example.com", None, []),
    (7, "نورهان سيد", "Nourhan Sayed", "nourhan@example.com", None, []),
    (8, "يوسف إبراهيم", "Youssef Ibrahim", "youssef@example.com", None, []),
    (9, "مريم خالد", "Mariam Khaled", "mariam@example.com", None, []),
    (10, "عمر فاروق", "Omar Farouk", "omar.f@example.com", None, []),
    (11, "هدير رمضان", "Hadeer Ramadan", "hadeer@example.com", None, []),
    (12, "كريم سامي", "Karim Samy", "karim@example.com", None, []),
    (13, "فاطمة الزهراء", "Fatma Elzahraa", "fatma@example.com", None, []),
    (14, "مصطفى جمال", "Mostafa Gamal", "mostafa.g@example.com", None, []),
    (15, "ندى أشرف", "Nada Ashraf", "nada@example.com", None, []),
    (16, "عبدالرحمن طارق", "Abdelrahman Tarek", "abdo.t@example.com", None, []),
    (17, "رنا محسن", "Rana Mohsen", "rana@example.com", None, []),
    (18, "إسلام عادل", "Islam Adel", "islam@example.com", None, []),
    (19, "منة الله حسام", "Menna Hossam", "menna@example.com", None, []),
    (20, "بلال عصام", "Bilal Essam", "bilal@example.com", None, []),
    (21, "شروق ناصر", "Shorouk Nasser", "shorouk@example.com", None, []),
    (22, "زياد وائل", "Ziad Wael", "ziad@example.com", None, []),
    (23, "آية مجدي", "Aya Magdy", "aya@example.com", None, []),
    (24, "حسام الدين محمد", "Hossam Eldin Mohamed", "hossam@example.com", None, []),
    (25, "خالد سعيد", "Khaled Saied", "khaled@example.com", None, []),
    (26, "يارا هشام", "Yara Hesham", "yara@example.com", None, []),
    (27, "مروان عبدالعزيز", "Marwan Abdelaziz", "marwan@example.com", None, []),
    (28, "ياسمين فتحي", "Yasmin Fathy", "yasmin@example.com", None, []),
    (29, "عمرو حسين", "Amr Hussein", "amr@example.com", None, []),
    (30, "محمود عبدالحميد", None, "mahmoud@example.com", "+20 100 123 4567", []),
]


@pytest.fixture(scope="session")
def roster():
    return [{"trainee_id": i, "name_ar": ar, "name_en": en, "email": em, "phone": ph,
             "aliases": al} for i, ar, en, em, ph, al in ROSTER]
