from uuid import UUID
from datetime import date as date_type
from typing import Any, Optional
from pydantic import BaseModel


class ExamCreate(BaseModel):
    group_id: UUID
    title: str
    subject: Optional[str] = None
    date: Optional[date_type] = None
    threshold_score: Optional[int] = None
    selected_tasks: Optional[list[int]] = None
    task_topics: Optional[dict[str, list[str]]] = None
    comment: Optional[str] = None


class ExamUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    date: Optional[date_type] = None
    threshold_score: Optional[int] = None
    selected_tasks: Optional[list[int]] = None
    task_topics: Optional[dict[str, list[str]]] = None
    comment: Optional[str] = None


class ExamResponse(BaseModel):
    id: UUID
    group_id: UUID
    title: str
    subject: Optional[str]
    date: Optional[date_type]
    threshold_score: Optional[int]
    selected_tasks: Optional[Any]
    task_topics: Optional[Any]
    comment: Optional[str]

    model_config = {"from_attributes": True}


class ExamResultCreate(BaseModel):
    student_id: UUID
    primary_score: Optional[int] = None
    final_score: Optional[int] = None
    answers: Optional[list[Optional[int]]] = None
    task_comments: Optional[dict[str, str]] = None
    student_comment: Optional[str] = None


class ExamResultUpdate(BaseModel):
    primary_score: Optional[int] = None
    final_score: Optional[int] = None
    answers: Optional[list[Optional[int]]] = None
    task_comments: Optional[dict[str, str]] = None
    student_comment: Optional[str] = None


class ExamResultResponse(BaseModel):
    id: UUID
    exam_id: UUID
    student_id: UUID
    primary_score: Optional[int]
    final_score: Optional[int]
    answers: Optional[Any]
    task_comments: Optional[Any]
    student_comment: Optional[str]

    model_config = {"from_attributes": True}
