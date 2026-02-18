import asyncio
from sqlalchemy import select
from app.database import async_session
from app.models.exam import Exam
from app.models.group import Group
from app.models.subject import Subject

async def fill_exam_subjects():
    async with async_session() as db:
        # Get all exams without subject_id
        result = await db.execute(
            select(Exam).where(Exam.subject_id == None)
        )
        exams = result.scalars().all()

        print(f"Found {len(exams)} exams without subject_id")

        updated = 0
        for exam in exams:
            subject_id = None

            # Try to get subject_id from group
            if exam.group_id:
                group_result = await db.execute(
                    select(Group).where(Group.id == exam.group_id)
                )
                group = group_result.scalar_one_or_none()
                if group and group.subject_id:
                    subject_id = group.subject_id
                    print(f"Exam '{exam.title}' - using group subject_id")
                elif group and group.subject:
                    # Try to find subject by name from group
                    subject_result = await db.execute(
                        select(Subject).where(Subject.name == group.subject)
                    )
                    subjects = subject_result.scalars().all()
                    if len(subjects) == 1:
                        subject_id = subjects[0].id
                        print(f"Exam '{exam.title}' - found subject by group.subject name")
                    elif len(subjects) > 1:
                        # Multiple subjects with same name, try to match by exam type
                        for subj in subjects:
                            if subj.exam_type and group.level and subj.exam_type in group.level:
                                subject_id = subj.id
                                print(f"Exam '{exam.title}' - matched by exam type")
                                break
                        if not subject_id:
                            subject_id = subjects[0].id
                            print(f"Exam '{exam.title}' - using first subject from multiple matches")

            # If still no subject_id, try to find by exam.subject name
            if not subject_id and exam.subject:
                subject_result = await db.execute(
                    select(Subject).where(Subject.name == exam.subject)
                )
                subjects = subject_result.scalars().all()
                if len(subjects) == 1:
                    subject_id = subjects[0].id
                    print(f"Exam '{exam.title}' - found subject by exam.subject name")
                elif len(subjects) > 1:
                    # Try to match by exam title containing ОГЭ or ЕГЭ
                    exam_title_upper = exam.title.upper()
                    for subj in subjects:
                        if subj.exam_type:
                            if subj.exam_type in exam_title_upper:
                                subject_id = subj.id
                                print(f"Exam '{exam.title}' - matched by title keyword")
                                break
                    if not subject_id:
                        subject_id = subjects[0].id
                        print(f"Exam '{exam.title}' - using first subject from multiple matches")

            if subject_id:
                exam.subject_id = subject_id
                updated += 1
            else:
                print(f"WARNING: Could not find subject for exam '{exam.title}' (subject: {exam.subject})")

        await db.commit()
        print(f"\nUpdated {updated} exams with subject_id")

if __name__ == "__main__":
    asyncio.run(fill_exam_subjects())
