"""
Expo Push Notifications.

Публичный API Expo: https://exp.host/--/api/v2/push/send
Работает бесплатно, без регистрации в FCM/APNs на нашей стороне.
"""
import logging
import uuid
from typing import Iterable

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.push_token import PushToken

log = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


async def get_tokens_for_user(
    db: AsyncSession, owner_id: uuid.UUID, owner_type: str
) -> list[str]:
    res = await db.execute(
        select(PushToken.token).where(
            PushToken.owner_id == owner_id,
            PushToken.owner_type == owner_type,
        )
    )
    return list(res.scalars().all())


async def send_push(
    tokens: Iterable[str],
    title: str,
    body: str,
    data: dict | None = None,
    sound: str | bool = "default",
    badge: int | None = None,
) -> None:
    """Send a push to a list of Expo tokens. Errors are logged, not raised."""
    token_list = [t for t in tokens if t and t.startswith("ExponentPushToken[")]
    if not token_list:
        return

    messages = []
    for t in token_list:
        msg: dict = {
            "to": t,
            "title": title,
            "body": body,
            "sound": sound,
            "priority": "high",
            "channelId": "default",
        }
        if data:
            msg["data"] = data
        if badge is not None:
            msg["badge"] = badge
        messages.append(msg)

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                EXPO_PUSH_URL,
                json=messages,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                },
            )
            if resp.status_code >= 400:
                log.warning("Expo push API %s: %s", resp.status_code, resp.text)
                return
            result = resp.json()
            # result.data is an array of ticket objects
            for ticket in result.get("data", []):
                if ticket.get("status") == "error":
                    details = ticket.get("details", {})
                    error = details.get("error") if isinstance(details, dict) else None
                    log.warning("Expo push error: %s / %s", ticket.get("message"), error)
    except Exception as e:
        log.warning("Не удалось отправить push: %s", e)


async def send_push_to_user(
    db: AsyncSession,
    owner_id: uuid.UUID,
    owner_type: str,
    title: str,
    body: str,
    data: dict | None = None,
) -> None:
    tokens = await get_tokens_for_user(db, owner_id, owner_type)
    if tokens:
        await send_push(tokens, title, body, data)


async def send_push_to_users(
    db: AsyncSession,
    recipients: Iterable[tuple[uuid.UUID, str]],  # [(owner_id, owner_type)]
    title: str,
    body: str,
    data: dict | None = None,
) -> None:
    all_tokens: list[str] = []
    for owner_id, owner_type in recipients:
        all_tokens.extend(await get_tokens_for_user(db, owner_id, owner_type))
    if all_tokens:
        await send_push(all_tokens, title, body, data)
