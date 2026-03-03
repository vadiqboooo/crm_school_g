"""
Скрипт для удаления дубликатов в таблице group_student.
Оставляет только одну запись для каждой пары (group_id, student_id).
"""
import asyncio
import sys
from sqlalchemy import select, func
from app.database import async_session
from app.models.group import GroupStudent

# Настройка кодировки для Windows консоли
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')


async def fix_duplicates():
    """Находит и удаляет дубликаты в таблице group_student"""
    async with async_session() as db:
        # Находим все дубликаты
        result = await db.execute(
            select(
                GroupStudent.group_id,
                GroupStudent.student_id,
                func.count(GroupStudent.id).label("count")
            )
            .group_by(GroupStudent.group_id, GroupStudent.student_id)
            .having(func.count(GroupStudent.id) > 1)
        )

        duplicates = result.all()

        if not duplicates:
            print("[OK] Дубликатов не найдено!")
            return

        print(f"Найдено {len(duplicates)} групп с дубликатами:")

        total_deleted = 0

        for group_id, student_id, count in duplicates:
            print(f"\nГруппа: {group_id}, Студент: {student_id}, Записей: {count}")

            # Получаем все записи для этой пары
            entries_result = await db.execute(
                select(GroupStudent)
                .where(
                    GroupStudent.group_id == group_id,
                    GroupStudent.student_id == student_id
                )
                .order_by(GroupStudent.joined_at.asc())  # Сортируем по дате добавления
            )
            entries = entries_result.scalars().all()

            # Определяем, какую запись оставить
            # Приоритет: активная (is_archived=False) > самая старая
            active_entries = [e for e in entries if not e.is_archived]

            if active_entries:
                # Оставляем первую активную запись
                keep_entry = active_entries[0]
                print(f"  Оставляем активную запись ID: {keep_entry.id}")
            else:
                # Если все архивные, оставляем самую старую
                keep_entry = entries[0]
                print(f"  Оставляем самую старую запись ID: {keep_entry.id}")

            # Удаляем остальные
            for entry in entries:
                if entry.id != keep_entry.id:
                    print(f"  Удаляем дубликат ID: {entry.id} (is_archived={entry.is_archived})")
                    await db.delete(entry)
                    total_deleted += 1

        await db.commit()
        print(f"\n[OK] Удалено {total_deleted} дубликатов!")
        print("[OK] База данных очищена!")


if __name__ == "__main__":
    print("=== Исправление дубликатов в group_student ===\n")
    asyncio.run(fix_duplicates())
