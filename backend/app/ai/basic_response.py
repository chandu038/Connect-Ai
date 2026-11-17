
import re

RESPONSES = {
    "hi": "Hello! How can I help you with college admissions?",
    "hello": "Hi! Welcome to Connect-Ai. How can I help you?",
    "hey": "Hey! What would you like to know?",
    "good morning": "Good morning! How can I help you?",
    "good afternoon": "Good afternoon! How can I help you?",
    "good evening": "Good evening! How can I help you?",
    "ok": "Alright! Let me know if you need anything else.",
    "okay": "Sure! Feel free to ask another question.",
    "Okay": "Sure! Feel free to ask another question.",
    "k": "Okay! I'm here if you need help.",
    "alright": "Alright!",
    "got it": "Great! Let me know if you have more questions.",
    "thanks": "You're welcome!",
    "thank you": "You're welcome! Happy to help.",
    "thank u": "You're welcome!",
    "thx": "You're welcome!",
    "bye": "Goodbye! Have a great day.",
    "goodbye": "Goodbye! Best wishes for your admission journey.",
    "who are you": (
        "I'm Connect-Ai, your college admissions assistant. "
        "I help you explore courses, eligibility, fees, "
        "scholarships, and facilities."
    ),
    "what can you do": (
        "I can answer questions about college admissions, "
        "courses, fees, eligibility, and facilities."
    ),
}


def get_basic_response(question: str) -> str | None:
    normalized = re.sub(
        r"[^\w\s]", "",
        question.strip().lower()
    )
    normalized = " ".join(normalized.split())
    return RESPONSES.get(normalized)
