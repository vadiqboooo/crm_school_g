import asyncio
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.group import Group, GroupStudent
from app.config import settings

async def check():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session_maker() as session:
        result = await session.execute(select(func.count(Group.id)))
        print(f'Групп: {result.scalar()}')
        result = await session.execute(select(func.count(GroupStudent.id)))
        print(f'Связей студент-группа: {result.scalar()}')
        await engine.dispose()

asyncio.run(check())
