"""
Скрипт для просмотра структуры и данных таблицы subjects в SQLite
"""
import sqlite3

SQLITE_DB_PATH = "../school.db"

def inspect_subjects():
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()

    print("=" * 60)
    print("СПИСОК ВСЕХ ТАБЛИЦ В БАЗЕ")
    print("=" * 60)

    # Получаем список всех таблиц
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()

    print("\nТаблицы в базе:")
    for table in tables:
        print(f"  - {table[0]}")

        # Показываем количество записей
        cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
        count = cursor.fetchone()[0]
        print(f"    Записей: {count}")

    # Если есть таблица subjects, покажем её структуру
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='subjects'")
    if cursor.fetchone():
        print("\n" + "=" * 60)
        print("СТРУКТУРА ТАБЛИЦЫ SUBJECTS")
        print("=" * 60)

        cursor.execute("PRAGMA table_info(subjects)")
        columns = cursor.fetchall()

        print("\nКолонки:")
        for col in columns:
            print(f"  {col[1]} ({col[2]}) - NULL: {col[3] == 0}")

        cursor.execute("SELECT * FROM subjects LIMIT 5")
        rows = cursor.fetchall()

        print("\nПримеры данных (первые 5):")
        for row in rows:
            print(f"  {row}")
    else:
        print("\n! Таблица 'subjects' не найдена в базе данных")

    conn.close()

if __name__ == "__main__":
    inspect_subjects()
