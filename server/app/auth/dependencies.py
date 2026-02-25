from uuid import UUID
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.auth.security import decode_token
from app.models.employee import Employee, EmployeeRole
from app.models.school_location import SchoolLocation

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Employee:
    token = credentials.credentials
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(Employee).where(Employee.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    return user


def require_role(*roles: EmployeeRole):
    async def role_checker(current_user: Employee = Depends(get_current_user)) -> Employee:
        if current_user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user
    return role_checker


async def get_manager_location_id(
    current_user: Employee = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Optional[UUID]:
    """
    Returns the location ID that the current manager is assigned to.
    Returns None if the user is not a manager (admin/teacher see all data).
    Returns a special UUID if manager is not assigned to any location (will show empty list).
    """
    if current_user.role != EmployeeRole.manager:
        return None

    # Find the location where this employee is the manager
    result = await db.execute(
        select(SchoolLocation).where(SchoolLocation.manager_id == current_user.id)
    )
    location = result.scalar_one_or_none()

    if location is None:
        # Return a non-existent UUID to show empty list instead of error
        # This allows managers to login even if not assigned to a location yet
        from uuid import UUID as create_uuid
        return create_uuid('00000000-0000-0000-0000-000000000000')

    return location.id
