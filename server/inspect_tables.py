"""
Скрипт для просмотра структуры таблиц exam_types и study_group
"""
import sqlite3

SQLITE_DB_PATH = "../school.db"

def inspect_table(cursor, table_name):
    print("=" * 60)
    print(f"ТАБЛИЦА: {table_name.upper()}")
    print("=" * 60)

    # Структура
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = cursor.fetchall()

    print("\nКолонки:")
    for col in columns:
        print(f"  {col[1]:20} {col[2]:15} NULL: {col[3] == 0}")

    # Данные
    cursor.execute(f"SELECT * FROM {table_name} LIMIT 10")
    rows = cursor.fetchall()
    col_names = [col[1] for col in columns]

    print(f"\nПримеры данных (первые 10):")
    for row in rows:
        print(f"\n  Запись:")
        for i, val in enumerate(row):
            print(f"    {col_names[i]:20}: {val}")

def main():
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()

    inspect_table(cursor, "exam_types")
    print("\n\n")
    inspect_table(cursor, "study_group")

    conn.close()

if __name__ == "__main__":
    main()
