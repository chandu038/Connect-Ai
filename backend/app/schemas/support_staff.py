
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
)

from app.core.password_rules import validate_password_strength


class CreateSupportStaffRequest(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=20)
    temporary_password: str = Field(min_length=8, max_length=128)

    @field_validator("temporary_password")
    @classmethod
    def check_password(cls, value: str) -> str:
        return validate_password_strength(value)


class UpdateSupportStaffRequest(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )
    phone: str | None = Field(default=None, max_length=20)
    role: Literal["support", "admin"] | None = None


class ResetSupportPasswordRequest(BaseModel):
    temporary_password: str = Field(min_length=8, max_length=128)

    @field_validator("temporary_password")
    @classmethod
    def check_password(cls, value: str) -> str:
        return validate_password_strength(value)


class SupportStaffResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    college_id: int
    name: str
    email: EmailStr
    phone: str | None
    role: str
    is_active: bool
