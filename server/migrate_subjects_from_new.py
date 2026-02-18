"""
Скрипт миграции предметов с конфигурациями из school_new.db в PostgreSQL
"""
import asyncio
import sqlite3
import json
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.subject import Subject
from app.config import settings


# SQLite путь
SQLITE_DB_PATH = "../school_new.db"


# Маппинг цветов для предметов
COLOR_MAPPING = {
    "rus": "#eab308",
    "rus_9": "#eab308",
    "math_profile": "#dc2626",
    "math_base": "#ef4444",
    "math_9": "#ef4444",
    "phys": "#06b6d4",
    "phys_9": "#06b6d4",
    "infa": "#8b5cf6",
    "infa_9": "#8b5cf6",
    "bio": "#22c55e",
    "bio_9": "#22c55e",
    "chem": "#ec4899",
    "hist": "#f59e0b",
    "soc": "#10b981",
    "soc_9": "#10b981",
    "eng": "#3b82f6",
    "geo_9": "#14b8a6",
}


async def migrate_subjects(sqlite_conn, async_session: AsyncSession):
    """Миграция предметов с конфигурациями"""
    print("\n=== Миграция предметов с конфигурациями ===")

    cursor = sqlite_conn.cursor()

    # Получаем предметы из SQLite
    cursor.execute("""
        SELECT
            id, code, name, exam_type, tasks_count, max_per_task,
            primary_to_secondary_scale, special_config, topics,
            is_active, grade_scale
        FROM subjects
        ORDER BY code
    """)

    subjects = cursor.fetchall()
    print(f"Найдено предметов в SQLite: {len(subjects)}")

    migrated = 0
    updated = 0
    skipped = 0

    for row in subjects:
        (
            subj_id, code, name, exam_type, tasks_count, max_per_task_json,
            primary_scale_json, special_config_json, topics_json,
            is_active, grade_scale_json
        ) = row

        # Парсим JSON поля
        max_per_task = json.loads(max_per_task_json) if max_per_task_json else None
        primary_scale = json.loads(primary_scale_json) if primary_scale_json else None
        topics = json.loads(topics_json) if topics_json else None
        grade_scale = json.loads(grade_scale_json) if grade_scale_json else None

        # Преобразуем max_per_task в tasks (TaskConfig[])
        tasks = None
        if max_per_task and tasks_count:
            tasks = []
            for i, max_score in enumerate(max_per_task, start=1):
                tasks.append({
                    "label": str(i),
                    "maxScore": max_score
                })

        # Получаем цвет из маппинга
        color = COLOR_MAPPING.get(code)

        # Проверяем, существует ли уже предмет с таким кодом
        result = await async_session.execute(
            select(Subject).where(Subject.code == code)
        )
        existing = result.scalar_one_or_none()

        if existing:
            # Обновляем существующий предмет (не меняем name, чтобы избежать конфликтов)
            existing.exam_type = exam_type
            existing.tasks = tasks
            existing.primary_to_secondary_scale = primary_scale
            existing.topics = topics
            existing.grade_scale = grade_scale
            existing.is_active = bool(is_active)
            if color:
                existing.color = color

            updated += 1
            print(f"  ~ {code:15} -> {existing.name:35} (обновлен, {tasks_count} заданий)")
        else:
            # Создаем новый предмет
            # Добавляем тип экзамена к названию, если его там нет
            full_name = name
            if exam_type and f"({exam_type})" not in name:
                full_name = f"{name} ({exam_type})"

            subject = Subject(
                code=code,
                name=full_name,
                exam_type=exam_type,
                color=color,
                is_active=bool(is_active),
                tasks=tasks,
                primary_to_secondary_scale=primary_scale,
                topics=topics,
                grade_scale=grade_scale,
            )

            async_session.add(subject)
            migrated += 1
            print(f"  + {code:15} -> {full_name:35} ({tasks_count} заданий)")

    await async_session.commit()
    print(f"\nМигрировано новых предметов: {migrated}")
    print(f"Обновлено существующих: {updated}")
    print(f"Пропущено: {skipped}")


async def main():
    print("=" * 60)
    print("МИГРАЦИЯ ПРЕДМЕТОВ С КОНФИГУРАЦИЯМИ")
    print("ИЗ SCHOOL_NEW.DB В POSTGRESQL")
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
            # Миграция предметов
            await migrate_subjects(sqlite_conn, session)

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
