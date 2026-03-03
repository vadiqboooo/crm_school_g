"""
Direct SQL update to fix enum values in database.
"""
import asyncio
from sqlalchemy import text
from app.database import async_session


async def fix_enum_values():
    """Fix enum values using direct SQL."""
    async with async_session() as session:
        # Update source values
        source_updates = [
            ("website", "Сайт"),
            ("social_media", "Социальные сети"),
            ("recommendation", "Рекомендация"),
            ("advertising", "Реклама"),
            ("other", "Другое"),
        ]

        # Update education_type values
        education_updates = [
            ("school", "Школа"),
            ("college", "Колледж"),
            ("university", "Университет"),
            ("other", "Другое"),
        ]

        total_updated = 0

        # First, temporarily change column type to VARCHAR to allow any value
        print("Temporarily changing column types...")
        await session.execute(text(
            "ALTER TABLE students ALTER COLUMN source TYPE VARCHAR USING source::text"
        ))
        await session.execute(text(
            "ALTER TABLE students ALTER COLUMN education_type TYPE VARCHAR USING education_type::text"
        ))
        await session.commit()

        # Update source values
        print("\nUpdating source values...")
        for old_val, new_val in source_updates:
            result = await session.execute(
                text("UPDATE students SET source = :new_val WHERE source = :old_val"),
                {"old_val": old_val, "new_val": new_val}
            )
            if result.rowcount > 0:
                print(f"  Updated {result.rowcount} rows: '{old_val}' -> '{new_val}'")
                total_updated += result.rowcount

        # Update education_type values
        print("\nUpdating education_type values...")
        for old_val, new_val in education_updates:
            result = await session.execute(
                text("UPDATE students SET education_type = :new_val WHERE education_type = :old_val"),
                {"old_val": old_val, "new_val": new_val}
            )
            if result.rowcount > 0:
                print(f"  Updated {result.rowcount} rows: '{old_val}' -> '{new_val}'")
                total_updated += result.rowcount

        await session.commit()

        # Change back to enum type
        print("\nRestoring enum types...")
        await session.execute(text(
            "ALTER TABLE students ALTER COLUMN source TYPE studentsource USING source::studentsource"
        ))
        await session.execute(text(
            "ALTER TABLE students ALTER COLUMN education_type TYPE educationtype USING education_type::educationtype"
        ))
        await session.commit()

        print(f"\nTotal rows updated: {total_updated}")


if __name__ == "__main__":
    print("Starting enum values migration with direct SQL...\n")
    asyncio.run(fix_enum_values())
    print("\nDone!")
