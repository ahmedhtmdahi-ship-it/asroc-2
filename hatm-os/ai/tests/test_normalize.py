from app.normalize import is_kunya, normalize_ar, phonetic_key


def test_diacritics_and_letters():
    assert normalize_ar("أَحْمَد مُحَمَّد") == "احمد محمد"
    assert normalize_ar("فاطمة") == "فاطمه"
    assert normalize_ar("مصطفى") == "مصطفي"
    assert normalize_ar("إسلام") == "اسلام"
    assert normalize_ar("مؤمن") == "مومن"
    assert normalize_ar("آية") == "ايه"


def test_tatweel_digits_emoji():
    assert normalize_ar("أحـــمد ✨🔥") == "احمد"
    assert normalize_ar("احمد ١٢٣") == "احمد"


def test_device_and_titles():
    assert normalize_ar("Ahmed's iPhone") == "ahmed"
    assert normalize_ar("Sara’s iPad") == "sara"
    assert normalize_ar("Galaxy S21") == ""
    assert normalize_ar("م/ أحمد علي") == "احمد علي"
    assert normalize_ar("Dr. Sara Abdallah") == "sara abdallah"
    assert normalize_ar("المهندس محمد علي") == "محمد علي"
    assert normalize_ar("Eng. Omar") == "omar"


def test_compound_names():
    assert normalize_ar("عبد الرحمن طارق") == normalize_ar("عبدالرحمن طارق")
    assert normalize_ar("منة الله") == "منهالله"


def test_kunya():
    assert is_kunya("أبو يوسف")
    assert is_kunya("Abu Youssef")
    assert not is_kunya("يوسف إبراهيم")


def test_phonetic_bridges_scripts():
    assert phonetic_key("Ahmed Mohamed") == phonetic_key("أحمد محمد")
    assert phonetic_key("Muhammad Aly") == phonetic_key("محمد علي")
    assert phonetic_key("Nourhan") == phonetic_key("نورهان")
    assert phonetic_key("Abdelrahman") == phonetic_key("عبد الرحمن")
    assert phonetic_key("Mennatullah") != []
