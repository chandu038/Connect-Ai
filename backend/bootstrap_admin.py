
import getpass
import sys

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.core.security import hash_password
from app.database.connection import SessionLocal
from app.database.models.college import College
from app.database.models.user import User


def bootstrap_admin():
    print("\n=== Connect-Ai Admin Setup ===\n")

    college_code = input("College code: ").strip().upper()
    college_name = input("College name: ").strip()
    admin_name = input("Admin name: ").strip()
    admin_email = input("Admin email: ").strip().lower()

    if not all([
        college_code,
        college_name,
        admin_name,
        admin_email,
    ]):
        print("All fields are required.")
        return

    password = getpass.getpass("Admin password: ")
    confirm_password = getpass.getpass(
        "Confirm password: "
    )

    if password != confirm_password:
        print("Passwords do not match.")
        return

    if len(password) < 12:
        print("Password must contain at least 12 characters.")
        return

    with SessionLocal() as db:
        try:
            college = db.scalar(
                select(College).where(
                    College.code == college_code
                )
            )

            if college is None:
                college = College(
                    code=college_code,
                    name=college_name,
                )
                db.add(college)
                db.flush()
            else:
                # Never use this script to add an admin
                # to an existing college.
                print(
                    "College already exists. "
                    "Bootstrap is only for new colleges."
                )
                db.rollback()
                return

            existing_user = db.scalar(
                select(User).where(
                    User.college_id == college.id,
                    User.email == admin_email,
                )
            )

            if existing_user:
                print("Admin email already exists.")
                db.rollback()
                return

            admin = User(
                college_id=college.id,
                name=admin_name,
                email=admin_email,
                role="admin",
                password_hash=hash_password(password),
                is_active=True,
            )

            db.add(admin)
            db.commit()

            print("\nAdmin account created successfully!")
            print("College:", college.name)
            print("College code:", college.code)
            print("Admin email:", admin.email)

        except IntegrityError:
            db.rollback()
            print(
                "A database conflict occurred. "
                "No admin account was created."
            )
        except Exception:
            db.rollback()
            raise


if __name__ == "__main__":
    try:
        bootstrap_admin()
    except KeyboardInterrupt:
        print("\nSetup cancelled.")
        sys.exit(1)
