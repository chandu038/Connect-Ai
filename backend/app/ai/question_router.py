
import re

GREETING_RESPONSES = {
    "hi": "Hello! How can I help you with college admissions?",
    "hii": "Hello! How can I help you with college admissions?",
    "hello": "Hello! Ask me about courses, fees, eligibility, or scholarships.",
    "hey": "Hi! What would you like to know about admissions?",
    "thanks": "You're welcome! Let me know if you have more admission questions.",
    "thank you": "You're welcome! I'm here to help with college admissions.",
}

SENSITIVE_PATTERNS = [
    r"\bapi[\s_-]*keys?\b",
    r"\b(secret|access)[\s_-]*keys?\b",
    r"\b(passwords?|tokens?|credentials?)\b",
    r"\b(system|developer)\s+prompts?\b",
    r"\bwho (developed|created|built|made) you\b",
    r"\bwho (is|are) your (developer|creator)\b",
]

RESTRICTED_ANSWER = (
    "I'm Connect-Ai, a college admission assistant. "
    "I can help you with courses, fees, eligibility, "
    "scholarships, and admission procedures."
)


def normalize_question(question: str) -> str:
    return " ".join(
        question.casefold().strip().split()
    )


def is_sensitive_question(question: str) -> bool:
    normalized = normalize_question(question)

    return any(
        re.search(pattern, normalized)
        for pattern in SENSITIVE_PATTERNS
    )


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

    return None
