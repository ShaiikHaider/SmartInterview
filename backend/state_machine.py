"""Strict state machine for interview phase transitions.

The backend ALWAYS decides the phase. AI NEVER decides the phase.
"""

PHASES = [
    "hr_intro",
    "hr_followup",
    "coding_problem",
    "discussion",
    "coding",
    "technical",
    "feedback",
]


def next_phase(session: dict, user_input: str) -> str:
    """Determine the next phase based on current session state and user input.
    
    This is the ONLY place phase transitions happen.
    AI must NEVER control phase transitions.
    """
    current = session["phase"]

    if current == "hr_intro":
        return "hr_followup"

    elif current == "hr_followup":
        return "coding_problem"

    elif current == "coding_problem":
        return "discussion"

    elif current == "discussion":
        return "discussion"

    elif current == "coding":
        # Stay in coding until user explicitly says "done"
        if "done" in user_input.lower():
            return "technical"
        return "coding"

    elif current == "technical":
        return "feedback"

    elif current == "feedback":
        # Interview is over, stay in feedback
        return "feedback"

    return current


def should_show_editor(phase: str) -> bool:
    """Editor is ONLY visible during the coding phase."""
    return phase == "coding"
