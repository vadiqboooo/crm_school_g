"""
Проверка перенесенных результатов пробников
"""
import asyncio
import os
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, selectinload
from dotenv import load_dotenv

from app.models.exam import Exam, ExamResult
from app.models.student import Student
from app.models.group import Group

# Load environment variables
load_dotenv()

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL")


async def check_exams():
    """Проверка перенесенных данных"""

    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("=" * 80)
    print("ПРОВЕРКА ПЕРЕНЕСЕННЫХ ДАННЫХ")
    print("=" * 80)

    async with async_session() as session:
        # Подсчитываем экзамены
        result = await session.execute(select(func.count(Exam.id)))
        exams_count = result.scalar()
        print(f"\nВсего экзаменов: {exams_count}")

        # Подсчитываем экзамены с группами и без
        result = await session.execute(
            select(func.count(Exam.id)).where(Exam.group_id.isnot(None))
        )
        exams_with_group = result.scalar()
        print(f"  - С привязкой к группе: {exams_with_group}")
        print(f"  - Без привязки к группе: {exams_count - exams_with_group}")

        # Подсчитываем результаты
        result = await session.execute(select(func.count(ExamResult.id)))
        results_count = result.scalar()
        print(f"\nВсего результатов экзаменов: {results_count}")

        # Подсчитываем результаты с added_by
        result = await session.execute(
            select(func.count(ExamResult.id)).where(ExamResult.added_by.isnot(None))
        )
        results_with_teacher = result.scalar()
        print(f"  - С указанием проверяющего: {results_with_teacher}")
        print(f"  - Без указания проверяющего: {results_count - results_with_teacher}")

        # Результаты по предметам
        result = await session.execute(
            select(Exam.subject, func.count(ExamResult.id))
            .join(ExamResult, Exam.id == ExamResult.exam_id)
            .where(Exam.subject.isnot(None))
            .group_by(Exam.subject)
            .order_by(func.count(ExamResult.id).desc())
        )
        print("\nРезультаты по предметам:")
        for subject, count in result.all():
            print(f"  - {subject}: {count} результатов")

        # Примеры экзаменов
        print("\nПримеры экзаменов (первые 5):")
        result = await session.execute(
            select(Exam)
            .options(selectinload(Exam.group))
            .limit(5)
        )
        for exam in result.scalars():
            group_info = f" (группа: {exam.group.name})" if exam.group else " (без группы)"
            print(f"  - {exam.title}{group_info}")
            print(f"    Предмет: {exam.subject or 'не указан'}")

        # Примеры результатов
        print("\nПримеры результатов (первые 5):")
        result = await session.execute(
            select(ExamResult)
            .options(
                selectinload(ExamResult.exam),
                selectinload(ExamResult.student),
                selectinload(ExamResult.added_by_employee)
            )
            .limit(5)
        )
        for res in result.scalars():
            student_name = f"{res.student.last_name} {res.student.first_name}"
            teacher_name = f"{res.added_by_employee.last_name} {res.added_by_employee.first_name}" if res.added_by_employee else "Не указан"
            print(f"  - {student_name}: {res.exam.title}")
            print(f"    Первичный балл: {res.primary_score}, Финальный балл: {res.final_score}")
            print(f"    Проверил: {teacher_name}")

    await engine.dispose()

    print("\n" + "=" * 80)
    print("ПРОВЕРКА ЗАВЕРШЕНА")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(check_exams())
