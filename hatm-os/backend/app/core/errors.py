class AppError(Exception):
    """Base error. `code` is a stable identifier — it's part of the API contract."""

    code = "APP_ERROR"
    http_status = 400

    def __init__(self, message: str, **extra):
        super().__init__(message)
        self.message = message
        self.extra = extra

    def to_dict(self) -> dict:
        return {"error": {"code": self.code, "message": self.message, **self.extra}}


class NotFound(AppError):
    code = "NOT_FOUND"
    http_status = 404


class Conflict(AppError):
    code = "CONFLICT"
    http_status = 409


class ReportNotReady(AppError):
    code = "ZOOM_REPORT_NOT_READY"
    http_status = 503

    def __init__(self, message: str = "تقرير Zoom لسه مش متاح", retry_after: int = 900):
        super().__init__(message, retry_after=retry_after)
        self.retry_after = retry_after


class ZoomError(AppError):
    code = "ZOOM_ERROR"
    http_status = 502


class SheetError(AppError):
    code = "SHEET_ERROR"
    http_status = 502


class MailError(AppError):
    code = "MAIL_ERROR"
    http_status = 502


class AIServiceError(AppError):
    code = "AI_SERVICE_UNAVAILABLE"
    http_status = 503


class ApprovalExpired(AppError):
    code = "APPROVAL_EXPIRED"
    http_status = 409


class ApprovalRequired(AppError):
    code = "APPROVAL_REQUIRED"
    http_status = 403


class TemplateRenderError(AppError):
    code = "TEMPLATE_ERROR"


class FeatureDisabled(AppError):
    code = "FEATURE_DISABLED"
    http_status = 403


class Unauthorized(AppError):
    code = "UNAUTHORIZED"
    http_status = 401
