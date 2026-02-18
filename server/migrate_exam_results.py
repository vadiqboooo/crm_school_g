"""
Скрипт миграции результатов пробников из school.db в новую PostgreSQL базу данных.
"""
import asyncio
import sqlite3
import os
import json
from datetime import datetime
from uuid import UUID
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

from app.database import Base
from app.models.student import Student
from app.models.group import Group
from app.models.employee import Employee
from app.models.exam import Exam, ExamResult
from app.models.subject import Subject

# Load environment variables
load_dotenv()

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL")

# Mapping предметов из старой БД в новую
SUBJECT_MAPPING = {
    'rus': 'Русский язык',
    'rus_9': 'Русский язык',
    'math_profile': 'Математика (профиль)',
    'math_base': 'Математика (база)',
    'math_9': 'Математика',
    'phys': 'Физика',
    'phys_9': 'Физика',
    'infa': 'Информатика',
    'infa_9': 'Информатика',
    'bio': 'Биология',
    'bio_9': 'Биология',
    'chem_9': 'Химия',
    'hist': 'История',
    'soc': 'Обществознание',
    'soc_9': 'Обществознание',
    'eng': 'Английский язык',
    'geo_9': 'География',
}


def parse_answers(answer_string):
    """Парсит строку ответов в список"""
    if not answer_string:
        return []

    # Разделяем по запятым
    parts = answer_string.split(',')
    result = []

    for part in parts:
        part = part.strip()
        if part == '-' or part == '':
            result.append(None)
        else:
            try:
                result.append(int(part))
            except ValueError:
                # Если не число, пытаемся как float
                try:
                    result.append(float(part))
                except ValueError:
                    result.append(None)

    return result


def calculate_primary_score(answers):
    """Вычисляет первичный балл (сумма правильных ответов)"""
    if not answers:
        return 0

    score = 0
    for answer in answers:
        if answer is not None and answer > 0:
            score += answer

    return score


