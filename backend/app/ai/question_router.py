
import re

GREETING_RESPONSES = {
    "hi": "Hello! What would you like to know about SIETK?",
    "hii": "Hello! What would you like to know about SIETK?",
    "hello": "Hello! You can ask me about SIETK courses, departments, fees, placements, hostels, and academics.",
    "hey": "Hi! How can I help you with SIETK information?",
    "thanks": "You're welcome!",
    "thank you": "You're welcome!",
    "bye": "Goodbye!",
}

SENSITIVE_PATTERNS = [
    r"\bapi[\s_-]*keys?\b",
    r"\b(secret|access)[\s_-]*keys?\b",
    r"\b(passwords?|tokens?|credentials?)\b",
    r"\b(system|developer)\s+prompts?\b",
]

COLLEGE_PATTERNS = [
    r"\b(college|sietk|siddharth|institute)\b",
    r"\b(owner|founder|chairman|principal|management|trustee)\b",
    r"\b(hostel|accommodation|mess|hostels)\b",
    r"\b(fee|fees|tuition|scholarship|charges)\b",
    r"\b(course|courses|branch|department|specialization)\b",
    r"\b(admission|eligibility|counselling)\b",
    r"\b(placement|placements|recruiter|recruiters)\b",
    r"\b(faculty|professor|hod)\b",
    r"\b(exam|examination|semester|syllabus|calendar)\b",
    r"\b(campus|transport|bus|library|sports|facilities)\b",
]

SUGGESTED_QUESTIONS = [
    "What courses are offered at SIETK?",
    "What hostel facilities are available at SIETK?",
    "What placement information is available at SIETK?",
]

RESTRICTED_ANSWER = (
    "I can't provide credentials or confidential "
    "system information."
)


def normalize_question(question: str) -> str:
    return " ".join(question.casefold().strip().split())


def is_sensitive_question(question: str) -> bool:
    normalized = normalize_question(question)

    return any(
        re.search(pattern, normalized)
        for pattern in SENSITIVE_PATTERNS
    )


def is_college_question(
    question: str,
    history: list[dict] | None = None,
) -> bool:
    normalized = normalize_question(question)

    if any(
        re.search(pattern, normalized)
        for pattern in COLLEGE_PATTERNS
    ):
        return True

    # Handle short follow-up questions using
    # the latest user question.
    if history and len(normalized.split()) <= 8:
        previous = next(
            (
                str(item.get("content", ""))
                for item in reversed(history)
                if item.get("role") == "user"
            ),
            "",
        )

        return any(
            re.search(pattern, previous.casefold())
            for pattern in COLLEGE_PATTERNS
        )

    return False


def out_of_scope_response() -> dict:
    return {
        "answer": (
            "I can't help with that question because "
            "it's outside SIETK college information.\n\n"
            "You can ask me about courses, fees, "
            "departments, hostels, placements, "
            "examinations, and campus facilities."
        ),
        "sources": [],
        "needs_support": False,
        "followups": SUGGESTED_QUESTIONS,
    }


def route_question(question: str):
    normalized = normalize_question(question)
    greeting = normalized.rstrip("!?. ")

    if is_sensitive_question(question):
        return {
            "answer": RESTRICTED_ANSWER,
            "sources": [],
            "needs_support": False,
            "followups": [],
        }

    if greeting in GREETING_RESPONSES:
        return {
            "answer": GREETING_RESPONSES[greeting],
            "sources": [],
            "needs_support": False,
            "followups": [],
        }

    # Deterministic handling for simple
    # arithmetic that is unrelated to SIETK.
    if re.fullmatch(
        r"(?:what\s+is\s+)?\d+\s*[+\-*/]\s*\d+\??",
        normalized,
    ):
        return out_of_scope_response()

    return None
