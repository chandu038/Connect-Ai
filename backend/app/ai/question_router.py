"""SIETK routing: greetings, acknowledgments, thanks, sensitive requests and simple scope checks."""
import re

SUGGESTED_QUESTIONS = [
    "What courses are offered at SIETK?",
    "What hostel facilities are available at SIETK?",
    "What placement information is available at SIETK?",
]

GREETING_RESPONSES = {
    "hi": "Hello! What would you like to know about SIETK?",
    "hii": "Hello! What would you like to know about SIETK?",
    "hello": "Hello! What would you like to know about SIETK?",
    "hey": "Hi! How can I help you with SIETK information?",
    "good morning": "Good morning! What would you like to know about SIETK?",
    "good afternoon": "Good afternoon! What would you like to know about SIETK?",
    "good evening": "Good evening! What would you like to know about SIETK?",
    "bye": "Goodbye!",
    "goodbye": "Goodbye!",
    "who are you": "I'm Connect-Ai, an assistant for verified SIETK college information.",
    "what can you do": (
        "I can help find verified SIETK information about courses, departments, "
        "fees, placements, hostels, examinations and campus facilities."
    ),
}

THANKS = {"thanks", "thank you", "thx", "thank u"}

ACKNOWLEDGMENTS = {
    "ok", "okay", "okk", "k", "alright", "got it", "understood",
    "yes", "yeah", "yep", "sure", "hmm", "i will ask", "i'll ask",
}

THANKS_RESPONSE = "You're welcome! Feel free to ask another SIETK question."
ACKNOWLEDGMENT_RESPONSE = "Okay! Ask me anything about SIETK whenever you're ready."
RESTRICTED_ANSWER = "I can't provide credentials or confidential system information."

SENSITIVE_PATTERNS = (
    r"\bapi[\s_-]*keys?\b",
    r"\b(secret|access)[\s_-]*keys?\b",
    r"\b(passwords?|tokens?|credentials?)\b",
    r"\b(system|developer)\s+prompts?\b",
)

# Hints that speed up routing. Unknown phrasing is still classified by the LLM.
COLLEGE_PATTERNS = (
    r"\b(sietk|siddharth|college|institute|campus)\b",
    r"\b(admissions?|fees?|tuition|scholarships?|eligibility|counsell?ing)\b",
    r"\b(courses?|branch(?:es)?|departments?|speciali[sz]ations?|programs?)\b",
    r"\b(faculty|professors?|hod|principal|chairman|founder|owner|contacts?)\b",
    r"\b(hostels?|accommodation|mess|canteen|library|transport|buses|sports)\b",
    r"\b(placements?|placed|recruiters?|internships?|companies|packages?)\b",
    r"\b(exams?|examinations?|semester|syllabus|calendar|results?|timetable)\b",
)


def normalize_question(question: str) -> str:
    return " ".join(str(question or "").casefold().split()).strip(" .!?…")


def is_sensitive_question(question: str) -> bool:
    normalized = normalize_question(question)
    return any(re.search(pattern, normalized) for pattern in SENSITIVE_PATTERNS)


def is_acknowledgment(question: str) -> bool:
    normalized = normalize_question(question)
    return normalized in ACKNOWLEDGMENTS or normalized in THANKS


def is_college_question(question: str, history: list[dict] | None = None) -> bool:
    """Explicit college keywords only. History is intentionally ignored here."""
    normalized = normalize_question(question)
    if is_acknowledgment(question) or is_sensitive_question(question):
        return False
    return any(re.search(pattern, normalized) for pattern in COLLEGE_PATTERNS)


def out_of_scope_response() -> dict:
    return {
        "answer": (
            "I can only answer questions about SIETK college information. "
            "Please ask about its courses, faculty, fees, placements or facilities."
        ),
        "sources": [],
        "needs_support": False,
        "followups": SUGGESTED_QUESTIONS.copy(),
    }


def route_question(question: str) -> dict | None:
    normalized = normalize_question(question)

    if is_sensitive_question(question):
        return {"answer": RESTRICTED_ANSWER, "sources": [], "needs_support": False, "followups": []}

    if normalized in GREETING_RESPONSES:
        return {"answer": GREETING_RESPONSES[normalized], "sources": [], "needs_support": False, "followups": []}

    if normalized in THANKS:
        return {"answer": THANKS_RESPONSE, "sources": [], "needs_support": False, "followups": []}

    if normalized in ACKNOWLEDGMENTS:
        return {"answer": ACKNOWLEDGMENT_RESPONSE, "sources": [], "needs_support": False, "followups": []}

    if re.fullmatch(r"(?:what\s+is\s+)?\d+\s*[+\-*/]\s*\d+", normalized):
        return out_of_scope_response()

    return None