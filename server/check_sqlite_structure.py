"""
Скрипт для проверки структуры таблиц в SQLite базе данных
"""
import sqlite3

SQLITE_DB_PATH = "../school.db"

def check_structure():
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()

    # Получаем список таблиц
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()

    print("=" * 60)
    print("СТРУКТУРА БАЗЫ ДАННЫХ SQLITE")
    print("=" * 60)
    print(f"\nТаблицы: {len(tables)}")

    for table in tables:
        table_name = table[0]
        print(f"\n{'=' * 60}")
        print(f"Таблица: {table_name}")
        print('=' * 60)

        # Получаем структуру таблицы
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()

        print("\nКолонки:")
        for col in columns:
            col_id, name, col_type, not_null, default, pk = col
            pk_str = " [PK]" if pk else ""
            null_str = " NOT NULL" if not_null else ""
            default_str = f" DEFAULT {default}" if default else ""
            print(f"  {name}: {col_type}{pk_str}{null_str}{default_str}")

        # Получаем количество записей
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cursor.fetchone()[0]
        print(f"\nКоличество записей: {count}")

        # Показываем первые несколько записей для важных таблиц
        if table_name in ['employees', 'students', 'parent_contacts'] and count > 0:
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 3")
            rows = cursor.fetchall()
            print(f"\nПримеры записей (первые {len(rows)}):")
            for i, row in enumerate(rows, 1):
                print(f"  {i}. {row}")

    conn.close()
    print("\n" + "=" * 60)

if __name__ == "__main__":
    check_structure()
