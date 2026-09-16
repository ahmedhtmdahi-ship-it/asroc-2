"""One place decides real vs fake adapters, so flows never import a concrete class."""
from datetime import datetime

from app.adapters.base import IntelligenceProvider, MailProvider, MeetingProvider, SheetProvider
from app.config import settings


def is_fake() -> bool:
    return settings.adapter_mode.lower() == "fake"


def meeting_provider(planned_start: datetime | None = None) -> MeetingProvider:
    if is_fake():
        from app.adapters.fake import FakeZoomAdapter
        return FakeZoomAdapter(planned_start)
    from app.adapters.zoom import ZoomAdapter
    return ZoomAdapter()


def sheet_provider() -> SheetProvider:
    if is_fake():
        from app.adapters.fake import FakeSheetsAdapter
        return FakeSheetsAdapter()
    from app.adapters.sheets import SheetsAdapter
    return SheetsAdapter()


def mail_provider() -> MailProvider:
    if is_fake():
        from app.adapters.fake import FakeGmailAdapter
        return FakeGmailAdapter()
    from app.adapters.gmail import GmailAdapter
    return GmailAdapter()


def intelligence_provider() -> IntelligenceProvider:
    from app.adapters.ai_client import AIClient
    return AIClient()
