"""Google Sheets adapter. Writes by column *name* — never by cell address."""
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.adapters.base import CellUpdate, SheetProvider
from app.config import settings
from app.core.errors import SheetError

SCOPES = ["https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/drive.readonly"]


def col_letter(idx: int) -> str:
    """0 → A, 25 → Z, 26 → AA"""
    s = ""
    idx += 1
    while idx > 0:
        idx, rem = divmod(idx - 1, 26)
        s = chr(65 + rem) + s
    return s


def _http_error():
    from googleapiclient.errors import HttpError
    return HttpError


class SheetsAdapter(SheetProvider):
    def __init__(self):
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        try:
            creds = service_account.Credentials.from_service_account_file(
                settings.google_sa_json, scopes=SCOPES)
        except (OSError, ValueError) as e:
            raise SheetError(f"ملف الـ service account مش موجود أو غلط: {e}") from e
        self.svc = build("sheets", "v4", credentials=creds, cache_discovery=False).spreadsheets()

    def _call(self, req):
        try:
            return req.execute()
        except _http_error() as e:
            status = getattr(getattr(e, "resp", None), "status", None)
            if status == 403:
                raise SheetError("403 — شارك الشيت مع إيميل الـ service account كـ Editor") from e
            if status == 404:
                raise SheetError("الشيت مش موجود (تأكد من الـ sheet id)") from e
            raise SheetError(f"Google Sheets: {e}") from e

    @retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=2, min=2, max=30),
           retry=retry_if_exception_type(SheetError), reraise=True)
    def read_range(self, sheet_id: str, rng: str) -> list[list[str]]:
        res = self._call(self.svc.values().get(spreadsheetId=sheet_id, range=rng))
        return res.get("values", [])

    def header_map(self, sheet_id: str, tab: str) -> dict[str, int]:
        rows = self.read_range(sheet_id, f"{tab}!1:1")
        if not rows or not rows[0]:
            raise SheetError(f"صف العناوين فاضي في {tab}")
        return {h.strip(): i for i, h in enumerate(rows[0]) if h and h.strip()}

    def find_row_by_key(self, sheet_id: str, tab: str, key_col: str, key: str) -> int | None:
        hm = self.header_map(sheet_id, tab)
        if key_col not in hm:
            raise SheetError(f"عمود '{key_col}' مش موجود في {tab}")
        letter = col_letter(hm[key_col])
        vals = self.read_range(sheet_id, f"{tab}!{letter}2:{letter}")
        for i, row in enumerate(vals, start=2):
            if row and row[0].strip().lower() == key.strip().lower():
                return i
        return None

    def ensure_column(self, sheet_id: str, tab: str, col_name: str) -> int:
        """Return the column index for `col_name`, appending a header if missing."""
        hm = self.header_map(sheet_id, tab)
        if col_name in hm:
            return hm[col_name]
        idx = max(hm.values()) + 1 if hm else 0
        a1 = f"{tab}!{col_letter(idx)}1"
        self._call(self.svc.values().update(
            spreadsheetId=sheet_id, range=a1, valueInputOption="RAW",
            body={"values": [[col_name]]}))
        return idx

    def snapshot(self, sheet_id: str, tab: str, rows: list[int], cols: list[str]) -> dict:
        """Read the cells about to be written — goes into ActivityLog.before."""
        hm = self.header_map(sheet_id, tab)
        out: dict[str, str] = {}
        for c in cols:
            if c not in hm or not rows:
                continue
            letter = col_letter(hm[c])
            lo, hi = min(rows), max(rows)
            vals = self.read_range(sheet_id, f"{tab}!{letter}{lo}:{letter}{hi}")
            for r in rows:
                row = vals[r - lo] if r - lo < len(vals) else []
                out[f"{c}!{r}"] = row[0] if row else ""
        return out

    @retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=2, min=2, max=30),
           retry=retry_if_exception_type(SheetError), reraise=True)
    def batch_write(self, sheet_id: str, tab: str, updates: list[CellUpdate]) -> int:
        if not updates:
            return 0
        hm = self.header_map(sheet_id, tab)
        data = []
        for u in updates:
            if u.col_name not in hm:
                raise SheetError(f"عمود '{u.col_name}' مش موجود في {tab}")
            data.append({"range": f"{tab}!{col_letter(hm[u.col_name])}{u.row}",
                         "values": [[u.value]]})
        res = self._call(self.svc.values().batchUpdate(
            spreadsheetId=sheet_id,
            body={"valueInputOption": "USER_ENTERED", "data": data}))
        return res.get("totalUpdatedCells", 0)
