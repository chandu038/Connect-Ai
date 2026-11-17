
from datetime import datetime
from sqlalchemy import String, ForeignKey, Text, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base import Base


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id: Mapped[int] = mapped_column(primary_key=True)

    college_id: Mapped[int] = mapped_column(
        ForeignKey("colleges.id"),
        index=True
    )

    applicant_id: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )

    assigned_to: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True
    )

    subject: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)

    status: Mapped[str] = mapped_column(
        String(30),
        default="new"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )
