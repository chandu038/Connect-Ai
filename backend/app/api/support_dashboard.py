
from collections import defaultdict
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.core.permissions import require_roles
from app.database.connection import get_db

from app.database.models.user import User
from app.database.models.student_question import StudentQuestion
from app.database.models.support_ticket import SupportTicket
from app.database.models.support_ticket_reply import SupportTicketReply


router = APIRouter(
    prefix="/api/v1/support",
    tags=["Admission Support"],
)

STUDENT_ROLES = ("applicant", "student", "parent")


class TicketStatusRequest(BaseModel):
    status: Literal[
        "new",
        "in_progress",
        "resolved",
        "closed",
    ]


class AssignTicketRequest(BaseModel):
    staff_id: int | None = None


class TicketReplyRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


def student_or_404(
    db: Session,
    student_id: int,
    college_id: int,
):
    student = db.scalar(
        select(User).where(
            User.id == student_id,
            User.college_id == college_id,
            User.role.in_(STUDENT_ROLES),
        )
    )

    if student is None:
        raise HTTPException(
            status_code=404,
            detail="Student not found",
        )

    return student


def ticket_or_404(
    db: Session,
    ticket_id: int,
    college_id: int,
):
    ticket = db.scalar(
        select(SupportTicket).where(
            SupportTicket.id == ticket_id,
            SupportTicket.college_id == college_id,
        )
    )

    if ticket is None:
        raise HTTPException(
            status_code=404,
            detail="Support ticket not found",
        )

    return ticket


def serialize_question(question: StudentQuestion):
    return {
        "id": question.id,
        "student_id": question.student_id,
        "question": question.question,
        "answer": question.answer,
        "needs_support": question.needs_support,
        "created_at": (
            question.created_at.isoformat()
            if question.created_at
            else None
        ),
    }


def serialize_ticket(ticket, users, replies=None):
    student = users.get(ticket.applicant_id)
    staff = users.get(ticket.assigned_to)

    result = {
        "id": ticket.id,
        "applicant_id": ticket.applicant_id,
        "student_name": (
            student.name if student else "Unknown student"
        ),
        "student_email": (
            student.email if student else None
        ),
        "assigned_to": ticket.assigned_to,
        "assigned_staff_name": (
            staff.name if staff else None
        ),
        "subject": ticket.subject,
        "description": ticket.description,
        "status": ticket.status,
        "created_at": (
            ticket.created_at.isoformat()
            if ticket.created_at
            else None
        ),
    }

    if replies is not None:
        result["replies"] = [
            {
                "id": reply.id,
                "sender_id": reply.sender_id,
                "sender_name": (
                    users[reply.sender_id].name
                    if reply.sender_id in users
                    else "Unknown"
                ),
                "message": reply.message,
                "created_at": (
                    reply.created_at.isoformat()
                    if reply.created_at
                    else None
                ),
            }
            for reply in replies
        ]

    return result


@router.get("/students")
def support_students(
    current_user: User = Depends(require_roles("support")),
    db: Session = Depends(get_db),
):
    college_id = current_user.college_id

    students = db.scalars(
        select(User)
        .where(
            User.college_id == college_id,
            User.role.in_(STUDENT_ROLES),
        )
        .order_by(User.id.desc())
    ).all()

    counts = dict(
        db.execute(
            select(
                StudentQuestion.student_id,
                func.count(StudentQuestion.id),
            )
            .where(
                StudentQuestion.college_id == college_id
            )
            .group_by(StudentQuestion.student_id)
        ).all()
    )

    return [
        {
            "id": student.id,
            "name": student.name,
            "email": student.email,
            "phone": student.phone,
            "role": student.role,
            "question_count": counts.get(student.id, 0),
        }
        for student in students
    ]


@router.get("/students/{student_id}/questions")
def student_questions(
    student_id: int,
    current_user: User = Depends(require_roles("support")),
    db: Session = Depends(get_db),
):
    college_id = current_user.college_id

    student = student_or_404(
        db,
        student_id,
        college_id,
    )

    questions = db.scalars(
        select(StudentQuestion)
        .where(
            StudentQuestion.college_id == college_id,
            StudentQuestion.student_id == student_id,
        )
        .order_by(
            StudentQuestion.created_at.desc(),
            StudentQuestion.id.desc(),
        )
    ).all()

    return {
        "student": {
            "id": student.id,
            "name": student.name,
            "email": student.email,
            "phone": student.phone,
            "role": student.role,
        },
        "total_questions": len(questions),
        "questions": [
            serialize_question(question)
            for question in questions
        ],
    }


@router.get("/most-asked-questions")
def most_asked_questions(
    current_user: User = Depends(require_roles("support")),
    db: Session = Depends(get_db),
):
    college_id = current_user.college_id

    questions = db.scalars(
        select(StudentQuestion)
        .where(
            StudentQuestion.college_id == college_id
        )
        .order_by(StudentQuestion.id.desc())
    ).all()

    student_ids = {
        item.student_id for item in questions
    }

    students = db.scalars(
        select(User).where(
            User.college_id == college_id,
            User.id.in_(student_ids),
        )
    ).all() if student_ids else []

    user_map = {
        student.id: student for student in students
    }

    groups = defaultdict(list)

    for question in questions:
        groups[question.question_key].append(question)

    result = []

    for key, items in groups.items():
        # Count unique students, not repeated messages
        unique_student_ids = {
            item.student_id for item in items
        }

        student_list = []

        for student_id in sorted(unique_student_ids):
            student = user_map.get(student_id)

            if student:
                student_list.append({
                    "id": student.id,
                    "name": student.name,
                    "email": student.email,
                })

        result.append({
            "question_key": key,
            "question": items[-1].question,
            "unique_students": len(unique_student_ids),
            "times_asked": len(items),
            "students": student_list,
        })

    result.sort(
        key=lambda item: (
            -item["unique_students"],
            -item["times_asked"],
            item["question"],
        )
    )

    return result


