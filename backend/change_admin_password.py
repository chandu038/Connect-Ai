
from getpass import getpass
from sqlalchemy import select

from app.database.connection import SessionLocal
from app.database.models.user import User
from pwdlib import PasswordHash


password_hash = PasswordHash.recommended()

email = input("Enter admin email: ").strip().lower()

new_password = getpass("Enter new password: ")
confirm_password = getpass("Confirm new password: ")

if len(new_password) < 12:
    raise ValueError("Password must contain at least 12 characters.")

if new_password != confirm_password:
    raise ValueError("Passwords do not match.")

with SessionLocal() as db:
    admin = db.scalar(
        select(User).where(
            User.email == email,
            User.role == "admin",
        )
    )

    if admin is None:
        raise ValueError("Admin account not found.")

    admin.password_hash = password_hash.hash(new_password)

    db.commit()

print("Admin password updated successfully!")
