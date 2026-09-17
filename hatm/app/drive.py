"""Read one Drive folder.

    python -m app.drive <folder-id-or-link>

Reads only. The app never writes to anyone's files.
"""
import re
import sys
from dataclasses import dataclass

from app.google_auth import service

# What each file tells us. `id` is unused for now but it is what a re-scan keys
# on, so it is worth carrying from the start.
FIELDS = ("nextPageToken, files(id, name, mimeType, size, modifiedTime, "
          "lastModifyingUser(emailAddress))")

FOLDER_MIME = "application/vnd.google-apps.folder"


@dataclass
class FileInfo:
    id: str
    name: str
    mime_type: str
    # None means Drive reported no size — native Docs/Sheets/Slides have none.
    # It is NOT zero. A genuinely empty upload comes back as 0.
    size: int | None
    # ISO-8601 UTC, same convention as the database
    modified_at: str | None
    # can be missing when we lack visibility on the editor
    modified_by_email: str | None

    @property
    def is_folder(self) -> bool:
        return self.mime_type == FOLDER_MIME

    @property
    def is_google_native(self) -> bool:
        return self.mime_type.startswith("application/vnd.google-apps")


def folder_id(value: str) -> str:
    """Accept a pasted Drive link or a bare id — one less thing to get wrong."""
    value = (value or "").strip()
    m = re.search(r"/folders/([A-Za-z0-9_-]+)", value)
    if m:
        return m.group(1)
    m = re.search(r"[?&]id=([A-Za-z0-9_-]+)", value)
    if m:
        return m.group(1)
    return value.split("?")[0].rstrip("/").split("/")[-1]


def _parse(f: dict) -> FileInfo:
    # Drive sends size as a *string* of bytes, and omits the key entirely for
    # native Google files.
    raw_size = f.get("size")
    return FileInfo(
        id=f["id"],
        name=f.get("name", ""),
        mime_type=f.get("mimeType", ""),
        size=int(raw_size) if raw_size is not None else None,
        modified_at=_iso(f.get("modifiedTime")),
        modified_by_email=(f.get("lastModifyingUser") or {}).get("emailAddress"),
    )


def _iso(value: str | None) -> str | None:
    """Drive gives 2026-08-17T10:30:00.123Z — drop the milliseconds so every
    timestamp in the database has the same shape and compares as a string."""
    if not value:
        return None
    return re.sub(r"\.\d+Z$", "Z", value)


def list_files(fid: str) -> list[FileInfo]:
    """Direct children of one folder. Follows pagination."""
    fid = folder_id(fid)
    files = service("drive", "v3").files()
    out: list[FileInfo] = []
    page = None
    while True:
        res = files.list(
            q=f"'{fid}' in parents and trashed = false",
            fields=FIELDS,
            pageSize=1000,
            pageToken=page,
            # Always on. Without these a Shared Drive folder returns an EMPTY
            # LIST AND NO ERROR — you think the folder is empty when it is full.
            # They are harmless on My Drive, so there is no switch to get wrong.
            supportsAllDrives=True,
            includeItemsFromAllDrives=True,
        ).execute()
        out.extend(_parse(f) for f in res.get("files", []))
        page = res.get("nextPageToken")
        if not page:
            break
    return out


def _explain(err: Exception) -> str:
    from googleapiclient.errors import HttpError

    if isinstance(err, HttpError):
        status = getattr(err.resp, "status", None)
        if status == 404:
            return ("٤٠٤ — الفولدر مش موجود، أو الـ id غلط، أو حسابك مش شايفه.\n"
                    "افتح اللينك في المتصفح وتأكد إنك بتوصله.")
        if status == 403:
            return ("٤٠٣ — غالبًا Google Drive API مش مفعّل في مشروعك على الكونسول،\n"
                    "أو التوكن اتعمل بصلاحيات أقل. امسح token.json وسجّل دخول تاني.")
    return str(err)


def main() -> None:
    if len(sys.argv) < 2:
        print("الاستخدام: python -m app.drive <لينك-الفولدر-أو-الـ-id>")
        raise SystemExit(2)

    fid = folder_id(sys.argv[1])
    print(f"الفولدر: {fid}\n")
    try:
        files = list_files(fid)
    except Exception as e:  # noqa: BLE001 — this command exists to explain failures
        print(_explain(e))
        raise SystemExit(1) from None

    if not files:
        print("الفولدر فاضي (أو مفيش حاجة إنت شايفها جواه).")
        return

    for f in sorted(files, key=lambda x: (not x.is_folder, x.name)):
        if f.is_folder:
            size = "فولدر"
        elif f.size is None:
            size = "—"          # Google native: no size, and that is fine
        elif f.size == 0:
            size = "0 KB ⚠"     # a real empty upload
        else:
            size = f"{f.size / 1024:,.0f} KB"
        who = f.modified_by_email or "—"
        when = (f.modified_at or "—")[:16].replace("T", " ")
        print(f"{f.name[:44]:<44} {size:>11}  {when:<17} {who}")

    folders = sum(1 for f in files if f.is_folder)
    print(f"\n{len(files) - folders} ملف · {folders} فولدر جوّه")


if __name__ == "__main__":
    main()
