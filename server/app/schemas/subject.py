from uuid import UUID
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class SubjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    code: Optional[str] = None
    is_active: bool = True
    exam_type: Optional[str] = None  # "ЕГЭ" or "ОГЭ"
    tasks: Optional[List[Dict[str, Any]]] = None
    primary_to_secondary_scale: Optional[List[int]] = None
    scale_markers: Optional[List[Dict[str, Any]]] = None
    grade_scale: Optional[List[Dict[str, Any]]] = None
    topics: Optional[List[Dict[str, Any]]] = None


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    code: Optional[str] = None
    is_active: Optional[bool] = None
    exam_type: Optional[str] = None
    tasks: Optional[List[Dict[str, Any]]] = None
    primary_to_secondary_scale: Optional[List[int]] = None
    scale_markers: Optional[List[Dict[str, Any]]] = None
    grade_scale: Optional[List[Dict[str, Any]]] = None
    topics: Optional[List[Dict[str, Any]]] = None


class SubjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    color: Optional[str] = None
    code: Optional[str] = None
    is_active: bool
    exam_type: Optional[str] = None
    tasks: Optional[List[Dict[str, Any]]] = None
    primary_to_secondary_scale: Optional[List[int]] = None
    scale_markers: Optional[List[Dict[str, Any]]] = None
    grade_scale: Optional[List[Dict[str, Any]]] = None
    topics: Optional[List[Dict[str, Any]]] = None

    model_config = {"from_attributes": True}
