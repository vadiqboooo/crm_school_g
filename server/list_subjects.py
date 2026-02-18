"""
Скрипт для просмотра уникальных предметов из study_group
"""
import sqlite3

SQLITE_DB_PATH = "../school.db"

def list_subjects():
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cursor = conn.cursor()

    print("=" * 60)
    print("УНИКАЛЬНЫЕ ПРЕДМЕТЫ ИЗ STUDY_GROUP")
    print("=" * 60)

    # Получаем уникальные предметы
    cursor.execute("""
        SELECT DISTINCT subject, exam_type, COUNT(*) as group_count
        FROM study_group
        WHERE subject IS NOT NULL
        GROUP BY subject, exam_type
        ORDER BY subject, exam_type
    """)

    subjects = cursor.fetchall()

    print(f"\nВсего уникальных комбинаций предмет+тип: {len(subjects)}")
    print("\nПредметы и типы экзаменов:")
    for subj, exam_type, count in subjects:
        print(f"  {subj:20} {exam_type or 'Не указан':10} ({count} групп)")

    # Получаем только уникальные предметы
    cursor.execute("""
        SELECT DISTINCT subject
        FROM study_group
        WHERE subject IS NOT NULL
        ORDER BY subject
    """)

    unique_subjects = cursor.fetchall()
    print(f"\n\nУникальные предметы (всего {len(unique_subjects)}):")
    for (subj,) in unique_subjects:
        print(f"  - {subj}")

    conn.close()

if __name__ == "__main__":
    list_subjects()
