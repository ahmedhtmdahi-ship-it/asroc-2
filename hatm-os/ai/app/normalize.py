"""Arabic/English name normalisation + transliteration to a shared phonetic key."""
import re
import unicodedata

AR_DIACRITICS = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")
AR_INDIC = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")
ALEF = str.maketrans("أإآٱ", "اااا")

# things people put in their Zoom name that aren't their name
DEVICE_SUFFIX = re.compile(
    r"(?:['’]s)?\s*(?:iphone|ipad|android|galaxy(?:\s*[a-z]?\d+)?|samsung|huawei|xiaomi|redmi|"
    r"oppo|realme|infinix|laptop|macbook|pc|phone|mobile|tablet|zoom|user|guest|"
    r"الايفون|ايفون|موبايل|لاب|الجهاز)\b.*$", re.IGNORECASE)
# "م/ أحمد", "د. سارة", "Eng. Omar" — a letter/abbreviation followed by / or .
TITLE_ABBR = re.compile(r"^(?:dr|eng|mr|mrs|ms|miss|prof|m|d|a|أ|م|د|ا)\s*[./]\s*", re.IGNORECASE)
TITLES = re.compile(
    r"^(?:(?:dr|eng|mr|mrs|ms|miss|prof|dear|the)\s+|"
    r"(?:الدكتور|الدكتوره|الدكتورة|المهندس|المهندسه|المهندسة|الاستاذ|الاستاذه|الاستاذة|"
    r"استاذ|استاذه|دكتور|دكتوره|دكتورة|مهندس|مهندسه|مهندسة|السيد|السيده|السيدة|الانسه|الانسة)\s+)+",
    re.IGNORECASE)
KUNYA = re.compile(r"^(?:ابو|ام|أبو|أم|abu|abo|om|um|umm)\s+\S+", re.IGNORECASE)

# compound names written with/without a space
COMPOUNDS = [
    ("عبد ال", "عبدال"), ("عبد الله", "عبدالله"), ("ابو ال", "ابوال"), ("نور ال", "نورال"),
    ("منه ال", "منهال"), ("سيف ال", "سيفال"), ("علاء ال", "علاءال"), ("محي ال", "محيال"),
    ("عز ال", "عزال"), ("جمال ال", "جمالال"), ("كمال ال", "كمالال"), ("امير ال", "اميرال"),
    ("شمس ال", "شمسال"), ("بدر ال", "بدرال"), ("صلاح ال", "صلاحال"), ("حسام ال", "حسامال"),
    ("نجم ال", "نجمال"), ("سعد ال", "سعدال"), ("فتح ال", "فتحال"), ("خير ال", "خيرال"),
]


def strip_emoji(s: str) -> str:
    return "".join(ch for ch in s if unicodedata.category(ch)[0] not in ("S", "C")
                   or ch in "\n\t ")


def normalize_ar(s: str) -> str:
    s = unicodedata.normalize("NFKC", s or "")
    s = strip_emoji(s)
    s = AR_DIACRITICS.sub("", s)
    s = s.translate(ALEF)
    s = (s.replace("ة", "ه").replace("ى", "ي").replace("ؤ", "و").replace("ئ", "ي")
          .replace("ك", "ك").replace("ی", "ي").replace("ھ", "ه").replace("گ", "ك"))
    s = s.translate(AR_INDIC)
    s = s.lower().strip()
    s = TITLE_ABBR.sub("", s)
    s = DEVICE_SUFFIX.sub("", s)
    s = re.sub(r"[^\w\s؀-ۿ]", " ", s)      # punctuation, emoji leftovers
    s = re.sub(r"[_\d]+", " ", s)                     # digits / underscores
    s = re.sub(r"\s+", " ", s).strip()
    s = TITLES.sub("", s).strip()
    for spaced, joined in COMPOUNDS:
        s = s.replace(spaced, joined)
    return s


def tokens(s: str) -> list[str]:
    return [t for t in normalize_ar(s).split(" ") if t]


def is_kunya(s: str) -> bool:
    return bool(KUNYA.match(normalize_ar(s)))


def is_arabic(s: str) -> bool:
    return bool(re.search(r"[؀-ۿ]", s or ""))


