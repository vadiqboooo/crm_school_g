"""
Скрипт миграции групп и связей студент-группа из SQLite в PostgreSQL
"""
import asyncio
import sqlite3
import json
from datetime import time
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, selectinload

from app.models.group import Group, GroupStudent
from app.models.subject import Subject
from app.models.employee import Employee
from app.models.student import Student
from app.config import settings


# SQLite путь
SQLITE_DB_PATH = "../school.db"


# Маппинг старых ID учителей на email (для поиска в новой базе)
# Будем искать по email, который был создан как username@crm-school.com
async def get_teacher_by_old_id(old_id: int, sqlite_conn, async_session: AsyncSession):
    """Получить учителя из PostgreSQL по старому ID из SQLite"""
    cursor = sqlite_conn.cursor()
    cursor.execute("SELECT username FROM employees WHERE id = ?", (old_id,))
    row = cursor.fetchone()

    if not row:
        return None

    username = row[0]
    email = f"{username}@crm-school.com"

    result = await async_session.execute(
        select(Employee).where(Employee.email == email)
    )
    return result.scalar_one_or_none()


async def get_subject_by_code(code: str, async_session: AsyncSession):
    """Получить предмет из PostgreSQL по коду"""
    result = await async_session.execute(
        select(Subject).where(Subject.code == code)
    )
    return result.scalar_one_or_none()


async def get_student_by_name(first_name: str, last_name: str, async_session: AsyncSession):
    """Получить студента из PostgreSQL по имени и фамилии"""
    result = await async_session.execute(
        select(Student).where(
            Student.first_name == first_name,
            Student.last_name == last_name
        )
    )
    return result.scalar_one_or_none()


async def migrate_groups(sqlite_conn, async_session: AsyncSession):
    """Миграция групп"""
    print("\n=== Миграция групп ===")

    cursor = sqlite_conn.cursor()

    # Получаем группы из SQLite
    cursor.execute("""
        SELECT id, name, school, exam_type, subject, schedule, teacher_id
        FROM study_group
        ORDER BY id
    """)

    groups = cursor.fetchall()
    print(f"Найдено групп в SQLite: {len(groups)}")

    migrated = 0
    skipped = 0
    group_mapping = {}  # Старый ID -> новый UUID

    for row in groups:
        old_group_id, name, school, exam_type, subject_code, schedule_json, teacher_id = row

        # Ищем предмет по коду
        subject = await get_subject_by_code(subject_code, async_session) if subject_code else None

        if not subject:
            print(f"  ПРОПУСК: Группа '{name}' - предмет '{subject_code}' не найден")
            skipped += 1
            continue

        # Ищем учителя
        teacher = await get_teacher_by_old_id(teacher_id, sqlite_conn, async_session) if teacher_id else None

        if not teacher:
            print(f"  ПРОПУСК: Группа '{name}' - учитель ID {teacher_id} не найден")
            skipped += 1
            continue

        # Парсим расписание
        schedule = json.loads(schedule_json) if schedule_json else {}

        # Извлекаем день и время из расписания (формат: {"thursday": "16:30-19:30"})
        schedule_day = None
        schedule_time = None
        schedule_duration = None

        if schedule:
            # Берем первый элемент
            for day, time_range in schedule.items():
                schedule_day = day
                if "-" in time_range:
                    parts = time_range.split("-")
                    # Преобразуем строку времени в объект time
                    try:
                        start_h, start_m = map(int, parts[0].split(":"))
                        schedule_time = time(start_h, start_m)
                        # Вычисляем длительность
                        end_h, end_m = map(int, parts[1].split(":"))
                        schedule_duration = (end_h * 60 + end_m) - (start_h * 60 + start_m)
                    except:
                        schedule_duration = 180  # По умолчанию 3 часа
                break

        # Создаем группу
        group = Group(
            name=name,
            subject_id=subject.id,
            teacher_id=teacher.id,
            schedule_day=schedule_day,
            schedule_time=schedule_time,
            schedule_duration=schedule_duration,
            school_location=school,
            description=None,
            comment=None,
        )

        async_session.add(group)
        await async_session.flush()  # Чтобы получить ID

        group_mapping[old_group_id] = group.id
        migrated += 1
        print(f"  + [{old_group_id:3}] {name:40} -> {subject.name} ({teacher.first_name} {teacher.last_name})")

    await async_session.commit()
    print(f"\nМигрировано групп: {migrated}")
    print(f"Пропущено: {skipped}")

    return group_mapping


async def migrate_group_students(sqlite_conn, async_session: AsyncSession, group_mapping: dict):
    """Миграция связей студент-группа"""
    print("\n=== Миграция студентов в группах ===")

    cursor = sqlite_conn.cursor()

    # Получаем связи группа-студент
    cursor.execute("""
        SELECT gs.group_id, s.fio
        FROM group_student gs
        JOIN student s ON gs.student_id = s.id
        ORDER BY gs.group_id, s.fio
    """)

    relations = cursor.fetchall()
    print(f"Найдено связей группа-студент в SQLite: {len(relations)}")

    added = 0
    skipped = 0

    # Получаем все группы из PostgreSQL с загрузкой студентов
    result = await async_session.execute(
        select(Group).options(selectinload(Group.students))
    )
    groups = {g.id: g for g in result.scalars().all()}

    not_found_students = set()

    for old_group_id, student_fio in relations:
        # Получаем новый ID группы
        new_group_id = group_mapping.get(old_group_id)
        if not new_group_id:
            skipped += 1
            continue

        group = groups.get(new_group_id)
        if not group:
            skipped += 1
            continue

        # Разбиваем ФИО на имя и фамилию
        parts = student_fio.strip().split()
        if len(parts) >= 2:
            # В SQLite формат: Фамилия Имя [Отчество]
            last_name = parts[0].strip()
            first_name = parts[1].strip()
        elif len(parts) == 1:
            last_name = parts[0].strip()
            first_name = parts[0].strip()
        else:
            skipped += 1
            continue

        # Ищем студента
        student = await get_student_by_name(first_name, last_name, async_session)
        if not student:
            if student_fio not in not_found_students:
                not_found_students.add(student_fio)
            skipped += 1
            continue

        # Создаем запись связи группа-студент
        group_student = GroupStudent(
            group_id=group.id,
            student_id=student.id,
            is_archived=False
        )
        async_session.add(group_student)
        added += 1

    if not_found_students:
        print(f"\n  Не найдено студентов (первые 10):")
        for fio in list(not_found_students)[:10]:
            print(f"    - {fio}")

    await async_session.commit()
    print(f"\nДобавлено связей студент-группа: {added}")
    print(f"Пропущено: {skipped}")


async def main():
    print("=" * 60)
    print("МИГРАЦИЯ ГРУПП И СТУДЕНТОВ ИЗ SQLITE В POSTGRESQL")
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
            # Миграция групп
            group_mapping = await migrate_groups(sqlite_conn, session)

            # Миграция студентов в группах
            await migrate_group_students(sqlite_conn, session, group_mapping)

            print("\n" + "=" * 60)
            print("МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!")
            print("=" * 60)

        except Exception as e:
            print(f"\nОШИБКА: {e}")
            import traceback
            traceback.print_exc()
            await session.rollback()
        finally:
            sqlite_conn.close()
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
