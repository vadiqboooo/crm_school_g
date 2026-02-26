import asyncio
import asyncpg
from app.config import settings

async def fix_constraints():
    # Parse DATABASE_URL
    url = settings.DATABASE_URL
    url = url.replace('+asyncpg', '')

    # Connect to database
    conn = await asyncpg.connect(url)

    try:
        # Get all foreign key constraints related to employees
        constraints = await conn.fetch("""
            SELECT
                tc.constraint_name,
                tc.table_name
            FROM information_schema.table_constraints tc
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.constraint_name LIKE '%employee%'
            OR tc.constraint_name LIKE '%added_by%'
            OR tc.constraint_name LIKE '%created_by%';
        """)

        print("Found constraints:")
        for c in constraints:
            print(f"  - {c['table_name']}.{c['constraint_name']}")

        # Drop and recreate exam_results.added_by constraint
        print("\nUpdating exam_results.added_by constraint...")
        await conn.execute("""
            ALTER TABLE exam_results
            DROP CONSTRAINT IF EXISTS fk_exam_results_added_by CASCADE;
        """)
        await conn.execute("""
            ALTER TABLE exam_results
            ADD CONSTRAINT fk_exam_results_added_by
                FOREIGN KEY (added_by)
                REFERENCES employees(id)
                ON DELETE SET NULL;
        """)
        print("Updated exam_results.added_by constraint")

        # Drop and recreate exams.created_by constraint
        print("\nUpdating exams.created_by constraint...")
        await conn.execute("""
            ALTER TABLE exams
            DROP CONSTRAINT IF EXISTS exams_created_by_fkey CASCADE;
        """)
        await conn.execute("""
            ALTER TABLE exams
            ADD CONSTRAINT exams_created_by_fkey
                FOREIGN KEY (created_by)
                REFERENCES employees(id)
                ON DELETE SET NULL;
        """)
        print("Updated exams.created_by constraint")

        # Check other tables that might reference employees
        print("\nChecking other tables...")

        # Groups table
        await conn.execute("""
            ALTER TABLE groups
            DROP CONSTRAINT IF EXISTS groups_teacher_id_fkey CASCADE;
        """)
        await conn.execute("""
            ALTER TABLE groups
            ADD CONSTRAINT groups_teacher_id_fkey
                FOREIGN KEY (teacher_id)
                REFERENCES employees(id)
                ON DELETE SET NULL;
        """)
        print("Updated groups.teacher_id constraint")

        # Parent feedbacks table
        await conn.execute("""
            ALTER TABLE parent_feedbacks
            DROP CONSTRAINT IF EXISTS parent_feedbacks_created_by_fkey CASCADE;
        """)
        await conn.execute("""
            ALTER TABLE parent_feedbacks
            ADD CONSTRAINT parent_feedbacks_created_by_fkey
                FOREIGN KEY (created_by)
                REFERENCES employees(id)
                ON DELETE SET NULL;
        """)
        print("Updated parent_feedbacks.created_by constraint")

        # Weekly reports table
        await conn.execute("""
            ALTER TABLE weekly_reports
            DROP CONSTRAINT IF EXISTS weekly_reports_created_by_fkey CASCADE;
        """)
        await conn.execute("""
            ALTER TABLE weekly_reports
            ADD CONSTRAINT weekly_reports_created_by_fkey
                FOREIGN KEY (created_by)
                REFERENCES employees(id)
                ON DELETE SET NULL;
        """)
        print("Updated weekly_reports.created_by constraint")

        print("\nAll constraints updated successfully!")

    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(fix_constraints())
