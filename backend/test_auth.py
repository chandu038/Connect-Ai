
from app.core.security import hash_password, verify_password
from app.auth.jwt_handler import (
    create_access_token,
    decode_access_token,
)

password = "ExampleTestPassword123!"

hashed = hash_password(password)

print("Password hashing works:", hashed != password)

print(
    "Password verification works:",
    verify_password(password, hashed),
)

print(
    "Incorrect password rejected:",
    not verify_password("WrongPassword", hashed),
)

token = create_access_token(
    user_id=1,
    college_id=1,
    role="admin",
)

payload = decode_access_token(token)

print("JWT created:", isinstance(token, str))
print("JWT decoded:", payload is not None)
print("User ID:", payload["sub"] if payload else None)
print("College ID:", payload["college_id"] if payload else None)
print("Role:", payload["role"] if payload else None)
