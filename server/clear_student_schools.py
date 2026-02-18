"""
Скрипт для очистки поля current_school у всех студентов
"""
import asyncio
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.student import Student
from app.config import settings


async def clear_student_schools():
    print("=" * 60)
    print("ОЧИСТКА ПОЛЯ 'ШКОЛА ОБУЧЕНИЯ' У ВСЕХ СТУДЕНТОВ")
    print("=" * 60)

    # Подключение к PostgreSQL
    print(f"\nПодключение к PostgreSQL: {settings.DATABASE_URL}")
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session_maker = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with async_session_maker() as session:
        try:
            # Подсчитываем студентов с заполненным current_school
            result = await session.execute(
                select(Student).where(Student.current_school.isnot(None))
            )
            students_with_school = result.scalars().all()
            count = len(students_with_school)

            print(f"\nНайдено студентов с заполненной школой: {count}")

            if count == 0:
                print("Нечего очищать!")
                return

            # Показываем примеры
            print("\nПримеры (первые 5):")
            for student in students_with_school[:5]:
                print(f"  - {student.last_name} {student.first_name}: '{student.current_school}'")

            # Подтверждение
            confirm = input(f"\nОчистить поле 'current_school' у {count} студентов? (yes/no): ")

            if confirm.lower() != 'yes':
                print("Отменено.")
                return

            # Очищаем
            await session.execute(
                update(Student).values(current_school=None)
            )
            await session.commit()

            print(f"\nУспешно очищено поле 'current_school' у {count} студентов!")

        except Exception as e:
            print(f"\nОШИБКА: {e}")
            import traceback
            traceback.print_exc()
            await session.rollback()
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(clear_student_schools())
