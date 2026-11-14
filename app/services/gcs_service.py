"""Google Cloud Storage service for uploading call audio recordings.

Uses the `google-cloud-storage` library. Reads credentials from
GOOGLE_APPLICATION_CREDENTIALS (or the default application credentials flow)
and the GCS_BUCKET_NAME env var.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any, Optional

try:
    from google.cloud import storage
    from google.cloud.storage import Client
except ImportError:
    storage = None  # type: ignore
    Client = Any  # type: ignore

from app.config import settings

logger = logging.getLogger("vaani.gcs")


class GCSService:
    """Wraps a GCS bucket for audio recordings."""

    def __init__(self, bucket_name: Optional[str] = None) -> None:
        self.bucket_name = bucket_name or settings.gcs_bucket_name
        self._client: Optional[Client] = None

    def _ensure_client(self) -> Any:
        if storage is None:
            raise RuntimeError("google-cloud-storage is not installed. Install with 'pip install google-cloud-storage'.")
        if self._client is None:
            # GOOGLE_APPLICATION_CREDENTIALS handled by the library automatically.
            self._client = storage.Client(project=settings.gcp_project_id or None)
        return self._client

    def _ensure_bucket(self) -> "storage.Bucket":
        if not self.bucket_name:
            raise RuntimeError("GCS_BUCKET_NAME is not configured")
        client = self._ensure_client()
        return client.bucket(self.bucket_name)

    def upload_bytes(
        self,
        data: bytes,
        *,
        object_name: Optional[str] = None,
        content_type: str = "audio/wav",
    ) -> str:
        """Upload raw bytes to the configured bucket and return the public URL."""
        bucket = self._ensure_bucket()
        if object_name is None:
            object_name = f"recordings/{datetime.now(timezone.utc).strftime('%Y%m%d/%H%M%S%f')}.wav"
        blob = bucket.blob(object_name)
        blob.upload_from_string(data, content_type=content_type)
        url = f"https://storage.googleapis.com/{self.bucket_name}/{object_name}"
        logger.info("Uploaded %d bytes to %s", len(data), url)
        return url

    def upload_file(
        self,
        file_path: str,
        *,
        object_name: Optional[str] = None,
        content_type: str = "audio/wav",
    ) -> str:
        """Upload a local file to the configured bucket."""
        bucket = self._ensure_bucket()
        if object_name is None:
            object_name = f"recordings/{datetime.now(timezone.utc).strftime('%Y%m%d/%H%M%S%f')}.wav"
        blob = bucket.blob(object_name)
        blob.upload_from_filename(file_path, content_type=content_type)
        url = f"https://storage.googleapis.com/{self.bucket_name}/{object_name}"
        logger.info("Uploaded %s to %s", file_path, url)
        return url


def gcs_service() -> GCSService:
    return GCSService()