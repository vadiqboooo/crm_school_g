"""
Скрипт проверки студентов в группах
"""
import asyncio
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, selectinload

from app.models.group import Group
from app.models.student import Student
from app.config import settings


async def check_groups():
    print("=" * 60)
    print("ПРОВЕРКА СТУДЕНТОВ В ГРУППАХ")
    print("=" * 60)

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session_maker = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session_maker() as session:
        # Проверяем количество групп
        result = await session.execute(select(func.count(Group.id)))
        group_count = result.scalar()
        print(f"\nВсего групп в БД: {group_count}")

        # Проверяем количество студентов
        result = await session.execute(select(func.count(Student.id)))
        student_count = result.scalar()
        print(f"Всего студентов в БД: {student_count}")

        # Получаем группы с студентами
        result = await session.execute(
            select(Group).options(selectinload(Group.students))
        )
        groups = result.scalars().all()

        print(f"\n{'Группа':<50} {'Студентов':>10}")
        print("-" * 62)

        total_relations = 0
        for group in groups[:10]:  # Показываем первые 10 групп
            student_count = len(group.students)
            total_relations += student_count
            print(f"{group.name:<50} {student_count:>10}")

        if len(groups) > 10:
            # Считаем остальные
            for group in groups[10:]:
                total_relations += len(group.students)
            print(f"... и еще {len(groups) - 10} групп")

        print("-" * 62)
        print(f"{'ВСЕГО связей студент-группа:':<50} {total_relations:>10}")

        # Проверяем association table напрямую
        from app.models.group import group_student_association
        result = await session.execute(
            select(func.count()).select_from(group_student_association)
        )
        assoc_count = result.scalar()
        print(f"\nЗаписей в association table: {assoc_count}")

        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(check_groups())
