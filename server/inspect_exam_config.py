"""
Скрипт для просмотра конфигурации заданий и таблиц переводов в SQLite
"""
import sqlite3
import json

SQLITE_DB_PATH = "../school.db"

def inspect_exam_data():
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()

    print("=" * 60)
    print("ТАБЛИЦА PROBNIK")
    print("=" * 60)

    cursor.execute("PRAGMA table_info(probnik)")
    columns = cursor.fetchall()

    print("\nКолонки:")
    for col in columns:
        print(f"  {col[1]:30} {col[2]:15}")

    cursor.execute("SELECT * FROM probnik LIMIT 1")
    rows = cursor.fetchall()
    col_names = [col[1] for col in columns]

    print("\nДанные:")
    for row in rows:
        for i, val in enumerate(row):
            if col_names[i] in ['tasks_config', 'conversion_table', 'scale_markers', 'grade_scale', 'topics']:
                print(f"\n  {col_names[i]}:")
                if val:
                    try:
                        data = json.loads(val)
                        print(f"    {json.dumps(data, ensure_ascii=False, indent=6)}")
                    except:
                        print(f"    {val}")
                else:
                    print(f"    None")
            else:
                print(f"  {col_names[i]:30}: {val}")

    # Проверим exam таблицу
    print("\n\n" + "=" * 60)
    print("ТАБЛИЦА EXAM - Примеры")
    print("=" * 60)

    cursor.execute("PRAGMA table_info(exam)")
    exam_cols = cursor.fetchall()

    print("\nКолонки:")
    for col in exam_cols:
        print(f"  {col[1]:30} {col[2]:15}")

    cursor.execute("SELECT * FROM exam LIMIT 3")
    exam_rows = cursor.fetchall()
    exam_col_names = [col[1] for col in exam_cols]

    print("\nПримеры данных:")
    for row in exam_rows:
        print(f"\n  Экзамен ID {row[0]}:")
        for i, val in enumerate(row):
            if len(str(val)) > 100:
                print(f"    {exam_col_names[i]:25}: {str(val)[:100]}...")
            else:
                print(f"    {exam_col_names[i]:25}: {val}")

    conn.close()

if __name__ == "__main__":
    inspect_exam_data()
