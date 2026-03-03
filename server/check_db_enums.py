"""
Check database enum values and student data.
"""
import asyncio
from sqlalchemy import text
from app.database import async_session


async def check_enums():
    """Check enum types and values in database."""
    async with async_session() as session:
        print("=" * 60)
        print("CHECKING ENUM TYPES IN DATABASE")
        print("=" * 60)

        # Check studentsource enum values
        print("\n1. StudentSource enum values:")
        result = await session.execute(text(
            "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'studentsource'::regtype ORDER BY enumsortorder"
        ))
        source_values = [row[0] for row in result.fetchall()]
        for val in source_values:
            print(f"   - {val}")

        # Check educationtype enum values
        print("\n2. EducationType enum values:")
        result = await session.execute(text(
            "SELECT enumlabel FROM pg_enum WHERE enumtypid = 'educationtype'::regtype ORDER BY enumsortorder"
        ))
        education_values = [row[0] for row in result.fetchall()]
        for val in education_values:
            print(f"   - {val}")

        print("\n" + "=" * 60)
        print("CHECKING STUDENT DATA")
        print("=" * 60)

        # Check actual values in students table
        print("\n3. Actual source values in students table:")
        result = await session.execute(text(
            "SELECT DISTINCT source::text FROM students WHERE source IS NOT NULL"
        ))
        actual_sources = [row[0] for row in result.fetchall()]
        for val in actual_sources:
            print(f"   - '{val}'")

        print("\n4. Actual education_type values in students table:")
        result = await session.execute(text(
            "SELECT DISTINCT education_type::text FROM students WHERE education_type IS NOT NULL"
        ))
        actual_education = [row[0] for row in result.fetchall()]
        for val in actual_education:
            print(f"   - '{val}'")

        # Count students with each value
        print("\n5. Student counts by source:")
        result = await session.execute(text(
            "SELECT source::text, COUNT(*) FROM students WHERE source IS NOT NULL GROUP BY source"
        ))
        for source, count in result.fetchall():
            print(f"   - '{source}': {count} students")

        print("\n6. Student counts by education_type:")
        result = await session.execute(text(
            "SELECT education_type::text, COUNT(*) FROM students WHERE education_type IS NOT NULL GROUP BY education_type"
        ))
        for edu_type, count in result.fetchall():
            print(f"   - '{edu_type}': {count} students")

        print("\n" + "=" * 60)


if __name__ == "__main__":
    asyncio.run(check_enums())
