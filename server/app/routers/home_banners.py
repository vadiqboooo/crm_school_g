import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.home_banner import HomeBanner, HomeBannerFormField, HomeBannerSignup
from app.models.employee import Employee, EmployeeRole
from app.schemas.home_banner import (
    HomeBannerCreate,
    HomeBannerUpdate,
    HomeBannerResponse,
    HomeBannerSignupResponse,
    HomeBannerSignupUpdate,
)
from app.auth.dependencies import get_current_user, require_role

router = APIRouter(prefix="/home-banners", tags=["home-banners"])


@router.get("/", response_model=list[HomeBannerResponse])
async def list_banners(
    active_only: bool = False,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_user),
):
    q = (
        select(HomeBanner)
        .options(selectinload(HomeBanner.form_fields))
        .order_by(HomeBanner.sort_order, HomeBanner.created_at)
    )
    if active_only:
        q = q.where(HomeBanner.is_active.is_(True))
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=HomeBannerResponse, status_code=status.HTTP_201_CREATED)
async def create_banner(
    data: HomeBannerCreate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_role(EmployeeRole.admin)),
):
    payload = data.model_dump()
    fields = payload.pop("form_fields", [])
    banner = HomeBanner(**payload)
    for f in fields:
        banner.form_fields.append(HomeBannerFormField(**f))
    db.add(banner)
    await db.commit()

    result = await db.execute(
        select(HomeBanner)
        .options(selectinload(HomeBanner.form_fields))
        .where(HomeBanner.id == banner.id)
    )
    return result.scalar_one()


@router.patch("/{banner_id}", response_model=HomeBannerResponse)
async def update_banner(
    banner_id: UUID,
    data: HomeBannerUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_role(EmployeeRole.admin)),
):
    result = await db.execute(
        select(HomeBanner)
        .options(selectinload(HomeBanner.form_fields))
        .where(HomeBanner.id == banner_id)
    )
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")

    payload = data.model_dump(exclude_unset=True)
    new_fields = payload.pop("form_fields", None)

    for field, value in payload.items():
        setattr(banner, field, value)

    if new_fields is not None:
        banner.form_fields.clear()
        await db.flush()
        for f in new_fields:
            banner.form_fields.append(HomeBannerFormField(**f))

    await db.commit()

    result = await db.execute(
        select(HomeBanner)
        .options(selectinload(HomeBanner.form_fields))
        .where(HomeBanner.id == banner.id)
    )
    return result.scalar_one()


@router.delete("/{banner_id}")
async def delete_banner(
    banner_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_role(EmployeeRole.admin)),
):
    result = await db.execute(select(HomeBanner).where(HomeBanner.id == banner_id))
    banner = result.scalar_one_or_none()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")

    await db.delete(banner)
    await db.commit()
    return {"detail": "Deleted"}


@router.get("/{banner_id}/signups", response_model=list[HomeBannerSignupResponse])
async def list_banner_signups(
    banner_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_role(EmployeeRole.admin, EmployeeRole.manager)),
):
    result = await db.execute(
        select(HomeBannerSignup)
        .where(HomeBannerSignup.banner_id == banner_id)
        .order_by(HomeBannerSignup.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/signups/{signup_id}", response_model=HomeBannerSignupResponse)
async def update_signup(
    signup_id: UUID,
    data: HomeBannerSignupUpdate,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_role(EmployeeRole.admin, EmployeeRole.manager)),
):
    result = await db.execute(select(HomeBannerSignup).where(HomeBannerSignup.id == signup_id))
    signup = result.scalar_one_or_none()
    if not signup:
        raise HTTPException(status_code=404, detail="Signup not found")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(signup, field, value)

    await db.commit()
    await db.refresh(signup)
    return signup


@router.delete("/signups/{signup_id}")
async def delete_signup(
    signup_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_role(EmployeeRole.admin, EmployeeRole.manager)),
):
    result = await db.execute(select(HomeBannerSignup).where(HomeBannerSignup.id == signup_id))
    signup = result.scalar_one_or_none()
    if not signup:
        raise HTTPException(status_code=404, detail="Signup not found")

    await db.delete(signup)
    await db.commit()
    return {"detail": "Deleted"}


@router.post("/upload-image")
async def upload_banner_image(
    request: Request,
    file: UploadFile = File(...),
    _: Employee = Depends(require_role(EmployeeRole.admin)),
):
    from app.s3 import ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE
    from app.config import settings as app_settings
    import boto3
    from botocore.config import Config as BotoConfig
    from io import BytesIO

    content_type = file.content_type or "application/octet-stream"
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Только изображения (jpeg/png/gif/webp)")

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="Файл слишком большой (макс. 10 МБ)")

    original_name = file.filename or "image"
    ext = original_name.rsplit(".", 1)[-1] if "." in original_name else "bin"
    key = f"banners/{uuid.uuid4().hex}.{ext}"

    client = boto3.client(
        "s3",
        endpoint_url=app_settings.S3_ENDPOINT_URL or None,
        aws_access_key_id=app_settings.S3_ACCESS_KEY,
        aws_secret_access_key=app_settings.S3_SECRET_KEY,
        region_name=app_settings.S3_REGION or None,
        config=BotoConfig(signature_version="s3v4"),
    )
    client.upload_fileobj(
        BytesIO(data),
        app_settings.S3_BUCKET_NAME,
        key,
        ExtraArgs={"ContentType": content_type},
    )

    # Public URL served by this router (no auth — banner images are public)
    base = str(request.base_url).rstrip("/")
    url = f"{base}/home-banners/images/{key}"
    return {"url": url, "key": key}


@router.get("/images/{file_key:path}")
async def serve_banner_image(file_key: str):
    from app.s3 import download_file

    if not file_key.startswith("banners/"):
        raise HTTPException(status_code=404, detail="Not found")

    try:
        data, content_type = download_file(file_key)
    except Exception:
        raise HTTPException(status_code=404, detail="Not found")

    return Response(
        content=data,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )
