
import re


def validate_password_strength(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password must contain at least 8 characters")

    if len(password) > 128:
        raise ValueError("Password cannot exceed 128 characters")

    if not re.search(r"[A-Z]", password):
        raise ValueError("Password needs an uppercase letter")

    if not re.search(r"[a-z]", password):
        raise ValueError("Password needs a lowercase letter")

    if not re.search(r"\d", password):
        raise ValueError("Password needs a number")

    if not re.search(r"[^A-Za-z0-9]", password):
        raise ValueError("Password needs a special character")

    return password
