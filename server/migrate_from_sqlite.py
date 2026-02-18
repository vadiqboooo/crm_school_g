"""
Скрипт миграции данных из SQLite в PostgreSQL
Переносит учителей (employees) и студентов (students)
"""
import asyncio
import sqlite3
import re
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models.employee import Employee
from app.models.student import Student, ParentContact
from app.auth.security import hash_password
from app.config import settings


# SQLite путь
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


async def migrate_employees(sqlite_conn, async_session: AsyncSession):
    """Миграция учителей/сотрудников"""
    print("\n=== Миграция сотрудников ===")

    cursor = sqlite_conn.cursor()

    # Получаем данные из SQLite
    # Структура: id, username, password_hash, role, teacher_name
    cursor.execute("""
        SELECT id, username, password_hash, role, teacher_name
        FROM employees
    """)

    employees = cursor.fetchall()
    print(f"Найдено сотрудников в SQLite: {len(employees)}")

    migrated = 0
    skipped = 0

    for row in employees:
        emp_id, username, password_hash, role, teacher_name = row

        # Создаем email из username
        email = f"{username}@crm-school.com"

        # Разбиваем teacher_name на first_name и last_name
        first_name, last_name = split_full_name(teacher_name)

        # Проверяем, существует ли уже сотрудник
        result = await async_session.execute(
            select(Employee).where(Employee.email == email)
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"  Пропуск: {email} (уже существует)")
            skipped += 1
            continue

        # Создаем нового сотрудника
        employee = Employee(
            email=email,
            hashed_password=password_hash,
            first_name=first_name,
            last_name=last_name,
            phone=None,
            role=role if role in ['admin', 'teacher', 'manager'] else 'teacher',
            is_active=True,
        )

        async_session.add(employee)
        migrated += 1
        print(f"  + {teacher_name} -> {first_name} {last_name} ({email})")

    await async_session.commit()
    print(f"\nМигрировано сотрудников: {migrated}")
    print(f"Пропущено (уже существуют): {skipped}")


async def migrate_students(sqlite_conn, async_session: AsyncSession):
    """Миграция студентов"""
    print("\n=== Миграция студентов ===")

    cursor = sqlite_conn.cursor()

    # Получаем данные из SQLite
    # Структура: id, fio, phone, admin_comment, parent_contact_status, user_id, class_num, confirmed_at
    cursor.execute("""
        SELECT id, fio, phone, admin_comment, user_id, class_num
        FROM student
    """)

    students = cursor.fetchall()
    print(f"Найдено студентов в SQLite: {len(students)}")

    migrated = 0
    skipped = 0
    updated = 0

    for row in students:
        student_id, fio, phone, admin_comment, user_id, class_num = row

        # Разбиваем ФИО на first_name и last_name
        first_name, last_name = split_full_name(fio)

        # Проверяем, существует ли студент (по имени и фамилии)
        result = await async_session.execute(
            select(Student).where(
                Student.first_name == first_name,
                Student.last_name == last_name
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            # Обновляем существующего студента (telegram_id и class_number)
            if user_id and not existing.telegram_id:
                existing.telegram_id = str(user_id)
            if class_num and not existing.class_number:
                existing.class_number = class_num
            print(f"  Обновление: {fio} (telegram_id: {user_id or 'н/д'}, класс: {class_num or 'н/д'})")
            updated += 1
            continue

        # Формируем информацию о школе из класса
        current_school = None
        if class_num:
            current_school = f"{class_num} класс"

        # Telegram ID из user_id
        telegram_id = str(user_id) if user_id else None

        # Создаем нового студента
        student = Student(
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            telegram_id=telegram_id,
            current_school=current_school,
            class_number=class_num,
            status='active',
        )

        async_session.add(student)
        migrated += 1
        print(f"  + {fio} -> {first_name} {last_name} (telegram_id: {telegram_id or 'н/д'}, класс: {class_num or 'н/д'})")

    await async_session.commit()
    print(f"\nМигрировано студентов: {migrated}")
    print(f"Обновлено существующих: {updated}")
    print(f"Пропущено: {skipped}")


async def main():
    print("=" * 60)
    print("МИГРАЦИЯ ДАННЫХ ИЗ SQLITE В POSTGRESQL")
    print("=" * 60)

    # Подключение к SQLite
    print(f"\nПодключение к SQLite: {SQLITE_DB_PATH}")
    sqlite_conn = sqlite3.connect(SQLITE_DB_PATH)

    # Подключение к PostgreSQL
    print(f"Подключение к PostgreSQL: {settings.DATABASE_URL}")
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session_maker = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session_maker() as session:
        try:
            # Миграция сотрудников
            await migrate_employees(sqlite_conn, session)

            # Миграция студентов
            await migrate_students(sqlite_conn, session)

            print("\n" + "=" * 60)
            print("МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!")
            print("=" * 60)

        except Exception as e:
            print(f"\nOSHIBKA: {e}")
            import traceback
            traceback.print_exc()
            await session.rollback()
        finally:
            sqlite_conn.close()
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
