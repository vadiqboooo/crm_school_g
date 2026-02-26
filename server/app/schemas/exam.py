from uuid import UUID
from datetime import date as date_type, datetime
from typing import Any, Optional, List, Dict
from pydantic import BaseModel


class ExamCreate(BaseModel):
    group_id: Optional[UUID] = None
    title: str
    subject: Optional[str] = None  # Keep for backward compatibility
    subject_id: Optional[UUID] = None  # Preferred way
    date: Optional[date_type] = None
    difficulty: Optional[str] = None
    threshold_score: Optional[int] = None
    selected_tasks: Optional[list[int]] = None
    task_topics: Optional[dict[str, list[str]]] = None
    comment: Optional[str] = None
    is_template: Optional[bool] = False


class ExamUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    subject_id: Optional[UUID] = None
    date: Optional[date_type] = None
    difficulty: Optional[str] = None
    threshold_score: Optional[int] = None
    selected_tasks: Optional[list[int]] = None
    task_topics: Optional[dict[str, list[str]]] = None
    comment: Optional[str] = None


class GroupInfoForExam(BaseModel):
    id: UUID
    name: str

    model_config = {"from_attributes": True}


class EmployeeInfoForExam(BaseModel):
    id: UUID
    first_name: str
    last_name: str

    model_config = {"from_attributes": True}


class SubjectInfoForExam(BaseModel):
    id: UUID
    name: str
    code: Optional[str] = None
    exam_type: Optional[str] = None
    tasks: Optional[List[Dict[str, Any]]] = None
    primary_to_secondary_scale: Optional[List[int]] = None
    grade_scale: Optional[List[Dict[str, Any]]] = None

    model_config = {"from_attributes": True}


class ExamResponse(BaseModel):
    id: UUID
    group_id: Optional[UUID]
    title: str
    subject: Optional[str]  # Keep for backward compatibility
    subject_id: Optional[UUID]
    date: Optional[date_type]
    difficulty: Optional[str]
    threshold_score: Optional[int]
    selected_tasks: Optional[Any]
    task_topics: Optional[Any]
    comment: Optional[str]
    is_template: bool
    created_by: Optional[UUID]
    created_by_first_name: Optional[str] = None
    created_by_last_name: Optional[str] = None
    created_at: datetime
    group: Optional[GroupInfoForExam] = None
    subject_rel: Optional[SubjectInfoForExam] = None
    created_by_employee: Optional[EmployeeInfoForExam] = None

    model_config = {"from_attributes": True}


class StudentInfoForResult(BaseModel):
    id: UUID
    first_name: str
    last_name: str

    model_config = {"from_attributes": True}


class ExamResultCreate(BaseModel):
    student_id: UUID
    primary_score: Optional[int] = 0
    final_score: Optional[float] = 0.0
    answers: Optional[list[Optional[int]]] = None
    task_comments: Optional[dict[str, str]] = None
    student_comment: Optional[str] = None


class ExamResultUpdate(BaseModel):
    primary_score: Optional[int] = None
    final_score: Optional[float] = None
    answers: Optional[list[Optional[int]]] = None
    task_comments: Optional[dict[str, str]] = None
    student_comment: Optional[str] = None
    added_by: Optional[UUID] = None


class ExamResultResponse(BaseModel):
    id: UUID
    exam_id: UUID
    student_id: UUID
    primary_score: int
    final_score: float
    answers: Optional[Any]
    task_comments: Optional[Any]
    student_comment: Optional[str]
    added_by: Optional[UUID]
    added_by_first_name: Optional[str] = None
    added_by_last_name: Optional[str] = None
    added_at: datetime
    updated_at: Optional[datetime]
    student: Optional[StudentInfoForResult] = None
    added_by_employee: Optional[EmployeeInfoForExam] = None

    model_config = {"from_attributes": True}