@router.get("/overview")
def support_overview(
    current_user: User = Depends(require_roles("support")),
    db: Session = Depends(get_db),
):
    college_id = current_user.college_id

    total_questions = db.scalar(
        select(func.count(StudentQuestion.id)).where(
            StudentQuestion.college_id == college_id
        )
    ) or 0

    unique_students = db.scalar(
        select(
            func.count(
                func.distinct(StudentQuestion.student_id)
            )
        ).where(
            StudentQuestion.college_id == college_id
        )
    ) or 0

    ticket_rows = db.execute(
        select(
            SupportTicket.status,
            func.count(SupportTicket.id),
        )
        .where(
            SupportTicket.college_id == college_id
        )
        .group_by(SupportTicket.status)
    ).all()

    status_counts = dict(ticket_rows)

    return {
        "total_questions": total_questions,
        "students_who_asked": unique_students,
        "total_tickets": sum(status_counts.values()),
        "open_tickets": (
            status_counts.get("new", 0)
            + status_counts.get("in_progress", 0)
        ),
        "resolved_tickets": status_counts.get(
            "resolved", 0
        ),
    }


@router.get("/tickets")
def list_support_tickets(
    current_user: User = Depends(require_roles("support")),
    db: Session = Depends(get_db),
):
    college_id = current_user.college_id

    tickets = db.scalars(
        select(SupportTicket)
        .where(
            SupportTicket.college_id == college_id
        )
        .order_by(
            SupportTicket.created_at.desc(),
            SupportTicket.id.desc(),
        )
    ).all()

    ids = set()

    for ticket in tickets:
        ids.add(ticket.applicant_id)
        if ticket.assigned_to is not None:
            ids.add(ticket.assigned_to)

    users = db.scalars(
        select(User).where(
            User.college_id == college_id,
            User.id.in_(ids),
        )
    ).all() if ids else []

    user_map = {
        user.id: user for user in users
    }

    return [
        serialize_ticket(ticket, user_map)
        for ticket in tickets
    ]


@router.get("/tickets/{ticket_id}")
def get_ticket_details(
    ticket_id: int,
    current_user: User = Depends(require_roles("support")),
    db: Session = Depends(get_db),
):
    ticket = ticket_or_404(
        db,
        ticket_id,
        current_user.college_id,
    )

    replies = db.scalars(
        select(SupportTicketReply)
        .where(
            SupportTicketReply.ticket_id == ticket_id,
            SupportTicketReply.college_id
            == current_user.college_id,
        )
        .order_by(
            SupportTicketReply.created_at.asc(),
            SupportTicketReply.id.asc(),
        )
    ).all()

    ids = {
        ticket.applicant_id,
        current_user.id,
    }

    if ticket.assigned_to:
        ids.add(ticket.assigned_to)

    ids.update(reply.sender_id for reply in replies)

    users = db.scalars(
        select(User).where(
            User.college_id == current_user.college_id,
            User.id.in_(ids),
        )
    ).all()

    user_map = {
        user.id: user for user in users
    }

    return serialize_ticket(
        ticket,
        user_map,
        replies,
    )


@router.patch("/tickets/{ticket_id}/status")
def update_ticket_status(
    ticket_id: int,
    request: TicketStatusRequest,
    current_user: User = Depends(require_roles("support")),
    db: Session = Depends(get_db),
):
    ticket = ticket_or_404(
        db,
        ticket_id,
        current_user.college_id,
    )

    ticket.status = request.status

    db.commit()

    return {
        "id": ticket.id,
        "status": ticket.status,
    }


@router.patch("/tickets/{ticket_id}/assign")
def assign_ticket(
    ticket_id: int,
    request: AssignTicketRequest,
    current_user: User = Depends(require_roles("support")),
    db: Session = Depends(get_db),
):
    ticket = ticket_or_404(
        db,
        ticket_id,
        current_user.college_id,
    )

    if request.staff_id is not None:
        staff = db.scalar(
            select(User).where(
                User.id == request.staff_id,
                User.college_id == current_user.college_id,
                User.role == "support",
                User.is_active.is_(True),
            )
        )

        if staff is None:
            raise HTTPException(
                status_code=404,
                detail="Active support staff not found",
            )

    ticket.assigned_to = request.staff_id

    db.commit()

    return {
        "id": ticket.id,
        "assigned_to": ticket.assigned_to,
    }


@router.post("/tickets/{ticket_id}/reply")
def reply_to_ticket(
    ticket_id: int,
    request: TicketReplyRequest,
    current_user: User = Depends(require_roles("support")),
    db: Session = Depends(get_db),
):
    ticket = ticket_or_404(
        db,
        ticket_id,
        current_user.college_id,
    )

    if ticket.status == "closed":
        raise HTTPException(
            status_code=409,
            detail="Closed tickets cannot receive replies",
        )

    reply = SupportTicketReply(
        ticket_id=ticket.id,
        college_id=current_user.college_id,
        sender_id=current_user.id,
        message=request.message.strip(),
    )

    db.add(reply)

    if ticket.status == "new":
        ticket.status = "in_progress"

    db.commit()
    db.refresh(reply)

    return {
        "id": reply.id,
        "ticket_id": ticket.id,
        "message": reply.message,
        "status": ticket.status,
    }
