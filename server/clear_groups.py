"""
Скрипт для удаления всех групп
"""
import asyncio
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.group import Group, GroupStudent
from app.config import settings


async def clear_groups():
    print("=" * 60)
    print("УДАЛЕНИЕ ВСЕХ ГРУПП")
    print("=" * 60)

    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session_maker = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session_maker() as session:
        # Удаляем связи студент-группа
        await session.execute(delete(GroupStudent))
        print("Удалены связи студент-группа")

        # Удаляем группы
        await session.execute(delete(Group))
        print("✓ Удалены группы")

        await session.commit()
        print("\nГотово!")

        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(clear_groups())
