from uuid import UUID
from datetime import date as date_type, time as time_type
from typing import Optional
from pydantic import BaseModel

from app.models.lesson import LessonStatus, WorkType, GradingSystem, HomeworkGrading, AttendanceStatus


class LessonCreate(BaseModel):
    group_id: UUID
    date: date_type
    time: Optional[time_type] = None
    duration: Optional[int] = None
    topic: Optional[str] = None
    status: Optional[LessonStatus] = None
    is_cancelled: bool = False
    work_type: WorkType = WorkType.none
    grading_system: Optional[GradingSystem] = None
    tasks_count: Optional[int] = None
    homework: Optional[str] = None
    homework_grading: Optional[HomeworkGrading] = None
    homework_tasks_count: Optional[int] = None
    had_previous_homework: bool = False


class LessonUpdate(BaseModel):
    date: Optional[date_type] = None
    time: Optional[time_type] = None
    duration: Optional[int] = None
    topic: Optional[str] = None
    status: Optional[LessonStatus] = None
    is_cancelled: Optional[bool] = None
    work_type: Optional[WorkType] = None
    grading_system: Optional[GradingSystem] = None
    tasks_count: Optional[int] = None
    homework: Optional[str] = None
    homework_grading: Optional[HomeworkGrading] = None
    homework_tasks_count: Optional[int] = None
    had_previous_homework: Optional[bool] = None


class LessonResponse(BaseModel):
    id: UUID
    group_id: UUID
    date: date_type
    time: Optional[time_type]
    duration: Optional[int]
    topic: Optional[str]
    status: Optional[LessonStatus]
    is_cancelled: bool
    work_type: WorkType
    grading_system: Optional[GradingSystem]
    tasks_count: Optional[int]
    homework: Optional[str]
    homework_grading: Optional[HomeworkGrading]
    homework_tasks_count: Optional[int]
    had_previous_homework: bool

    model_config = {"from_attributes": True}


class AttendanceCreate(BaseModel):
    student_id: UUID
    attendance: Optional[AttendanceStatus] = None
    late_minutes: Optional[int] = None
    lesson_grade: Optional[str] = None
    homework_grade: Optional[str] = None
    comment: Optional[str] = None


class AttendanceUpdate(BaseModel):
    attendance: Optional[AttendanceStatus] = None
    late_minutes: Optional[int] = None
    lesson_grade: Optional[str] = None
    homework_grade: Optional[str] = None
    comment: Optional[str] = None


class AttendanceResponse(BaseModel):
    id: UUID
    lesson_id: UUID
    student_id: UUID
    attendance: Optional[AttendanceStatus]
    late_minutes: Optional[int]
    lesson_grade: Optional[str]
    homework_grade: Optional[str]
    comment: Optional[str]

    model_config = {"from_attributes": True}
