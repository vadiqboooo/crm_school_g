"""
Check specific student's enum values.
"""
import asyncio
from sqlalchemy import text
from app.database import async_session


async def check_student():
    """Check specific student enum values."""
    async with async_session() as session:
        student_id = '3e41ba38-b49a-4c14-bf8e-1245cc90164e'

        print(f"Checking student {student_id}")
        print("=" * 60)

        # Get student data
        result = await session.execute(text(
            "SELECT id, first_name, last_name, source::text, education_type::text FROM students WHERE id = :id"
        ), {"id": student_id})

        student = result.fetchone()

        if student:
            print(f"ID: {student[0]}")
            print(f"Name: {student[1]} {student[2]}")
            print(f"Source: '{student[3]}'")
            print(f"Education Type: '{student[4]}'")
        else:
            print("Student not found")

        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(check_student())
