"""In-memory session manager for interview sessions."""

import uuid
from typing import Optional


# In-memory session store: {session_id: session_data}
_sessions: dict[str, dict] = {}


def create_session(topic: str, difficulty: str) -> tuple[str, dict]:
    """Create a new interview session. Returns (session_id, session_data)."""
    session_id = str(uuid.uuid4())
    session = {
        "phase": "hr_intro",
        "topic": topic,
        "difficulty": difficulty,
        "step": 0,
        "coding_started": False,
        "coding_done": False,
        "coding_attempts": 0,
        "history": [],  # list of {"role": "user"|"ai", "content": str}
    }
    _sessions[session_id] = session
    return session_id, session


def get_session(session_id: str) -> Optional[dict]:
    """Retrieve a session by ID. Returns None if not found."""
    return _sessions.get(session_id)


def update_session(session_id: str, updates: dict) -> Optional[dict]:
    """Update a session with the given dict. Returns updated session or None."""
    session = _sessions.get(session_id)
    if session is None:
        return None
    session.update(updates)
    return session


def add_to_history(session_id: str, role: str, content: str) -> None:
    """Append a message to the session's conversation history."""
    session = _sessions.get(session_id)
    if session is not None:
        session["history"].append({"role": role, "content": content})
