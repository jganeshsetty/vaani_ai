"""Exotel Connect Voice AI REST + WebSocket integration."""
from __future__ import annotations

import logging
import os
import re
from typing import Optional

import httpx

from app.config import settings
from app.models import Language, TaskOut
from app.services import call_service

logger = logging.getLogger("vaani.exotel")


def format_exotel_number(phone: str) -> str:
    """Format an Indian phone number with leading 0 as required by Exotel.
    
    Accepts any format (+91 9845012345, 919845012345, 09845012345, 9845012345)
    and formats it into standard 09845012345.
    """
    digits = re.sub(r"\D", "", phone or "")
    if not digits:
        return ""
    if len(digits) == 13 and digits.startswith("910"):
        return f"0{digits[3:]}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"0{digits[2:]}"
    if len(digits) == 10:
        return f"0{digits}"
    if len(digits) == 11 and digits.startswith("0"):
        return digits
    if len(digits) > 10:
        return f"0{digits[-10:]}"
    return digits


async def trigger_exotel_call(
    call_id: str,
    task: TaskOut,
    target_number: Optional[str] = None,
    language: Language = Language.KANNADA,
) -> dict:
    """Call the Exotel REST API to start a single-leg outbound voice call.

    Connects directly to the recipient without bridging a second phone, avoiding
    duplicate calls and 'wait while we connect your call' prompts.
    """
    if not settings.exotel_api_key or not settings.exotel_token:
        logger.warning("Exotel credentials missing — skipping trigger for call %s", call_id)
        return {"skipped": True, "reason": "no_credentials"}

    raw_number = target_number or task.target_number
    if not raw_number:
        raise ValueError(f"No target phone number for task {task.id}")

    number = format_exotel_number(raw_number)
    account_sid = settings.exotel_voice_ai_sid or "student1873"
    caller_id = settings.exotel_caller_id or "08047290621"
    app_id = settings.exotel_app_id or "1380428"

    url = f"{settings.exotel_base_url}/Accounts/{account_sid}/Calls/connect.json"

    # Resolve stream base URL for Exotel WebSocket callback
    render_host = os.getenv("RENDER_EXTERNAL_HOSTNAME")
    render_url = os.getenv("RENDER_EXTERNAL_URL")
    railway_host = os.getenv("RAILWAY_PUBLIC_DOMAIN")
    fly_app = os.getenv("FLY_APP_NAME")
    public_url = os.getenv("PUBLIC_URL") or os.getenv("BACKEND_URL")

    stream_base = ""
    if render_url:
        stream_base = render_url
    elif render_host:
        stream_base = f"wss://{render_host}"
    elif railway_host:
        stream_base = f"wss://{railway_host}"
    elif fly_app:
        stream_base = f"wss://{fly_app}.fly.dev"
    elif public_url:
        stream_base = public_url
    elif settings.exotel_stream_url:
        stream_base = settings.exotel_stream_url

    if stream_base:
        if stream_base.startswith("http://"):
            stream_base = "ws://" + stream_base[7:]
        elif stream_base.startswith("https://"):
            stream_base = "wss://" + stream_base[8:]
        elif not stream_base.startswith("ws"):
            stream_base = f"wss://{stream_base.lstrip('/')}"
        
        ws_path = settings.media_ws_path
        stream_url = f"{stream_base.rstrip('/')}{ws_path}?call_id={call_id}"
        
        payload = {
            "From": number,
            "CallerId": caller_id,
            "StreamUrl": stream_url,
            "StreamType": "bidirectional",
            "CustomField": call_id,
        }
        logger.info("Triggering Exotel Voice AI Stream call: %s -> StreamUrl: %s", number, stream_url)
    else:
        payload = {
            "From": number,
            "CallerId": caller_id,
            "Url": f"http://my.exotel.com/{account_sid}/exoml/start_voice/{app_id}",
            "CustomField": call_id,
        }
        logger.info("Triggering Exotel Applet call: %s -> App: %s", number, app_id)

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                url,
                data=payload,
                auth=(settings.exotel_api_key, settings.exotel_token),
            )
            
            if resp.status_code != 200:
                error_msg = resp.text
                try:
                    err_data = resp.json()
                    if "RestException" in err_data:
                        error_msg = err_data["RestException"].get("Message") or resp.text
                except Exception:
                    pass
                
                logger.error("Exotel returned %s for %s: %s", resp.status_code, number, error_msg)
                
                if resp.status_code == 403 and "KYC compliant" in error_msg:
                    friendly_err = (
                        "Exotel KYC Restriction: Exotel trial accounts only allow calling verified numbers "
                        "(such as +91 8660039103) until KYC is completed. "
                        "To dial other numbers, add them in your Exotel dashboard under 'Verified Numbers'."
                    )
                    raise RuntimeError(friendly_err)
                
                raise RuntimeError(f"Exotel error ({resp.status_code}): {error_msg}")

            data = resp.json()
            call_obj = data.get("Call", {})
            call_sid = call_obj.get("Sid")
            if call_sid:
                await call_service.set_call_exotel(call_id, call_sid, media_sid=caller_id)
            logger.info("Exotel call triggered: %s -> %s (Status: %s)", call_id, call_sid, call_obj.get("Status"))
            return data
    except Exception as exc:
        logger.exception("Failed to connect Exotel call: %s", exc)
        raise exc


def media_ws_url(call_id: str) -> str:
    """Build the WebSocket URL Exotel will connect back to for media."""
    scheme = "wss"
    host = settings.host if settings.host != "0.0.0.0" else "localhost"
    port = settings.port
    return f"{scheme}://{host}:{port}{settings.media_ws_path}?call_id={call_id}"
