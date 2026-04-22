from uuid import UUID
from datetime import datetime
from pydantic import BaseModel


class InfoStat(BaseModel):
    value: str
    label: str


class InfoTag(BaseModel):
    icon: str | None = None
    text: str


class InfoFormat(BaseModel):
    icon: str | None = None
    title: str
    subtitle: str | None = None
    bg_color: str | None = None


class HomeInfoCardBase(BaseModel):
    center_name: str = "ГАРРИ"
    center_subtitle: str = "образовательный центр"
    logo_emoji: str = "🧙"
    logo_bg_color: str = "#f59e0b"
    heading_line1: str = "Подготовься к ОГЭ и ЕГЭ"
    heading_line2: str | None = "на 80+"
    heading_accent_color: str = "#fde047"
    subheading: str | None = "В 2 раза выгоднее репетитора"
    gradient_from: str = "#7c3aed"
    gradient_to: str = "#6366f1"
    stats: list[InfoStat] = []
    tags: list[InfoTag] = []
    formats: list[InfoFormat] = []
    trial_button_enabled: bool = True
    trial_button_text: str = "Записаться на пробный"
    tariffs_button_enabled: bool = True
    tariffs_button_text: str = "Тарифы"
    is_visible: bool = True


class HomeInfoCardUpdate(BaseModel):
    center_name: str | None = None
    center_subtitle: str | None = None
    logo_emoji: str | None = None
    logo_bg_color: str | None = None
    heading_line1: str | None = None
    heading_line2: str | None = None
    heading_accent_color: str | None = None
    subheading: str | None = None
    gradient_from: str | None = None
    gradient_to: str | None = None
    stats: list[InfoStat] | None = None
    tags: list[InfoTag] | None = None
    formats: list[InfoFormat] | None = None
    trial_button_enabled: bool | None = None
    trial_button_text: str | None = None
    tariffs_button_enabled: bool | None = None
    tariffs_button_text: str | None = None
    is_visible: bool | None = None


class HomeInfoCardResponse(HomeInfoCardBase):
    id: UUID
    updated_at: datetime

    model_config = {"from_attributes": True}


class TrialSignupCreate(BaseModel):
    student_name: str
    phone: str
    parent_name: str | None = None
    class_number: int | None = None
    comment: str | None = None
