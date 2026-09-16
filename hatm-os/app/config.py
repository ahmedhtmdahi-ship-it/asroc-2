from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database / queue
    database_url: str = "postgresql+psycopg://hatm:changeme@postgres:5432/hatm"
    redis_url: str = "redis://redis:6379/0"

    # Adapters: "fake" (in-memory demo data) or "real" (Drive + Sheets + Zoom + Telegram)
    adapter_mode: str = "fake"

    # Zoom — Server-to-Server OAuth
    zoom_account_id: str = ""
    zoom_client_id: str = ""
    zoom_client_secret: str = ""

    # Google
    google_sa_json: str = "/secrets/service-account.json"
    gmail_sender: str = ""
    # Shared Drive needs supportsAllDrives / includeItemsFromAllDrives on every call
    drive_shared_drive: bool = False
    drive_max_depth: int = 3
    drive_cache_ttl: int = 300

    # Telegram — the team channel
    telegram_bot_token: str = ""

    # AI service
    ai_service_url: str = "http://ai:8100"
    ai_timeout: float = 10.0

    # System behaviour
    zoom_report_retry_minutes: int = 20
    zoom_report_max_retries: int = 6
    approval_expiry_hours: int = 72
    antispam_window_hours: int = 24
    antispam_max_messages: int = 1
    feedback_reminder_after_hours: int = 48
    task_scan_max_projects: int = 20

    # Feature flags — everything that touches the outside world starts OFF
    ff_send_telegram: bool = False
    ff_send_email: bool = False
    ff_write_sheet: bool = False
    ff_scheduled_scan: bool = False
    ff_auto_close_session: bool = False

    # API
    api_token: str = ""
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    operator_name: str = "hatem"

    # Celery: run tasks inline (tests / single-process dev)
    celery_eager: bool = False

    timezone: str = "Africa/Cairo"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
