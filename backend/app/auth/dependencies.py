
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.auth.jwt_handler import decode_access_token
from app.database.connection import get_db
from app.database.models.user import User


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db),
) -> User:

    authentication_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if credentials is None:
        raise authentication_error

    payload = decode_access_token(credentials.credentials)

    if payload is None:
        raise authentication_error

    try:
        user_id = int(payload["sub"])
        token_college_id = int(payload["college_id"])
    except (KeyError, ValueError, TypeError):
        raise authentication_error

    user = db.get(User, user_id)

    if user is None or not user.is_active:
        raise authentication_error

    if user.college_id != token_college_id:
        raise authentication_error

    if user.role != payload.get("role"):
        raise authentication_error

    return user
