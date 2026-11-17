
from typing import Literal

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from app.core.password_rules import validate_password_strength


class StaffLoginRequest(BaseModel):
    college_code: str
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class StudentRegisterRequest(BaseModel):
    college_code: str = Field(min_length=1)
    name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    phone: str = Field(min_length=10, max_length=15)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str
    role: Literal["applicant", "parent"] = "applicant"

    @field_validator("password")
    @classmethod
    def check_password(cls, value: str) -> str:
        return validate_password_strength(value)

    @model_validator(mode="after")
    def check_confirmation(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class StudentLoginRequest(BaseModel):
    college_code: str = Field(min_length=1)
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)
    confirm_new_password: str

    @field_validator("new_password")
    @classmethod
    def check_new_password(cls, value: str) -> str:
        return validate_password_strength(value)

    @model_validator(mode="after")
    def check_confirmation(self):
        if self.new_password != self.confirm_new_password:
            raise ValueError("New passwords do not match")
        return self
