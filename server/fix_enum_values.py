"""
Script to convert old English enum values to new Russian values in the database.
"""
import asyncio
from sqlalchemy import select, update
from app.database import async_session
from app.models.student import Student

# Mappings for enum values
SOURCE_MAPPING = {
    "website": "Сайт",
    "social_media": "Социальные сети",
    "recommendation": "Рекомендация",
    "advertising": "Реклама",
    "other": "Другое",
}

EDUCATION_TYPE_MAPPING = {
    "school": "Школа",
    "college": "Колледж",
    "university": "Университет",
    "other": "Другое",
}


async def fix_enum_values():
    """Fix enum values in the database."""
    async with async_session() as session:
        # Get all students
        result = await session.execute(select(Student))
        students = result.scalars().all()

        updated_count = 0
        for student in students:
            updated = False

            # Fix source
            if student.source and student.source in SOURCE_MAPPING:
                old_value = student.source
                student.source = SOURCE_MAPPING[old_value]
                print(f"Student {student.id}: source '{old_value}' -> '{student.source}'")
                updated = True

            # Fix education_type
            if student.education_type and student.education_type in EDUCATION_TYPE_MAPPING:
                old_value = student.education_type
                student.education_type = EDUCATION_TYPE_MAPPING[old_value]
                print(f"Student {student.id}: education_type '{old_value}' -> '{student.education_type}'")
                updated = True

            if updated:
                updated_count += 1

        if updated_count > 0:
            await session.commit()
            print(f"\nUpdated {updated_count} students")
        else:
            print("\nNo students to update")


if __name__ == "__main__":
    print("Starting enum values migration...\n")
    asyncio.run(fix_enum_values())
    print("\nDone!")
