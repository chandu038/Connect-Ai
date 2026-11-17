
from typing import Callable

from fastapi import Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.database.models.user import User


def require_roles(*allowed_roles: str) -> Callable:
    """
    Allow authenticated, active users with approved roles.

    Support staff must change their temporary password
    before accessing support APIs.
    """

    def role_checker(
        current_user: User = Depends(get_current_user),
    ) -> User:

        # Check account status
        if not current_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated",
            )

        # Check permission
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied. Your role is "
                    f"'{current_user.role}'."
                ),
            )

        # Force temporary password change
        if (
            current_user.role == "support"
            and current_user.must_change_password
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Password change required before "
                    "accessing the Support Dashboard"
                ),
            )

        return current_user

    return role_checker