async def migrate_exam_results():
    """Основная функция миграции"""

    # Подключаемся к старой БД
    old_db_path = os.path.join(os.path.dirname(__file__), '..', 'school.db')
    old_conn = sqlite3.connect(old_db_path)
    old_cursor = old_conn.cursor()

    # Подключаемся к новой БД
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print("=" * 80)
    print("МИГРАЦИЯ РЕЗУЛЬТАТОВ ПРОБНИКОВ")
    print("=" * 80)

    async with async_session() as session:
        # Получаем маппинг старых ID студентов на новые UUID
        print("\n1. Загрузка маппинга студентов...")
        result = await session.execute(select(Student))
        students = result.scalars().all()

        # Создаем словарь: фамилия_имя -> UUID
        student_mapping = {}
        for student in students:
            key = f"{student.last_name.lower().strip()}_{student.first_name.lower().strip()}"
            student_mapping[key] = student.id

        print(f"   Найдено {len(students)} студентов в новой БД")

        # Получаем маппинг старых ID студентов
        old_cursor.execute("SELECT id, fio FROM student")
        old_students = old_cursor.fetchall()

        old_to_new_student = {}
        not_found_students = []

        for old_id, fio in old_students:
            # Парсим ФИО: "Фамилия Имя" или "Фамилия Имя Отчество"
            if not fio:
                not_found_students.append((old_id, fio))
                continue

            parts = fio.strip().split()
            if len(parts) >= 2:
                last_name = parts[0].lower().strip()
                first_name = parts[1].lower().strip()
                key = f"{last_name}_{first_name}"

                if key in student_mapping:
                    old_to_new_student[old_id] = student_mapping[key]
                else:
                    not_found_students.append((old_id, fio))
            else:
                not_found_students.append((old_id, fio))

        print(f"   Сопоставлено {len(old_to_new_student)} студентов")
        if not_found_students:
            print(f"   [!] Не найдено {len(not_found_students)} студентов:")
            for old_id, fio in not_found_students[:10]:
                print(f"      - {fio} (ID: {old_id})")
            if len(not_found_students) > 10:
                print(f"      ... и еще {len(not_found_students) - 10}")

        # Получаем маппинг групп
        print("\n2. Загрузка маппинга групп...")
        result = await session.execute(select(Group))
        groups = result.scalars().all()

        group_mapping = {}  # old_group_id -> new_group
        for group in groups:
            group_mapping[group.name] = group

        # Загружаем старые группы
        old_cursor.execute("SELECT id, name, teacher_id FROM study_group")
        old_groups = old_cursor.fetchall()

        old_group_to_new = {}
        old_group_to_teacher = {}

        for old_group_id, name, teacher_id in old_groups:
            old_group_to_teacher[old_group_id] = teacher_id
            if name in group_mapping:
                old_group_to_new[old_group_id] = group_mapping[name]

        print(f"   Сопоставлено {len(old_group_to_new)} групп")

        # Получаем маппинг учителей
        print("\n3. Загрузка маппинга учителей...")
        result = await session.execute(select(Employee))
        employees = result.scalars().all()

        employee_mapping = {}
        for emp in employees:
            key = f"{emp.last_name.lower().strip()}_{emp.first_name.lower().strip()}"
            employee_mapping[key] = emp.id

        # Загружаем старых учителей
        old_cursor.execute("SELECT id, teacher_name FROM employees WHERE teacher_name IS NOT NULL")
        old_employees = old_cursor.fetchall()

        old_to_new_employee = {}
        for old_id, teacher_name in old_employees:
            if not teacher_name:
                continue

            # Парсим имя: "Фамилия Имя" или "Фамилия Имя Отчество"
            parts = teacher_name.strip().split()
            if len(parts) >= 2:
                last_name = parts[0].lower().strip()
                first_name = parts[1].lower().strip()
                key = f"{last_name}_{first_name}"

                if key in employee_mapping:
                    old_to_new_employee[old_id] = employee_mapping[key]

        print(f"   Сопоставлено {len(old_to_new_employee)} учителей")

        # Получаем предметы
        print("\n4. Загрузка предметов...")
        result = await session.execute(select(Subject))
        subjects = result.scalars().all()
        subject_by_name = {s.name: s for s in subjects}

        # Загружаем exam_types (это будут наши Exams)
        print("\n5. Миграция экзаменов (exam_types)...")
        old_cursor.execute("""
            SELECT id, name, group_id, completed_tasks
            FROM exam_types
        """)
        exam_types = old_cursor.fetchall()

        exam_type_to_new_exam = {}
        exams_created = 0
        exams_skipped = 0

        for old_exam_type_id, name, group_id, completed_tasks_json in exam_types:
            # Парсим название экзамена
            # Например: "Русский язык 9" -> subject: "Русский язык", is для 9 класса

            # Определяем group_id для нового экзамена
            new_group_id = None
            created_by = None

            if group_id and group_id in old_group_to_new:
                new_group = old_group_to_new[group_id]
                new_group_id = new_group.id
                created_by = new_group.teacher_id
            elif group_id and group_id in old_group_to_teacher:
                # Группа не найдена, но есть учитель
                old_teacher_id = old_group_to_teacher[group_id]
                if old_teacher_id in old_to_new_employee:
                    created_by = old_to_new_employee[old_teacher_id]

            # Парсим completed_tasks
            selected_tasks = None
            if completed_tasks_json:
                try:
                    tasks_data = json.loads(completed_tasks_json)
                    if isinstance(tasks_data, list):
                        selected_tasks = tasks_data
                except:
                    pass

            # Создаем экзамен
            exam = Exam(
                group_id=new_group_id,
                title=name,
                subject=None,  # Определим из результатов
                date=None,
                is_template=False,
                selected_tasks=selected_tasks,
                created_by=created_by,
                created_at=datetime.utcnow()
            )

            session.add(exam)
            exam_type_to_new_exam[old_exam_type_id] = exam
            exams_created += 1

        await session.commit()
        print(f"   Создано {exams_created} экзаменов")

        # Загружаем результаты экзаменов (exam)
        print("\n6. Миграция результатов экзаменов...")
        old_cursor.execute("""
            SELECT id, id_student, subject, answer, comment, exam_type_id
            FROM exam
        """)
        exam_results_data = old_cursor.fetchall()

        results_created = 0
        results_skipped = 0
        skipped_reasons = {
            'student_not_found': 0,
            'exam_type_not_found': 0,
            'other': 0
        }

        for old_exam_id, old_student_id, subject, answer, comment, exam_type_id in exam_results_data:
            # Проверяем, есть ли студент
            if old_student_id not in old_to_new_student:
                results_skipped += 1
                skipped_reasons['student_not_found'] += 1
                continue

            # Проверяем, есть ли exam_type
            if exam_type_id not in exam_type_to_new_exam:
                results_skipped += 1
                skipped_reasons['exam_type_not_found'] += 1
                continue

            new_student_id = old_to_new_student[old_student_id]
            new_exam = exam_type_to_new_exam[exam_type_id]

            # Обновляем subject в экзамене, если еще не установлен
            if not new_exam.subject and subject:
                new_exam.subject = SUBJECT_MAPPING.get(subject, subject)

            # Парсим ответы
            answers = parse_answers(answer)

            # Вычисляем баллы
            primary_score = calculate_primary_score(answers)
            final_score = float(primary_score)  # Можно добавить конвертацию

            # Определяем added_by
            added_by = new_exam.created_by

            # Создаем результат
            exam_result = ExamResult(
                exam_id=new_exam.id,
                student_id=new_student_id,
                primary_score=primary_score,
                final_score=final_score,
                answers=answers,
                task_comments=None,
                student_comment=comment if comment else None,
                added_by=added_by,
                added_at=datetime.utcnow()
            )

            session.add(exam_result)
            results_created += 1

            # Коммитим каждые 100 результатов
            if results_created % 100 == 0:
                await session.commit()
                print(f"   Обработано {results_created} результатов...")

        await session.commit()

        print(f"\n   Создано {results_created} результатов")
        print(f"   Пропущено {results_skipped} результатов:")
        print(f"      - Студент не найден: {skipped_reasons['student_not_found']}")
        print(f"      - Экзамен не найден: {skipped_reasons['exam_type_not_found']}")
        print(f"      - Другие причины: {skipped_reasons['other']}")

    old_conn.close()
    await engine.dispose()

    print("\n" + "=" * 80)
    print("МИГРАЦИЯ ЗАВЕРШЕНА УСПЕШНО!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(migrate_exam_results())
