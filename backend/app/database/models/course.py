
from sqlalchemy import String, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)

    college_id: Mapped[int] = mapped_column(
        ForeignKey("colleges.id"),
        index=True
    )

    name: Mapped[str] = mapped_column(String(200))
    code: Mapped[str] = mapped_column(String(50))
    duration_years: Mapped[int] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(String(2000))
    eligibility: Mapped[str | None] = mapped_column(String(2000))
    is_active: Mapped[bool] = mapped_column(default=True)
