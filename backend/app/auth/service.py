
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.database.models.college import College
from app.database.models.user import User


def authenticate_staff(
    db: Session,
    college_code: str,
    email: str,
    password: str,
) -> User | None:

    college = db.scalar(
        select(College).where(College.code == college_code)
    )

    if college is None:
        return None

    user = db.scalar(
        select(User).where(
            User.college_id == college.id,
            User.email == email,
            User.role.in_(["admin", "support"]),
            User.is_active.is_(True),
        )
    )

    if user is None or not user.password_hash:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user
