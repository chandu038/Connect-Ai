
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.database.connection import get_db
from app.database.models.user import User


router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin - Reporting"],
)


@router.get("/students")
def list_students(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    students = db.scalars(
        select(User)
        .where(
            User.college_id == current_user.college_id,
            User.role.in_(["applicant", "student", "parent"]),
        )
        .order_by(User.created_at.desc())
    ).all()

    return [
        {
            "id": student.id,
            "name": student.name,
            "email": student.email,
            "phone": student.phone,
            "role": student.role,
            "is_active": student.is_active,
            "created_at": (
                student.created_at.isoformat()
                if student.created_at
                else None
            ),
        }
        for student in students
    ]


@router.get("/analytics")
def get_admin_analytics(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    college_id = current_user.college_id

    def count_users(*roles, active=None):
        query = select(func.count(User.id)).where(
            User.college_id == college_id
        )

        if roles:
            query = query.where(User.role.in_(roles))

        if active is not None:
            query = query.where(User.is_active.is_(active))

        return db.scalar(query) or 0

    total_students = count_users("applicant", "student", "parent")
    active_students = count_users(
        "applicant", "student", "parent", active=True
    )
    total_staff = count_users("support", "admin")

    return {
        "total_students": total_students,
        "active_students": active_students,
        "inactive_students": total_students - active_students,
        "total_staff": total_staff,
        "active_staff": count_users(
            "support", "admin", active=True
        ),
        "total_admins": count_users("admin"),
        "total_support_staff": count_users("support"),
        "student_roles": [
            {
                "name": "Applicants",
                "value": count_users("applicant"),
            },
            {
                "name": "Students",
                "value": count_users("student"),
            },
            {
                "name": "Parents",
                "value": count_users("parent"),
            },
        ],
    }
