"""
Скрипт удаления дубликатов групп (оставляем самую свежую версию)
"""
import asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, selectinload
from collections import defaultdict

from app.models.group import Group, GroupStudent
from app.config import settings


async def remove_duplicates():
    print("=" * 60)
    print("УДАЛЕНИЕ ДУБЛИКАТОВ ГРУПП")
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

        # Удаляем дубликаты
        to_delete = []
        for name, group_list in by_name.items():
            if len(group_list) > 1:
                # Сортируем по дате создания (от старых к новым)
                group_list.sort(key=lambda g: g.created_at)
                # Оставляем только самую новую (последнюю)
                keep = group_list[-1]
                delete = group_list[:-1]

                print(f"\n'{name}' - {len(group_list)} дубликатов")
                print(f"  Оставляем: {keep.id} (создана {keep.created_at})")
                print(f"  Удаляем {len(delete)} старых версий")

                to_delete.extend(delete)

        if to_delete:
            print(f"\n" + "=" * 60)
            print(f"ВСЕГО К УДАЛЕНИЮ: {len(to_delete)} групп")

            confirm = input("\nПродолжить удаление? (yes/no): ")
            if confirm.lower() == 'yes':
                # Сначала удаляем связи студент-группа для этих групп
                for group in to_delete:
                    # Удаляем GroupStudent записи
                    result = await session.execute(
                        select(GroupStudent).where(GroupStudent.group_id == group.id)
                    )
                    group_students = result.scalars().all()
                    for gs in group_students:
                        await session.delete(gs)

                    # Удаляем группу
                    await session.delete(group)

                await session.commit()
                print(f"\nУдалено {len(to_delete)} дубликатов групп")
                print(f"Осталось {len(by_name)} уникальных групп")
            else:
                print("Отменено")
        else:
            print("\nДубликатов не найдено!")

        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(remove_duplicates())
