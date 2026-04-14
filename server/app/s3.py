"""S3 client for chat file uploads."""
import uuid
from io import BytesIO

import boto3
from botocore.config import Config as BotoConfig

from app.config import settings

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_DOC_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/rtf",
    "application/vnd.oasis.opendocument.text",
}
ALLOWED_SHEET_TYPES = {
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "application/vnd.oasis.opendocument.spreadsheet",
}

ALLOWED_CONTENT_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_DOC_TYPES | ALLOWED_SHEET_TYPES

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def _get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL or None,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
        region_name=settings.S3_REGION or None,
        config=BotoConfig(signature_version="s3v4"),
    )


def get_message_type_for_content(content_type: str) -> str:
    if content_type in ALLOWED_IMAGE_TYPES:
        return "image"
    return "file"


async def upload_file(data: bytes, original_name: str, content_type: str) -> str:
    """Upload file bytes to S3, return the object key."""
    ext = original_name.rsplit(".", 1)[-1] if "." in original_name else "bin"
    key = f"chat/{uuid.uuid4().hex}.{ext}"

    client = _get_s3_client()
    client.upload_fileobj(
        BytesIO(data),
        settings.S3_BUCKET_NAME,
        key,
        ExtraArgs={"ContentType": content_type},
    )
    return key


def download_file(key: str) -> tuple[bytes, str]:
    """Download file from S3, return (data, content_type)."""
    client = _get_s3_client()
    response = client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
    data = response["Body"].read()
    content_type = response.get("ContentType", "application/octet-stream")
    return data, content_type
