from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime


@dataclass
class RawParticipant:
    name: str
    email: str | None
    user_id: str | None
    join_time: datetime
    leave_time: datetime


@dataclass
class MeetingInstance:
    uuid: str
    start_time: datetime


@dataclass
class CellUpdate:
    row: int          # 1-indexed like Google Sheets
    col_name: str     # column *name*, never a letter
    value: str


@dataclass
class DriveFile:
    """One file as Drive reports it.

    `size` is None for native Google files (Docs/Sheets/Slides) — Drive simply
    omits it there, so None means "unknown", never zero.
    `modified_by_email` can be None when the service account cannot see it.
    """
    id: str
    name: str
    mime_type: str | None
    size: int | None
    modified_at: datetime | None
    created_at: datetime | None
    modified_by_email: str | None
    parent_id: str | None = None

    @property
    def is_google_native(self) -> bool:
        return (self.mime_type or "").startswith("application/vnd.google-apps")

    @property
    def is_folder(self) -> bool:
        return self.mime_type == "application/vnd.google-apps.folder"


@dataclass
class ChatMessage:
    """An inbound reply from the team channel."""
    chat_id: str
    text: str
    message_id: str
    reply_to_message_id: str | None
    sender_name: str | None


class MeetingProvider(ABC):
    @abstractmethod
    def list_instances(self, meeting_id: str) -> list[MeetingInstance]: ...

    @abstractmethod
    def find_instance(self, meeting_id: str, target_date: datetime) -> MeetingInstance | None: ...

    @abstractmethod
    def fetch_participants(self, meeting_uuid: str) -> list[RawParticipant]: ...


class SheetProvider(ABC):
    @abstractmethod
    def header_map(self, sheet_id: str, tab: str) -> dict[str, int]: ...

    @abstractmethod
    def find_row_by_key(self, sheet_id: str, tab: str, key_col: str, key: str) -> int | None: ...

    @abstractmethod
    def ensure_column(self, sheet_id: str, tab: str, col_name: str) -> int: ...

    @abstractmethod
    def snapshot(self, sheet_id: str, tab: str, rows: list[int], cols: list[str]) -> dict: ...

    @abstractmethod
    def batch_write(self, sheet_id: str, tab: str, updates: list[CellUpdate]) -> int: ...


class FileStoreProvider(ABC):
    """Drive. Reads only — the system never writes to the team's files."""

    @abstractmethod
    def list_folder(self, folder_id: str) -> list[DriveFile]:
        """Direct children of one folder (paginated internally)."""

    @abstractmethod
    def walk(self, folder_id: str, max_depth: int = 3) -> list[DriveFile]:
        """Files under a folder tree, bounded depth (3 levels is enough)."""

    @abstractmethod
    def find_folder(self, parent_id: str, name: str) -> str | None:
        """Resolve one path segment to a folder id."""

    @abstractmethod
    def resolve_path(self, root_id: str, path: str) -> str | None:
        """Resolve "المشروع/التصميم" to a folder id, or None if a segment is missing."""


class ChatProvider(ABC):
    """Telegram. The team channel."""

    @abstractmethod
    def send(self, chat_id: str, text: str,
             reply_to_message_id: str | None = None) -> str:
        """Returns the provider message id."""

    @abstractmethod
    def poll_updates(self, offset: int | None = None) -> tuple[list[ChatMessage], int | None]:
        """Returns (messages, next_offset)."""


class MailProvider(ABC):
    @abstractmethod
    def create_draft(self, to: str, subject: str, body: str) -> str: ...

    @abstractmethod
    def send(self, to: str, subject: str, body: str) -> str: ...

    @abstractmethod
    def has_reply(self, provider_id: str) -> bool: ...


class IntelligenceProvider(ABC):
    @abstractmethod
    def match(self, session_id: int, candidates: list, roster: list) -> dict: ...

    @abstractmethod
    def parse(self, text: str, context: dict) -> dict: ...
