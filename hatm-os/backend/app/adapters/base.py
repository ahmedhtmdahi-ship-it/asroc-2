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
