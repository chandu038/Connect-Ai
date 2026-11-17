
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base


class Scholarship(Base):
    __tablename__ = "scholarships"

    id: Mapped[int] = mapped_column(primary_key=True)

    college_id: Mapped[int] = mapped_column(
        ForeignKey("colleges.id"),
        index=True
    )

    name: Mapped[str] = mapped_column(String(200))
    eligibility: Mapped[str | None] = mapped_column(String(2000))
    benefits: Mapped[str | None] = mapped_column(String(2000))
    application_process: Mapped[str | None] = mapped_column(String(2000))
    is_active: Mapped[bool] = mapped_column(default=True)
