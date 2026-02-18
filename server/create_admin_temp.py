import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.employee import Employee, EmployeeRole
from app.auth.security import hash_password
from app.config import settings

async def create_admin():
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if admin exists
        from sqlalchemy import select
        result = await session.execute(
            select(Employee).where(Employee.email == "admin@crm-school.com")
        )
        existing = result.scalar_one_or_none()

        if existing:
            # Update password
            existing.hashed_password = hash_password("admin")
            print("Updated admin password to 'admin'")
        else:
            # Create new admin
            admin = Employee(
                email="admin@crm-school.com",
                hashed_password=hash_password("admin"),
                first_name="Admin",
                last_name="User",
                role=EmployeeRole.admin,
                is_active=True
            )
            session.add(admin)
            print("Created new admin user")

        await session.commit()
        print("\nLogin credentials:")
        print("  Email: admin@crm-school.com")
        print("  Password: admin")

if __name__ == "__main__":
    asyncio.run(create_admin())
