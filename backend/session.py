"""In-memory session manager for interview sessions."""

import uuid
import time
from typing import Optional
import os
from supabase import create_client, Client

url = os.environ.get("SUPABASE_URL", "")
key = os.environ.get("SUPABASE_KEY", "")

supabase: Client | None = None
if url and key:
    supabase = create_client(url, key)


# In-memory session store: {session_id: session_data}
_sessions: dict[str, dict] = {}


def create_session(topic: str, difficulty: str, user_id: str = None) -> tuple[str, dict]:
    """Create a new interview session. Returns (session_id, session_data)."""
    session_id = str(uuid.uuid4())
    session = {
        "user_id": user_id,
        "phase": "hr_intro",
        "topic": topic,
        "difficulty": difficulty,
        "start_time": time.time(),
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


def log_interview_completion(session_id: str):
    """Logs the final interview data to Supabase Postgres."""
    session = _sessions.get(session_id)
    if not session:
        print(f"!!! DB SYNC FAILED: Session {session_id} not found.")
        return
    
    if not supabase:
        print("!!! DB SYNC FAILED: Supabase client not initialized.")
        return

    user_id = session.get("user_id")
    if not user_id:
        print(f"!!! DB SYNC SKIPPED: No user_id for session {session_id}. (Guest session?)")
        return
    
    if session.get("logged"):
        return
        
    try:
        print(f"!!! ATTEMPTING DB SYNC for user {user_id}...")
        data = {
            "user_id": user_id,
            "topic": session["topic"],
            "difficulty": session["difficulty"],
            "final_code": session.get("final_code", ""),
            "score_out_of_10": session.get("score"),
            "feedback": session.get("final_feedback", "")
        }
        res = supabase.table("interviews").insert(data).execute()
        # Check for errors in the response
        if hasattr(res, 'error') and res.error:
            print(f"!!! DB SYNC FAILED: {res.error}")
        else:
            print(f"!!! DB SYNC SUCCESS: {res.data}")
            session["logged"] = True
    except Exception as e:
        print(f"!!! DB SYNC EXCEPTION: {type(e).__name__} - {str(e)}")
