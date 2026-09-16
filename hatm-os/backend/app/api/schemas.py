from datetime import datetime

from pydantic import BaseModel, Field


class ProgramIn(BaseModel):
    name: str
    start_date: datetime | None = None
    attendance_rules: dict = Field(default_factory=dict)
    attendance_sheet_id: str | None = None
    attendance_sheet_tab: str | None = None
    feedback_form_url: str | None = None


class SessionIn(BaseModel):
    program_id: int
    title: str
    planned_start: datetime
    planned_end: datetime
    zoom_meeting_id: str | None = None
    zoom_meeting_uuid: str | None = None


class TraineeIn(BaseModel):
    program_id: int
    name_ar: str
    name_en: str | None = None
    email: str | None = None
    phone: str | None = None
    zoom_aliases: list[str] = Field(default_factory=list)


class ConfirmIn(BaseModel):
    trainee_id: int


class RejectIn(BaseModel):
    reason: str | None = None


class PayloadPatch(BaseModel):
    edited_content: dict


class CommandIn(BaseModel):
    text: str
    choice: dict | None = None     # answer to a clarification, e.g. {"session_id": 412}
