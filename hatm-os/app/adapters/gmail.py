"""Gmail via service account + domain-wide delegation. Drafts first; `send` is flag-gated upstream."""
import base64
from email.mime.text import MIMEText

from app.adapters.base import MailProvider
from app.config import settings
from app.core.errors import MailError

SCOPES = ["https://www.googleapis.com/auth/gmail.send",
          "https://www.googleapis.com/auth/gmail.compose",
          "https://www.googleapis.com/auth/gmail.readonly"]


class GmailAdapter(MailProvider):
    def __init__(self, sender: str | None = None):
        from google.oauth2 import service_account
        from googleapiclient.discovery import build

        self.sender = sender or settings.gmail_sender
        if not self.sender:
            raise MailError("GMAIL_SENDER مش متظبط في .env")
        try:
            creds = service_account.Credentials.from_service_account_file(
                settings.google_sa_json, scopes=SCOPES).with_subject(self.sender)
        except (OSError, ValueError) as e:
            raise MailError(f"ملف الـ service account مش موجود أو غلط: {e}") from e
        self.svc = build("gmail", "v1", credentials=creds, cache_discovery=False).users()

    def _mime(self, to: str, subject: str, body: str) -> dict:
        msg = MIMEText(body, "plain", "utf-8")     # utf-8 or Arabic arrives garbled
        msg["To"], msg["From"], msg["Subject"] = to, self.sender, subject
        return {"raw": base64.urlsafe_b64encode(msg.as_bytes()).decode()}

    def _call(self, req):
        from googleapiclient.errors import HttpError

        try:
            return req.execute()
        except HttpError as e:
            status = getattr(getattr(e, "resp", None), "status", None)
            if status == 403:
                raise MailError("403 — الـ service account محتاج domain-wide delegation "
                                "بالـ scopes بتاعة Gmail") from e
            raise MailError(f"Gmail: {e}") from e

    def create_draft(self, to: str, subject: str, body: str) -> str:
        d = self._call(self.svc.drafts().create(
            userId="me", body={"message": self._mime(to, subject, body)}))
        return d["id"]

    def send(self, to: str, subject: str, body: str) -> str:
        r = self._call(self.svc.messages().send(userId="me", body=self._mime(to, subject, body)))
        return r["id"]

    def has_reply(self, provider_id: str) -> bool:
        """True if the thread of the sent message has a message from someone else."""
        msg = self._call(self.svc.messages().get(userId="me", id=provider_id, format="minimal"))
        thread = self._call(self.svc.threads().get(userId="me", id=msg["threadId"],
                                                   format="metadata",
                                                   metadataHeaders=["From"]))
        for m in thread.get("messages", []):
            if m["id"] == provider_id:
                continue
            for h in m.get("payload", {}).get("headers", []):
                if h["name"].lower() == "from" and self.sender.lower() not in h["value"].lower():
                    return True
        return False
