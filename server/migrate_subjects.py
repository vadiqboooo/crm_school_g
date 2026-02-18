"""
Скрипт миграции предметов из SQLite в PostgreSQL
"""
import asyncio
import sqlite3
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.subject import Subject
from app.config import settings


# SQLite путь
SQLITE_DB_PATH = "../school.db"


# Маппинг кодов предметов на полные названия и типы
SUBJECT_MAPPING = {
    "bio": {"name": "Биология (ЕГЭ)", "exam_type": "ЕГЭ", "color": "#22c55e"},
    "bio_9": {"name": "Биология (ОГЭ)", "exam_type": "ОГЭ", "color": "#22c55e"},
    "chem": {"name": "Химия (ЕГЭ)", "exam_type": "ЕГЭ", "color": "#ec4899"},
    "eng": {"name": "Английский язык (ЕГЭ)", "exam_type": "ЕГЭ", "color": "#3b82f6"},
    "geo_9": {"name": "География (ОГЭ)", "exam_type": "ОГЭ", "color": "#14b8a6"},
    "hist": {"name": "История (ЕГЭ)", "exam_type": "ЕГЭ", "color": "#f59e0b"},
    "infa": {"name": "Информатика (ЕГЭ)", "exam_type": "ЕГЭ", "color": "#8b5cf6"},
    "infa_9": {"name": "Информатика (ОГЭ)", "exam_type": "ОГЭ", "color": "#8b5cf6"},
    "math_9": {"name": "Математика (ОГЭ)", "exam_type": "ОГЭ", "color": "#ef4444"},
    "math_base": {"name": "Математика базовая (ЕГЭ)", "exam_type": "ЕГЭ", "color": "#ef4444"},
    "math_profile": {"name": "Математика профильная (ЕГЭ)", "exam_type": "ЕГЭ", "color": "#dc2626"},
    "phys": {"name": "Физика (ЕГЭ)", "exam_type": "ЕГЭ", "color": "#06b6d4"},
    "phys_9": {"name": "Физика (ОГЭ)", "exam_type": "ОГЭ", "color": "#06b6d4"},
    "rus": {"name": "Русский язык (ЕГЭ)", "exam_type": "ЕГЭ", "color": "#eab308"},
    "rus_9": {"name": "Русский язык (ОГЭ)", "exam_type": "ОГЭ", "color": "#eab308"},
    "soc": {"name": "Обществознание (ЕГЭ)", "exam_type": "ЕГЭ", "color": "#10b981"},
    "soc_9": {"name": "Обществознание (ОГЭ)", "exam_type": "ОГЭ", "color": "#10b981"},
}


async def migrate_subjects(sqlite_conn, async_session: AsyncSession):
    """Миграция предметов"""
    print("\n=== Миграция предметов ===")

    cursor = sqlite_conn.cursor()

    # Получаем уникальные предметы из SQLite
    cursor.execute("""
        SELECT DISTINCT subject
        FROM study_group
        WHERE subject IS NOT NULL
        ORDER BY subject
    """)

    subjects = cursor.fetchall()
    print(f"Найдено уникальных предметов в SQLite: {len(subjects)}")

    migrated = 0
    skipped = 0

    for (subject_code,) in subjects:
        if subject_code not in SUBJECT_MAPPING:
            print(f"  ВНИМАНИЕ: Предмет '{subject_code}' не найден в маппинге, пропускаем")
            skipped += 1
            continue

        mapping = SUBJECT_MAPPING[subject_code]

        # Проверяем, существует ли уже предмет с таким кодом
        result = await async_session.execute(
            select(Subject).where(Subject.code == subject_code)
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"  Пропуск: {subject_code} -> {mapping['name']} (уже существует)")
            skipped += 1
            continue

        # Создаем новый предмет
        subject = Subject(
            name=mapping["name"],
            code=subject_code,
            exam_type=mapping["exam_type"],
            color=mapping.get("color"),
            is_active=True,
        )

        async_session.add(subject)
        migrated += 1
        print(f"  + {subject_code:15} -> {mapping['name']:25} ({mapping['exam_type']})")

    await async_session.commit()
    print(f"\nМигрировано предметов: {migrated}")
    print(f"Пропущено (уже существуют): {skipped}")


async def main():
    print("=" * 60)
    print("МИГРАЦИЯ ПРЕДМЕТОВ ИЗ SQLITE В POSTGRESQL")
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
