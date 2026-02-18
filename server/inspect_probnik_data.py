import sqlite3
import json
import os

# Use absolute path
db_path = os.path.join(os.path.dirname(__file__), '..', 'school.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=" * 80)
print("СТРУКТУРА ТАБЛИЦ")
print("=" * 80)

# Study group structure
cursor.execute('PRAGMA table_info(study_group)')
print("\nStudy Group columns:")
for row in cursor.fetchall():
    print(f"  {row[1]} ({row[2]})")

# Exam types
cursor.execute('PRAGMA table_info(exam_types)')
print("\nExam Types columns:")
for row in cursor.fetchall():
    print(f"  {row[1]} ({row[2]})")

print("\n" + "=" * 80)
print("ПРИМЕРЫ ДАННЫХ")
print("=" * 80)

# Sample exam data
print("\nПримеры из exam (первые 5):")
cursor.execute('SELECT * FROM exam LIMIT 5')
for row in cursor.fetchall():
    print(f"  ID: {row[0]}, Student: {row[1]}, Subject: {row[2]}, Type: {row[5]}")
    if row[3]:  # answer
        answers = row[3][:50] + "..." if len(row[3]) > 50 else row[3]
        print(f"    Answers: {answers}")
    if row[4]:  # comment
        print(f"    Comment: {row[4][:50]}")

# Sample exam_registration data
print("\nПримеры из exam_registration (первые 5):")
cursor.execute('SELECT * FROM exam_registration LIMIT 5')
for row in cursor.fetchall():
    print(f"  ID: {row[0]}, Student: {row[1]}, Subject: {row[2]}, Date: {row[3]}, Time: {row[4]}")
    print(f"    School: {row[8]}, Attended: {row[9]}, Submitted: {row[10]}, Probnik: {row[11]}")

# Exam types
print("\nТипы экзаменов:")
cursor.execute('SELECT * FROM exam_types')
for row in cursor.fetchall():
    print(f"  ID: {row[0]}, Name: {row[1] if len(row) > 1 else 'N/A'}")

# Study groups
print("\nГруппы (первые 5):")
cursor.execute('SELECT * FROM study_group LIMIT 5')
for row in cursor.fetchall():
    print(f"  {row}")

print("\n" + "=" * 80)
print("СТАТИСТИКА")
print("=" * 80)

# Count exams by type
cursor.execute('SELECT exam_type_id, COUNT(*) FROM exam GROUP BY exam_type_id')
print("\nРезультаты экзаменов по типам:")
for row in cursor.fetchall():
    print(f"  Type {row[0]}: {row[1]} записей")

# Count exams by subject
cursor.execute('SELECT subject, COUNT(*) FROM exam GROUP BY subject')
print("\nРезультаты экзаменов по предметам:")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]} записей")

# Check if there's a link between students and groups
cursor.execute('SELECT COUNT(*) FROM group_student')
group_students_count = cursor.fetchone()[0]
print(f"\nВсего связей студент-группа: {group_students_count}")

# Check for students with exam results
cursor.execute('''
    SELECT COUNT(DISTINCT e.id_student)
    FROM exam e
''')
students_with_results = cursor.fetchone()[0]
print(f"Студентов с результатами экзаменов: {students_with_results}")

# Check for students in groups with exam results
cursor.execute('''
    SELECT COUNT(DISTINCT e.id_student)
    FROM exam e
    INNER JOIN group_student gs ON e.id_student = gs.student_id
''')
students_in_groups_with_results = cursor.fetchone()[0]
print(f"Студентов в группах с результатами: {students_in_groups_with_results}")

# Students with results but not in groups
print(f"Студентов с результатами, но не в группах: {students_with_results - students_in_groups_with_results}")

conn.close()
print("\nГотово!")
