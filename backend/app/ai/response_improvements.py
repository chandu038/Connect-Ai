
"""SIETK college question routing and evidence-aware fallbacks."""

import re


COLLEGE_PATTERNS = (
    r"\b(hostels?|accommodations?|mess|canteen|dormitor(?:y|ies))\b",
    r"\b(fees?|charges?|cost|tuition|scholarships?)\b",
    r"\b(admissions?|eligibilit(?:y|ies)|applications?|counselling)\b",
    r"\b(departments?|branches|courses?|programs?|speciali[sz]ations?)\b",
    r"\b(faculty|professors?|hod|teaching staff)\b",
    r"\b(placements?|recruiters?|companies|internships?|packages?|tcs|infosys)\b",
    r"\b(syllabus|curricul(?:um|a)|semester|examinations?|exams?|results?|timetable|academic calendar)\b",
    r"\b(campus|transport|buses|library|laborator(?:y|ies)|facilities|sports|wifi)\b",
    r"\b(sietk|siddharth institute|college|institute)\b",
)

BASIC_MESSAGES = {
    "hi",
    "hii",
    "hello",
    "hey",
    "thanks",
    "thank you",
    "bye",
    "goodbye",
    "good morning",
    "good evening",
    "who are you",
    "what can you do",
}


def is_basic_message(question: str) -> bool:
    """Detect simple greetings and introduction requests."""

    return question.casefold().strip(" \t.!?") in BASIC_MESSAGES


def is_college_question(
    question: str,
    history: list[dict] | None = None,
) -> bool:
    """Identify college-related questions before LLM classification."""

    text = question.casefold().strip()

    if is_basic_message(question):
        return False

    if any(
        re.search(pattern, text)
        for pattern in COLLEGE_PATTERNS
    ):
        return True

    # Resolve short follow-ups using recent conversation context.
    if history and len(text.split()) <= 8:
        previous = " ".join(
            str(item.get("content", ""))
            for item in history[-4:]
        )

        return any(
            re.search(pattern, previous.casefold())
            for pattern in COLLEGE_PATTERNS
        )

    return False


def detect_topic(question: str) -> str:
    """Determine the topic for a useful fallback response."""

    text = question.casefold()

    if re.search(
        r"\b(hostels?|accommodations?|mess|dormitor(?:y|ies))\b",
        text,
    ):
        return "hostel"

    if re.search(
        r"\b(placements?|recruiters?|companies|tcs|infosys)\b",
        text,
    ):
        return "placement"

    if re.search(
        r"\b(exams?|semesters?|calendars?|syllabus|timetable)\b",
        text,
    ):
        return "academic"

    if re.search(
        r"\b(fees?|tuition|scholarships?|charges?)\b",
        text,
    ):
        return "fee"

    if re.search(
        r"\b(departments?|courses?|branches|speciali[sz]ations?)\b",
        text,
    ):
        return "course"

    return "general"


def create_knowledge_fallback(question: str) -> dict:
    """Return a topic-specific fallback without inventing facts."""

    topic = detect_topic(question)

    if topic == "hostel":
        fee_request = bool(
            re.search(
                r"\b(fees?|cost|price|charges?)\b",
                question.casefold(),
            )
        )

        if fee_request and "boy" in question.casefold():
            subject = "boys' hostel fees"
        elif fee_request:
            subject = "hostel fees"
        else:
            subject = "hostel facilities"

        followups = [
            "What hostel accommodation details are officially available at SIETK?",
            "Where can I find SIETK hostel contact information?",
            "What is the process for requesting hostel information?",
        ]

    elif topic == "placement":
        subject = "the requested placement details"

        followups = [
            "Are there published SIETK placement statistics for a specific year?",
            "Where are the official SIETK placement reports?",
            "How can I contact the SIETK placement cell?",
        ]

    elif topic == "academic":
        subject = "the requested academic or examination information"

        followups = [
            "Where is the SIETK academic calendar published?",
            "Are the latest examination notifications available?",
            "Where can I find department-specific syllabus information?",
        ]

    elif topic == "fee":
        subject = "the requested fee information"

        followups = [
            "Where can I find the official fee structure?",
            "Are scholarships available for eligible students?",
            "How can I contact admissions about fees?",
        ]

    elif topic == "course":
        subject = "the requested courses or departments"

        followups = [
            "Where is the official SIETK department list?",
            "Which degree programs are listed by SIETK?",
            "How can I contact the admissions office?",
        ]

    else:
        subject = "that specific SIETK information"

        followups = [
            "Where can I find official SIETK announcements?",
            "What SIETK departments or programs are documented?",
            "How can I contact the relevant college department?",
        ]

    answer = (
        f"I don't have enough verified information about "
        f"{subject} to answer accurately.\n\n"
        "1. **Verification:** I couldn't confirm the requested "
        "details from the evidence available to me.\n"
        "2. **Next step:** Check the official SIETK website "
        "or ask the relevant college office for confirmation.\n"
        "3. **Clarification:** You can provide an academic year, "
        "department or other details to narrow the search."
    )

    return {
        "answer": answer,
        "sources": [],
        "needs_support": True,
        "followups": followups,
    }
