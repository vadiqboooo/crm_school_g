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
        # Update parent_feedbacks with employee names
        print("Updating parent_feedbacks with employee names...")
        result = await conn.execute("""
            UPDATE parent_feedbacks pf
            SET
                created_by_first_name = e.first_name,
                created_by_last_name = e.last_name
            FROM employees e
            WHERE pf.created_by = e.id
            AND (pf.created_by_first_name IS NULL OR pf.created_by_last_name IS NULL);
        """)
        print(f"Updated parent_feedbacks: {result}")

        print("\nAll records updated successfully!")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(populate_names())
