"""
Migrate existing exams to link them with subjects via subject_id
"""
import asyncio
from sqlalchemy import select, update
from app.database import async_session
from app.models.exam import Exam
from app.models.subject import Subject


async def migrate_exam_subjects():
    """Update all exams to have subject_id based on their subject name"""
    async with async_session() as session:
        # Get all exams
        result = await session.execute(select(Exam))
        exams = result.scalars().all()

        print(f"Found {len(exams)} exams to process")

        # Get all subjects
        subjects_result = await session.execute(select(Subject))
        subjects = {s.name: s.id for s in subjects_result.scalars().all()}

        print(f"Found {len(subjects)} subjects: {list(subjects.keys())}")

        updated = 0
        skipped = 0

        for exam in exams:
            if exam.subject_id:
                # Already has subject_id
                skipped += 1
                continue

            if exam.subject and exam.subject in subjects:
                # Update subject_id based on subject name
                exam.subject_id = subjects[exam.subject]
                updated += 1
                print(f"Updated exam '{exam.title}' with subject_id for '{exam.subject}'")
            else:
                print(f"Warning: Exam '{exam.title}' has subject '{exam.subject}' which is not in subjects table")

        await session.commit()

        print(f"\nMigration complete:")
        print(f"  Updated: {updated} exams")
        print(f"  Skipped: {skipped} exams (already had subject_id)")


if __name__ == "__main__":
    asyncio.run(migrate_exam_subjects())