# ── transliteration ─────────────────────────────────────────────
# ~200 common Egyptian given names → phonetic key. Variants in Latin all map to the same key.
_NAMES: dict[str, list[str]] = {
    "ahmd": ["ahmed", "ahmad", "ahmet", "ahmd", "احمد"],
    "mhmd": ["mohamed", "mohammed", "muhammad", "mohamad", "mohammad", "muhammed", "mhmd", "محمد"],
    "mhmwd": ["mahmoud", "mahmood", "mahmud", "محمود"],
    "mstf": ["mostafa", "mustafa", "moustafa", "mostapha", "مصطفي", "مصطفى"],
    "ali": ["ali", "aly", "علي", "على"],
    "hsn": ["hassan", "hasan", "حسن"],
    "hsyn": ["hussein", "hussain", "hosein", "hossein", "husein", "حسين"],
    "ibrhm": ["ibrahim", "ebrahim", "ibraheem", "ابراهيم"],
    "ywsf": ["youssef", "yousef", "yusuf", "yossef", "joseph", "يوسف"],
    "omr": ["omar", "omer", "umar", "عمر"],
    "amr": ["amr", "amro", "عمرو"],
    "khld": ["khaled", "khalid", "خالد"],
    "krm": ["karim", "kareem", "كريم"],
    "krm2": ["karam", "كرم"],
    "sam": ["samy", "sami", "سامي"],
    "tarq": ["tarek", "tariq", "tarik", "طارق"],
    "adl": ["adel", "adil", "عادل"],
    "eslm": ["islam", "eslam", "اسلام"],
    "bll": ["bilal", "belal", "بلال"],
    "zyd": ["ziad", "zeyad", "zyad", "زياد"],
    "wal": ["wael", "wail", "وائل", "وايل"],
    "hsm": ["hossam", "hussam", "husam", "حسام"],
    "mgdy": ["magdy", "magdi", "مجدي"],
    "hmd": ["hamed", "hamid", "حامد"],
    "gml": ["gamal", "jamal", "جمال"],
    "kml": ["kamal", "kamel", "كمال", "كامل"],
    "ashrf": ["ashraf", "اشرف"],
    "shrf": ["sherif", "sharif", "شريف"],
    "smyr": ["samir", "sameer", "سمير"],
    "mnyr": ["mounir", "monir", "munir", "منير"],
    "amyr": ["amir", "ameer", "امير"],
    "nsr": ["nasser", "naser", "nasr", "ناصر", "نصر"],
    "frwq": ["farouk", "farouq", "faruk", "فاروق"],
    "ryd": ["ramadan", "رمضان"],
    "sad": ["saad", "sad", "سعد"],
    "sayd": ["sayed", "saied", "said", "sayyid", "سيد", "سعيد"],
    "abdrhmn": ["abdelrahman", "abdulrahman", "abdel rahman", "abdo", "abdelrahmen", "عبدالرحمن"],
    "abdllh": ["abdallah", "abdullah", "abdalla", "عبدالله"],
    "abdlazyz": ["abdelaziz", "abdulaziz", "عبدالعزيز"],
    "abdlhmyd": ["abdelhamid", "عبدالحميد"],
    "abdlrhym": ["abdelrahim", "عبدالرحيم"],
    "abdlmnam": ["abdelmoneim", "abdelmonem", "عبدالمنعم"],
    "abdlfth": ["abdelfattah", "عبدالفتاح"],
    "abdlkrym": ["abdelkarim", "عبدالكريم"],
    "abdlrhmn": ["abd elrahman"],
    "ayman": ["ayman", "aiman", "ايمن"],
    "aymn": ["eman", "iman", "ايمان"],
    "ahmd2": ["hamada", "حماده"],
    "mhnd": ["mohannad", "muhannad", "مهند"],
    "mazn": ["mazen", "mazin", "مازن"],
    "fady": ["fady", "fadi", "فادي"],
    "ramy": ["ramy", "rami", "رامي"],
    "hany": ["hany", "hani", "هاني"],
    "shady": ["shady", "shadi", "شادي"],
    "tamr": ["tamer", "tamir", "تامر"],
    "ammr": ["ammar", "عمار"],
    "yhya": ["yehia", "yahya", "yehya", "يحيي", "يحيى"],
    "zkry": ["zakaria", "zakareya", "زكريا"],
    "slym": ["selim", "salim", "سليم"],
    "slymn": ["soliman", "suleiman", "sulaiman", "سليمان"],
    "othmn": ["osman", "othman", "عثمان"],
    "anas": ["anas", "انس"],
    "adm": ["adam", "ادم"],
    "mrwn": ["marwan", "مروان"],
    "sfy": ["seif", "saif", "سيف"],
    "syfaldyn": ["seifeldin", "seif eldin", "سيف الدين"],
    "hsmaldyn": ["hossam eldin", "hossameldin", "حسام الدين"],
    "nwraldyn": ["noureldin", "nour eldin", "نور الدين"],
    "alaa": ["alaa", "علاء"],
    "ala": ["ola", "علا"],
    "bhaa": ["bahaa", "بهاء"],
    "dyaa": ["diaa", "ضياء"],
    "raf": ["raef", "رائف"],
    "mhsn": ["mohsen", "محسن"],
    "hshm": ["hesham", "hisham", "هشام"],
    "essm": ["essam", "issam", "عصام"],
    "nbyl": ["nabil", "نبيل"],
    "gbr": ["gaber", "jaber", "جابر"],
    "rda": ["reda", "رضا"],
    "fthy": ["fathy", "fathi", "فتحي"],
    "sbry": ["sabry", "sabri", "صبري"],
    "shwqy": ["shawky", "shawqi", "شوقي"],
    "lotfy": ["lotfy", "lotfi", "لطفي"],
    "rmzy": ["ramzy", "ramzi", "رمزي"],
    "mkrm": ["makram", "مكرم"],
    "mnsr": ["mansour", "منصور"],
    "abdo": ["abdou", "عبده"],
    "mtwly": ["metwally", "متولي"],
    "ibrhm2": ["hima", "هيما"],
    "sara": ["sara", "sarah", "ساره", "سارة"],
    "mrym": ["mariam", "maryam", "mariem", "مريم"],
    "fatm": ["fatma", "fatima", "fatema", "fatmah", "فاطمه", "فاطمة"],
    "nwr": ["nour", "noor", "nur", "نور"],
    "nwrhn": ["nourhan", "norhan", "nurhan", "نورهان"],
    "hdyr": ["hadeer", "hadir", "هدير"],
    "nda": ["nada", "ندي", "ندى"],
    "rna": ["rana", "رنا"],
    "mnh": ["menna", "mena", "minna", "منه", "منة"],
    "mnhallh": ["mennatullah", "menna allah", "mennatallah", "منه الله"],
    "shrwq": ["shorouk", "shrouk", "shorok", "شروق"],
    "aya": ["aya", "ayah", "ايه", "اية", "آيه"],
    "hbh": ["heba", "hiba", "هبه", "هبة"],
    "esra": ["esraa", "israa", "esra", "اسراء"],
    "alaa2": ["alaa", "علاء"],
    "asma": ["asmaa", "asma", "اسماء"],
    "dyna": ["dina", "دينا"],
    "rnya": ["rania", "رانيا"],
    "yara": ["yara", "يارا"],
    "salma": ["salma", "سلمي", "سلمى"],
    "mha": ["maha", "مها"],
    "mna": ["mona", "muna", "مني", "منى"],
    "nhy": ["noha", "نهي", "نهى"],
    "nhl": ["nahla", "نهله"],
    "amyra": ["amira", "ameera", "اميره", "اميرة"],
    "amna": ["amina", "amena", "امينه"],
    "ghda": ["ghada", "غاده"],
    "rhm": ["reham", "riham", "ريهام"],
    "shymaa": ["shaimaa", "shimaa", "شيماء"],
    "dalya": ["dalia", "داليا"],
    "hla": ["hala", "هاله"],
    "hnaa": ["hanaa", "هناء"],
    "hnd": ["hend", "hind", "هند"],
    "lyla": ["laila", "layla", "ليلي", "ليلى"],
    "lmya": ["lamia", "لمياء"],
    "mrwa": ["marwa", "مروه", "مروة"],
    "myar": ["mayar", "ميار"],
    "my": ["mai", "may", "مي"],
    "malk": ["malak", "ملك"],
    "jna": ["jana", "gana", "جنا", "جنى"],
    "hbyba": ["habiba", "حبيبه", "حبيبة"],
    "rwan": ["rawan", "روان"],
    "rym": ["reem", "rim", "ريم"],
    "rqya": ["rokaya", "ruqayya", "رقيه", "رقية"],
    "zynb": ["zeinab", "zainab", "زينب"],
    "khdyga": ["khadija", "khadiga", "خديجه", "خديجة"],
    "aysha": ["aisha", "aysha", "عائشه", "عائشة", "عايشه"],
    "asmhan": ["asmahan", "اسمهان"],
    "wfaa": ["wafaa", "وفاء"],
    "smr": ["samar", "سمر"],
    "sha": ["sohaila", "سهيله"],
    "ysmn": ["yasmin", "yasmine", "jasmine", "ياسمين"],
    "ysmna": ["yasmina", "ياسمينا"],
    "farh": ["farah", "فرح"],
    "frida": ["farida", "فريده", "فريدة"],
    "tsnym": ["tasneem", "tasnim", "تسنيم"],
    "bsnt": ["basant", "bassant", "بسنت"],
    "bsma": ["basma", "بسمه", "بسمة"],
    "shhd": ["shahd", "شهد"],
    "gehan": ["gehan", "jihan", "جيهان"],
    "abyr": ["abeer", "عبير"],
    "srsr": ["sherin", "sherine", "شيرين"],
    "nsrn": ["nesreen", "nisreen", "نسرين"],
    "nrmyn": ["nermin", "nermeen", "نرمين"],
    "mrfat": ["mervat", "ميرفت"],
    "nglaa": ["naglaa", "نجلاء"],
    "alzhraa": ["elzahraa", "zahraa", "الزهراء"],
    "aldyn": ["eldin", "el din", "eldeen", "الدين"],
    "mhmdaly": ["mohamed ali"],
    "salh": ["salah", "saleh", "صلاح", "صالح"],
    "sabr": ["saber", "صابر"],
    "shabn": ["shaaban", "شعبان"],
    "rgb": ["ragab", "رجب"],
    "wld": ["walid", "waleed", "وليد"],
    "mnaf": ["mennatullah"],
    "fars": ["fares", "faris", "فارس"],
    "gmy": ["gomaa", "جمعه"],
    "abas": ["abbas", "عباس"],
    "yasr": ["yasser", "yasir", "ياسر"],
    "ysyn": ["yassin", "yaseen", "ياسين"],
    "mlk2": ["malek", "مالك"],
    "hmza": ["hamza", "حمزه", "حمزة"],
    "tlha": ["talha", "طلحه"],
    "zyn": ["zein", "zain", "زين"],
    "rfat": ["refaat", "رفعت"],
    "shhat": ["shehata", "شحاته"],
    "atya": ["attia", "atia", "عطيه"],
    "aid": ["eid", "عيد"],
    "srwr": ["sorour", "سرور"],
    "bkr": ["bakr", "بكر"],
    "ghnm": ["ghanem", "غانم"],
    "sultan": ["sultan", "سلطان"],
    "nagy": ["nagy", "nagi", "ناجي"],
    "labib": ["labib", "لبيب"],
}

