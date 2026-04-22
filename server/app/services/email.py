"""
SMTP email sender.

Если SMTP настройки не заданы — код печатается в лог (режим разработки).
"""
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from app.config import settings

log = logging.getLogger(__name__)


def _is_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER and settings.SMTP_PASSWORD)


def send_email(to: str, subject: str, html: str, text: str | None = None) -> None:
    if not _is_configured():
        log.warning(
            "SMTP не настроен. Письмо НЕ отправлено. to=%s subject=%s\n%s",
            to, subject, text or html,
        )
        return

    from_addr = settings.SMTP_FROM or settings.SMTP_USER
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = formataddr((settings.SMTP_FROM_NAME, from_addr))
    msg["To"] = to
    if text:
        msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        if settings.SMTP_USE_SSL:
            ctx = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=ctx, timeout=15) as s:
                s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                s.sendmail(from_addr, [to], msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as s:
                s.ehlo()
                s.starttls(context=ssl.create_default_context())
                s.ehlo()
                s.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                s.sendmail(from_addr, [to], msg.as_string())
    except Exception as e:
        log.exception("Не удалось отправить email %s: %s", to, e)
        raise


def send_verification_code(email: str, code: str) -> None:
    subject = f"Код подтверждения: {code}"
    text = (
        f"Ваш код подтверждения: {code}\n"
        "Код действителен 10 минут.\n"
        "Если вы не запрашивали код — игнорируйте это письмо."
    )
    html = f"""
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#4f46e5;margin:0 0 16px;">Код подтверждения</h2>
      <p style="color:#374151;font-size:15px;margin:0 0 20px;">Введите этот код в приложении, чтобы продолжить:</p>
      <div style="background:#f3f4f6;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px;">
        <div style="font-size:36px;letter-spacing:8px;font-weight:700;color:#111827;">{code}</div>
      </div>
      <p style="color:#6b7280;font-size:13px;margin:0;">Код действителен 10 минут. Если вы не запрашивали код — просто проигнорируйте это письмо.</p>
    </div>
    """
    send_email(email, subject, html, text)
