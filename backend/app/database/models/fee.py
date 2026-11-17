
from decimal import Decimal
from sqlalchemy import ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base


class FeeStructure(Base):
    __tablename__ = "fee_structures"

    id: Mapped[int] = mapped_column(primary_key=True)

    college_id: Mapped[int] = mapped_column(
        ForeignKey("colleges.id"),
        index=True
    )

    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id")
    )

    academic_year: Mapped[str] = mapped_column(String(20))

    tuition_fee: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    admission_fee: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    other_fee: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0)
