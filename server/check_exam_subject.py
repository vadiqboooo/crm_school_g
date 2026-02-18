import asyncio
from sqlalchemy import select
from app.database import async_session
from app.models.exam import Exam

async def check_exam():
    exam_id = "1db0cedb-cb19-449a-9821-aa9b8e39dd85"

    async with async_session() as db:
        result = await db.execute(
            select(Exam).where(Exam.id == exam_id)
        )
        exam = result.scalar_one_or_none()

        if exam:
            print(f"Exam found: {exam.title}")
            print(f"Subject (string): {exam.subject}")
            print(f"Subject ID: {exam.subject_id}")
            print(f"Group ID: {exam.group_id}")

            if exam.group_id:
                from app.models.group import Group
                group_result = await db.execute(
                    select(Group).where(Group.id == exam.group_id)
                )
                group = group_result.scalar_one_or_none()
                if group:
                    print(f"Group subject (string): {group.subject}")
                    print(f"Group subject_id: {group.subject_id}")
        else:
            print("Exam not found")

if __name__ == "__main__":
    asyncio.run(check_exam())
