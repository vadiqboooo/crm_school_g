import asyncio
import asyncpg
from app.config import settings

async def populate_names():
    # Parse DATABASE_URL
    url = settings.DATABASE_URL
    url = url.replace('+asyncpg', '')

    # Connect to database
    conn = await asyncpg.connect(url)

    try:
        # Update exams with employee names
        print("Updating exams with creator names...")
        result = await conn.execute("""
            UPDATE exams ex
            SET
                created_by_first_name = e.first_name,
                created_by_last_name = e.last_name
            FROM employees e
            WHERE ex.created_by = e.id
            AND (ex.created_by_first_name IS NULL OR ex.created_by_last_name IS NULL);
        """)
        print(f"Updated exams: {result}")

        # Update exam_results with employee names
        print("\nUpdating exam_results with checker names...")
        result = await conn.execute("""
            UPDATE exam_results er
            SET
                added_by_first_name = e.first_name,
                added_by_last_name = e.last_name
            FROM employees e
            WHERE er.added_by = e.id
            AND (er.added_by_first_name IS NULL OR er.added_by_last_name IS NULL);
        """)
        print(f"Updated exam_results: {result}")

        print("\nAll records updated successfully!")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(populate_names())
