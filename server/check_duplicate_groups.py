"""
Скрипт проверки дубликатов групп
"""
import asyncio
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, selectinload
from collections import defaultdict

from app.models.group import Group
from app.config import settings


async def check_duplicates():
    print("=" * 60)
    print("ПРОВЕРКА ДУБЛИКАТОВ ГРУПП")
    print("=" * 60)

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session_maker = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session_maker() as session:
        # Получаем все группы
        result = await session.execute(
            select(Group).options(
                selectinload(Group.subject),
                selectinload(Group.teacher)
            )
        )
        groups = result.scalars().all()

        print(f"\nВсего групп в БД: {len(groups)}")

        # Группируем по названию
        by_name = defaultdict(list)
        for group in groups:
            by_name[group.name].append(group)

        # Показываем дубликаты
        duplicates_found = False
        for name, group_list in by_name.items():
            if len(group_list) > 1:
                duplicates_found = True
                print(f"\n'{name}' - найдено {len(group_list)} дубликатов:")
                for g in group_list:
                    print(f"  ID: {g.id}")
                    print(f"    Предмет: {g.subject.name if g.subject else 'Нет'}")
                    print(f"    Учитель: {g.teacher.first_name} {g.teacher.last_name if g.teacher else 'Нет'}")
                    print(f"    Создано: {g.created_at}")

        if not duplicates_found:
            print("\nДубликатов не найдено!")
        else:
            print("\n" + "=" * 60)
            print("ВСЕГО УНИКАЛЬНЫХ НАЗВАНИЙ ГРУПП:", len(by_name))
            print("ВСЕГО ГРУПП В БД:", len(groups))

        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(check_duplicates())
