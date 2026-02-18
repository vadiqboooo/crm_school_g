"""
Скрипт для просмотра структуры school_new.db
"""
import sqlite3
import json

SQLITE_DB_PATH = "../school_new.db"

def inspect_database():
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()

    print("=" * 60)
    print("СПИСОК ВСЕХ ТАБЛИЦ В SCHOOL_NEW.DB")
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

    # Ищем таблицу subjects
    print("\n" + "=" * 60)
    print("ТАБЛИЦА SUBJECTS")
    print("=" * 60)

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%subject%'")
    subject_tables = cursor.fetchall()

    if subject_tables:
        for (table_name,) in subject_tables:
            print(f"\nТаблица: {table_name}")

            cursor.execute(f"PRAGMA table_info({table_name})")
            columns = cursor.fetchall()

            print("\nКолонки:")
            for col in columns:
                print(f"  {col[1]:30} {col[2]:15}")

            cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
            rows = cursor.fetchall()
            col_names = [col[1] for col in columns]

            print("\nПримеры данных:")
            for row in rows:
                print(f"\n  Запись:")
                for i, val in enumerate(row):
                    col_name = col_names[i]
                    # Для JSON полей пытаемся распарсить
                    if col_name in ['tasks', 'primary_to_secondary_scale', 'scale_markers', 'grade_scale', 'topics']:
                        print(f"    {col_name}:")
                        if val:
                            try:
                                data = json.loads(val)
                                print(f"      {json.dumps(data, ensure_ascii=False, indent=8)}")
                            except:
                                print(f"      {val}")
                        else:
                            print(f"      None")
                    else:
                        print(f"    {col_name:25}: {val}")
    else:
        print("\nТаблица subjects не найдена")

    conn.close()

if __name__ == "__main__":
    inspect_database()
