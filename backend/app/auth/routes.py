
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.jwt_handler import create_access_token
from app.auth.dependencies import get_current_user

from app.core.security import (
    hash_password,
    verify_password,
)

from app.database.connection import get_db
from app.database.models.college import College
from app.database.models.user import User

from app.schemas.auth import (
    StudentRegisterRequest,
    StudentLoginRequest,
    ChangePasswordRequest,
)


router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"],
)


# ------------------------------------------
# Student / Parent Registration
# ------------------------------------------

@router.post(
    "/student/register",
    status_code=status.HTTP_201_CREATED,
)
def register_student(
    request: StudentRegisterRequest,
    db: Session = Depends(get_db),
):
    # Find college
    college = db.scalar(
        select(College).where(
            College.code == request.college_code.strip()
        )
    )

    if college is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="College not found",
        )

    # Normalize email
    email = str(request.email).strip().lower()

    # Check existing account
    existing_user = db.scalar(
        select(User).where(
            User.college_id == college.id,
            User.email == email,
        )
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Email already registered "
                "for this college"
            ),
        )

    # Create student or parent account
    new_user = User(
        college_id=college.id,
        name=request.name.strip(),
        email=email,
        phone=request.phone.strip(),
        role=request.role,
        password_hash=hash_password(
            request.password
        ),
        is_active=True,
        must_change_password=False,
    )

    db.add(new_user)

    try:
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Email already registered "
                "for this college"
            ),
        )

    db.refresh(new_user)

    return {
        "message": "Registration successful",
        "user_id": new_user.id,
        "college_id": new_user.college_id,
        "role": new_user.role,
    }


# ------------------------------------------
# Common Login - All Roles
# ------------------------------------------

@router.post("/login")
def login(
    request: StudentLoginRequest,
    db: Session = Depends(get_db),
):
    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=(
            "Invalid college code, email, "
            "or password"
        ),
        headers={
            "WWW-Authenticate": "Bearer",
        },
    )

    # Find college
    college = db.scalar(
        select(College).where(
            College.code == request.college_code.strip()
        )
    )

    if college is None:
        raise invalid_credentials

    # Normalize email
    email = str(request.email).strip().lower()

    # Find user for this college
    user = db.scalar(
        select(User).where(
            User.college_id == college.id,
            User.email == email,
            User.role.in_(
                [
                    "applicant",
                    "student",
                    "parent",
                    "support",
                    "admin",
                ]
            ),
        )
    )

    # Verify user exists and is active
    if user is None or not user.is_active:
        raise invalid_credentials

    # Verify password authentication exists
    if not user.password_hash:
        raise invalid_credentials

    # Check password
    if not verify_password(
        request.password,
        user.password_hash,
    ):
        raise invalid_credentials

    # Generate JWT
    access_token = create_access_token(
        user_id=user.id,
        college_id=user.college_id,
        role=user.role,
    )

    # Return user information
    # IMPORTANT:
    # must_change_password is required by App.jsx
    # to display the password change dialog.

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "college_id": user.college_id,
            "is_active": user.is_active,
            "must_change_password": bool(
                user.must_change_password
            ),
        },
    }


# ------------------------------------------
# Change Password - Authenticated Users
# ------------------------------------------

@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    # Check password authentication exists
    if not current_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Password authentication "
                "is not configured"
            ),
        )

    # Verify current password
    if not verify_password(
        request.current_password,
        current_user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Prevent reuse of current password
    if (
        request.current_password
        == request.new_password
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "New password must be different "
                "from the current password"
            ),
        )

    # Extra check against stored password
    if verify_password(
        request.new_password,
        current_user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "New password must be different "
                "from the current password"
            ),
        )

    # Hash and save new password
    current_user.password_hash = hash_password(
        request.new_password
    )

    # IMPORTANT:
    # Clear temporary password requirement
    current_user.must_change_password = False

    try:
        db.commit()

    except Exception:
        db.rollback()
        raise

    db.refresh(current_user)

    return {
        "message": "Password changed successfully",
        "must_change_password": bool(
            current_user.must_change_password
        ),
    }
