"""WhatsApp Business API service for sending messages via Meta Graph API.

Uses Python's httpx to send messages programmatically to the Meta Graph API.
Configuration is loaded from environment variables:
  - WHATSAPP_PHONE_NUMBER_ID: From Meta Developer Console
  - WHATSAPP_ACCESS_TOKEN: From Meta Developer Console
  - WHATSAPP_API_BASE_URL: Defaults to https://graph.facebook.com/v20.0

Documentation: https://developers.facebook.com/docs/whatsapp/cloud-api/reference
"""
from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger("vaani.whatsapp")

WHATSAPP_API_BASE = settings.whatsapp_api_base_url or "https://graph.facebook.com/v20.0"


class WhatsAppService:
    """Service for sending WhatsApp messages via Meta Graph API."""

    def __init__(
        self,
        phone_number_id: Optional[str] = None,
        access_token: Optional[str] = None,
    ) -> None:
        self.phone_number_id = phone_number_id or settings.whatsapp_phone_number_id
        self.access_token = access_token or settings.whatsapp_access_token
        self._client: Optional[httpx.AsyncClient] = None

    def _ensure_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=30.0,
                headers={
                    "Authorization": f"Bearer {self.access_token}",
                    "Content-Type": "application/json",
                },
            )
        return self._client

    async def send_text_message(
        self,
        to: str,
        body: str,
        *,
        preview_url: bool = False,
    ) -> dict:
        """Send a text message to a WhatsApp number.

        Args:
            to: Recipient phone number in E.164 format (e.g., +1234567890)
            body: Text message body
            preview_url: Whether to enable URL preview (default: False)

        Returns:
            API response as dict

        Raises:
            RuntimeError: If WhatsApp credentials are not configured
            httpx.HTTPStatusError: If the API request fails
        """
        if not self.phone_number_id or not self.access_token:
            raise RuntimeError("WhatsApp credentials not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN")

        client = self._ensure_client()

        url = f"{WHATSAPP_API_BASE}/{self.phone_number_id}/messages"

        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "text": {
                "body": body,
                "preview_url": preview_url,
            },
        }

        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            result = response.json()
            logger.info("WhatsApp message sent to %s: message_id=%s", to, result.get("messages", [{}])[0].get("id"))
            return result
        except httpx.HTTPStatusError as e:
            logger.error("WhatsApp API error for %s: %s", to, e.response.text if e.response else str(e))
            raise

    async def send_template_message(
        self,
        to: str,
        template_name: str,
        language_code: str = "en",
        header_data: Optional[dict] = None,
        body_data: Optional[list[dict]] = None,
        footer_data: Optional[dict] = None,
    ) -> dict:
        """Send a WhatsApp template message.

        Note: Templates must be pre-approved in Meta Business Manager.

        Args:
            to: Recipient phone number in E.164 format
            template_name: Name of the approved template
            language_code: Language code (e.g., 'en', 'kn', 'hi')
            header_data: Optional header data with type and value
            body_data: List of body parameter objects with type and text
            footer_data: Optional footer data

        Returns:
            API response as dict
        """
        if not self.phone_number_id or not self.access_token:
            raise RuntimeError("WhatsApp credentials not configured")

        client = self._ensure_client()

        url = f"{WHATSAPP_API_BASE}/{self.phone_number_id}/messages"

        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
            },
        }

        if header_data:
            payload["template"]["header"] = header_data
        if body_data:
            payload["template"]["body"] = {"parameters": body_data}
        if footer_data:
            payload["template"]["footer"] = footer_data

        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error("WhatsApp template message failed: %s", e.response.text if e.response else str(e))
            raise

    async def send_magic_link(
        self,
        to: str,
        room_id: str,
        domain: str,
        expiry_minutes: int = 60,
    ) -> dict:
        """Send a magic link for joining a voice call session.

        Args:
            to: Recipient phone number in E.164 format
            room_id: Call session room_id (UUID)
            domain: Frontend domain for the magic link
            expiry_minutes: Link validity duration in minutes

        Returns:
            API response as dict
        """
        import urllib.parse
        from datetime import datetime, timedelta, timezone

        expiry = datetime.now(timezone.utc) + timedelta(minutes=expiry_minutes)
        expiry_str = expiry.strftime("%Y-%m-%dT%H:%M:%SZ")

        link = f"{domain}/call/{room_id}?exp={expiry_str}"

        body = (
            f"Your VaaniCall AI session is ready!\n\n"
            f"Tap the link to join: {link}\n\n"
            f"This link expires in {expiry_minutes} minutes.\n\n"
            f"---\n"
            f"Magic Link: {link}"
        )

        return await self.send_text_message(to, body)

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client is not None:
            await self._client.aclose()
            self._client = None


# Singleton instance factory
_whatsapp_service: Optional[WhatsAppService] = None


def get_whatsapp_service() -> WhatsAppService:
    """Get or create the WhatsApp service singleton."""
    global _whatsapp_service
    if _whatsapp_service is None:
        _whatsapp_service = WhatsAppService()
    return _whatsapp_service