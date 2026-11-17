
from google.oauth2 import id_token
from google.auth.transport import requests
from fastapi import HTTPException, status

from app.core.config import settings


def verify_google_token(credential: str) -> dict:
    try:
        payload = id_token.verify_oauth2_token(
            credential,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )

        if payload.get("iss") not in (
            "accounts.google.com",
            "https://accounts.google.com",
        ):
            raise ValueError("Invalid Google token issuer")

        if not payload.get("email_verified"):
            raise ValueError("Google email is not verified")

        if not payload.get("sub"):
            raise ValueError("Google account ID is missing")

        return {
            "google_sub": payload["sub"],
            "email": payload["email"],
            "name": payload.get("name", ""),
            "picture": payload.get("picture"),
        }

    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google ID token",
        )
