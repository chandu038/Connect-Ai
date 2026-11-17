
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.core.security import hash_password
from app.database.connection import get_db
from app.database.models.user import User

from app.schemas.support_staff import (
    CreateSupportStaffRequest,
    UpdateSupportStaffRequest,
    ResetSupportPasswordRequest,
    SupportStaffResponse,
)


router = APIRouter(
    prefix="/api/v1/admin/support-staff",
    tags=["Admin - Staff"],
)


def get_staff_or_404(
    staff_id: int,
    college_id: int,
    db: Session,
) -> User:
    staff = db.scalar(
        select(User).where(
            User.id == staff_id,
            User.college_id == college_id,
            User.role.in_(["support", "admin"]),
        )
    )

    if staff is None:
        raise HTTPException(
            status_code=404,
            detail="Staff account not found",
        )

    return staff


def ensure_not_last_active_admin(
    staff: User,
    db: Session,
) -> None:
    if staff.role != "admin" or not staff.is_active:
        return

    count = db.scalar(
        select(func.count(User.id)).where(
            User.college_id == staff.college_id,
            User.role == "admin",
            User.is_active.is_(True),
        )
    ) or 0

    if count <= 1:
        raise HTTPException(
            status_code=409,
            detail="Cannot remove the last active administrator",
        )


@router.post(
    "",
    response_model=SupportStaffResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_support_staff(
    request: CreateSupportStaffRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    email = str(request.email).strip().lower()

    existing = db.scalar(
        select(User).where(
            User.college_id == current_user.college_id,
            User.email == email,
        )
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Email already registered for this college",
        )

    staff = User(
        college_id=current_user.college_id,
        name=request.name.strip(),
        email=email,
        phone=request.phone,
        role="support",
        password_hash=hash_password(request.temporary_password),
        must_change_password=True,
        is_active=True,
    )

    db.add(staff)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Unable to create staff account",
        )

    db.refresh(staff)
    return staff


@router.get(
    "",
    response_model=list[SupportStaffResponse],
)
def list_support_staff(
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(User).where(
            User.college_id == current_user.college_id,
            User.role.in_(["support", "admin"]),
            User.id != current_user.id,
        ).order_by(User.id.desc())
    ).all()


@router.patch(
    "/{staff_id}",
    response_model=SupportStaffResponse,
)
def update_support_staff(
    staff_id: int,
    request: UpdateSupportStaffRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    staff = get_staff_or_404(
        staff_id,
        current_user.college_id,
        db,
    )

    if staff.id == current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You cannot change your own role here",
        )

    updates = request.model_dump(exclude_unset=True)

    if "name" in updates:
        if (
            updates["name"] is None
            or not updates["name"].strip()
        ):
            raise HTTPException(
                status_code=422,
                detail="Name cannot be empty",
            )

        staff.name = updates["name"].strip()

    if "phone" in updates:
        staff.phone = updates["phone"]

    if "role" in updates and updates["role"] is not None:
        if (
            staff.role == "admin"
            and updates["role"] != "admin"
        ):
            ensure_not_last_active_admin(staff, db)

        staff.role = updates["role"]

    db.commit()
    db.refresh(staff)

    return staff


@router.patch(
    "/{staff_id}/deactivate",
    response_model=SupportStaffResponse,
)
def deactivate_support_staff(
    staff_id: int,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    staff = get_staff_or_404(
        staff_id,
        current_user.college_id,
        db,
    )

    if staff.id == current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Cannot deactivate your own account",
        )

    ensure_not_last_active_admin(staff, db)

    staff.is_active = False

    db.commit()
    db.refresh(staff)

    return staff


@router.post("/{staff_id}/reset-password")
def reset_support_password(
    staff_id: int,
    request: ResetSupportPasswordRequest,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    staff = get_staff_or_404(
        staff_id,
        current_user.college_id,
        db,
    )

    if staff.id == current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Use Change Password for your own account",
        )

    staff.password_hash = hash_password(
        request.temporary_password
    )

    staff.must_change_password = True

    db.commit()

    return {
        "message": "Staff password reset successfully",
        "staff_id": staff.id,
    }
