"""One Google sign-in, shared by drive.py and sheet.py.

The app uses **OAuth "Desktop app"** credentials, not a service account: it runs
as Hatem and therefore sees exactly what he sees. A service account is a separate
user, so every folder would have to be shared with it by hand — impossible for
projects he takes part in but does not own.

First run opens a browser once. After that `token.json` keeps the session and it
refreshes itself.
"""
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow

from app import config

# Least privilege: Drive is read-only because the app never touches the team's
# files. Sheets is read-write because the scan writes the status column back.
SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/spreadsheets",
]


class AuthError(Exception):
    pass


def credentials() -> Credentials:
    creds = None
    if config.GOOGLE_TOKEN.exists():
        creds = Credentials.from_authorized_user_file(str(config.GOOGLE_TOKEN), SCOPES)

    if creds and creds.valid:
        return creds

    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())          # silent, no browser
    else:
        if not config.GOOGLE_OAUTH_CLIENT.exists():
            raise AuthError(
                f"ملف {config.GOOGLE_OAUTH_CLIENT.name} مش موجود.\n"
                "نزّله من console.cloud.google.com → Credentials → "
                "Create credentials → OAuth client ID → Desktop app")
        flow = InstalledAppFlow.from_client_secrets_file(
            str(config.GOOGLE_OAUTH_CLIENT), SCOPES)
        # opens the browser, waits for the redirect on a local port
        creds = flow.run_local_server(port=0, prompt="consent")

    config.GOOGLE_TOKEN.write_text(creds.to_json(), encoding="utf-8")
    return creds


def service(name: str, version: str):
    """Build a Google API client. cache_discovery=False silences a noisy warning."""
    from googleapiclient.discovery import build

    return build(name, version, credentials=credentials(), cache_discovery=False)