TRANSLIT: dict[str, str] = {}
for key, variants in _NAMES.items():
    for v in variants:
        TRANSLIT[normalize_ar(v)] = key


def _latin_fallback(tok: str) -> str:
    """Rough consonant skeleton for unseen Latin names (so 'Karam'≈'Karm')."""
    t = re.sub(r"[^a-z]", "", tok.lower())
    t = (t.replace("ph", "f").replace("sh", "S").replace("kh", "K").replace("gh", "G")
          .replace("th", "T").replace("ou", "u").replace("ee", "i").replace("oo", "u"))
    t = re.sub(r"(.)\1+", r"\1", t)
    return re.sub(r"[aeiouy]", "", t) or t


def _arabic_fallback(tok: str) -> str:
    """Consonant skeleton for Arabic: drop long vowels/hamza so نورهان≈نرهن≈nrhn-ish."""
    return re.sub(r"[اويءهه]", "", tok) or tok


def phonetic_key(name: str) -> list[str]:
    """Per-token keys shared between Arabic and Latin spellings."""
    out = []
    for tok in tokens(name):
        if tok in TRANSLIT:
            out.append(TRANSLIT[tok])
        elif is_arabic(tok):
            out.append("ar:" + _arabic_fallback(tok))
        else:
            out.append("la:" + _latin_fallback(tok))
    return out
