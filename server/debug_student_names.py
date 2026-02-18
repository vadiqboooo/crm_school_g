"""
Скрипт для сравнения ФИО студентов в SQLite и PostgreSQL
"""
import asyncio
import sqlite3
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.student import Student
from app.config import settings

SQLITE_DB_PATH = "../school.db"


def split_full_name(full_name):
    """Разбивает ФИО на имя и фамилию"""
    if not full_name:
        return "Неизвестно", "Неизвестно"

    parts = full_name.strip().split()

    if len(parts) == 0:
        return "Неизвестно", "Неизвестно"
    elif len(parts) == 1:
        return parts[0], ""
    elif len(parts) == 2:
        # Фамилия Имя
        return parts[1], parts[0]
    else:
        # Фамилия Имя Отчество - берем только имя и фамилию
        return parts[1], parts[0]


async def check_students():
    print("=" * 60)
    print("СРАВНЕНИЕ ФИО СТУДЕНТОВ")
    print("=" * 60)

    # SQLite
    sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = sqlite_conn.cursor()

    cursor.execute("SELECT id, fio FROM student LIMIT 10")
    sqlite_students = cursor.fetchall()

    print("\nПримеры из SQLite (fio -> first_name, last_name):")
    for sid, fio in sqlite_students:
        first_name, last_name = split_full_name(fio)
        print(f"  {fio:30} -> '{first_name}' '{last_name}'")

    # PostgreSQL
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session_maker = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session_maker() as session:
        result = await session.execute(
            select(Student).limit(10)
        )
        pg_students = result.scalars().all()

        print("\nПримеры из PostgreSQL:")
        for student in pg_students:
            print(f"  '{student.first_name}' '{student.last_name}'")

        # Проверим конкретный пример
        print("\n" + "=" * 60)
        print("ПРОВЕРКА ПОИСКА")
        print("=" * 60)

        test_fio = sqlite_students[0][1]
        first_name, last_name = split_full_name(test_fio)

        print(f"\nИщем студента:")
        print(f"  ФИО из SQLite: '{test_fio}'")
        print(f"  Разбито на: first_name='{first_name}', last_name='{last_name}'")

        result = await session.execute(
            select(Student).where(
                Student.first_name == first_name,
                Student.last_name == last_name
            )
        )
        found = result.scalar_one_or_none()

        if found:
            print(f"  ✓ Найден: {found.first_name} {found.last_name}")
        else:
            print(f"  ✗ НЕ НАЙДЕН!")
            print(f"\n  Попробуем найти по частичному совпадению:")
            result = await session.execute(
                select(Student).where(
                    Student.last_name.ilike(f"%{last_name}%")
                ).limit(5)
            )
            similar = result.scalars().all()
            if similar:
                print(f"  Похожие студенты:")
                for s in similar:
                    print(f"    - {s.first_name} {s.last_name}")

        await engine.dispose()

    sqlite_conn.close()


if __name__ == "__main__":
    asyncio.run(check_students())
