
from pydantic import BaseModel, EmailStr, Field
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.database.connection import get_db
from app.database.models.user import User


router = APIRouter(
    prefix="/api/v1/admin/students",
    tags=["Admin - Students"],
)

STUDENT_ROLES = ("applicant", "student", "parent")


class UpdateStudentRequest(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)


def serialize_student(student: User):
    return {
        "id": student.id,
        "college_id": student.college_id,
        "name": student.name,
        "email": student.email,
        "phone": student.phone,
        "role": student.role,
        "is_active": student.is_active,
    }


def find_student(
    db: Session,
    student_id: int,
    college_id: int,
):
    student = db.scalar(
        select(User).where(
            User.id == student_id,
            User.college_id == college_id,
            User.role.in_(STUDENT_ROLES),
        )
    )

    if student is None:
        raise HTTPException(
            status_code=404,
            detail="Student account not found",
        )

    return student


@router.get("")
def list_students(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    students = db.scalars(
        select(User)
        .where(
            User.college_id == current_user.college_id,
            User.role.in_(STUDENT_ROLES),
        )
        .order_by(User.id.desc())
    ).all()

    return [
        serialize_student(student)
        for student in students
    ]


@router.patch("/{student_id}")
def update_student(
    student_id: int,
    request: UpdateStudentRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    student = find_student(
        db,
        student_id,
        current_user.college_id,
    )

    email = str(request.email).strip().lower()

    existing = db.scalar(
        select(User).where(
            User.college_id == current_user.college_id,
            User.email == email,
            User.id != student.id,
        )
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Email already registered",
        )

    student.name = request.name.strip()
    student.email = email
    student.phone = request.phone

    try:
        db.commit()
        db.refresh(student)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Unable to update student",
        )

    return serialize_student(student)


@router.delete("/{student_id}")
def deactivate_student(
    student_id: int,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    student = find_student(
        db,
        student_id,
        current_user.college_id,
    )

    student.is_active = False

    db.commit()
    db.refresh(student)

    return {
        "message": "Student account deactivated",
        "student": serialize_student(student),
    }


@router.patch("/{student_id}/reactivate")
def reactivate_student(
    student_id: int,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    student = find_student(
        db,
        student_id,
        current_user.college_id,
    )

    student.is_active = True

    db.commit()
    db.refresh(student)

    return serialize_student(student)
