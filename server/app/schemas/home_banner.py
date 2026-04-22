from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class HomeBannerFormFieldBase(BaseModel):
    field_type: str  # text | phone | email | textarea | select | number
    key: str
    label: str
    placeholder: str | None = None
    required: bool = False
    options: list | None = None
    sort_order: int = 0


class HomeBannerFormFieldCreate(HomeBannerFormFieldBase):
    pass


class HomeBannerFormFieldResponse(HomeBannerFormFieldBase):
    id: UUID

    model_config = {"from_attributes": True}


class HomeBannerBase(BaseModel):
    title: str
    subtitle: str | None = None
    badge_text: str | None = None
    badge_color: str | None = None
    price_text: str | None = None
    footer_tags: str | None = None
    icon: str | None = None
    gradient_from: str = "#4f46e5"
    gradient_to: str = "#7c3aed"
    background_image_url: str | None = None
    action_url: str | None = None
    signup_enabled: bool = False
    signup_button_text: str | None = None
    sort_order: int = 0
    is_active: bool = True


class HomeBannerCreate(HomeBannerBase):
    form_fields: list[HomeBannerFormFieldCreate] = []


class HomeBannerUpdate(BaseModel):
    title: str | None = None
    subtitle: str | None = None
    badge_text: str | None = None
    badge_color: str | None = None
    price_text: str | None = None
    footer_tags: str | None = None
    icon: str | None = None
    gradient_from: str | None = None
    gradient_to: str | None = None
    background_image_url: str | None = None
    action_url: str | None = None
    signup_enabled: bool | None = None
    signup_button_text: str | None = None
    sort_order: int | None = None
    is_active: bool | None = None
    form_fields: list[HomeBannerFormFieldCreate] | None = None


class HomeBannerResponse(HomeBannerBase):
    id: UUID
    created_at: datetime
    form_fields: list[HomeBannerFormFieldResponse] = []

    model_config = {"from_attributes": True}


class HomeBannerSignupCreate(BaseModel):
    form_data: dict


class HomeBannerSignupResponse(BaseModel):
    id: UUID
    banner_id: UUID
    student_id: UUID | None
    student_name: str | None
    student_phone: str | None
    student_email: str | None
    form_data: dict
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class HomeBannerSignupUpdate(BaseModel):
    status: str | None = None
