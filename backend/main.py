from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import sys
import os
import json
import httpx

# Safe imports for folder structure
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.session import create_session, get_session, add_to_history
from backend.state_machine import next_phase, should_show_editor
from backend.ai_service import generate_response


app = FastAPI(title="AI Interview Coach")

# CORS for frontend (Allow all for simplified Vercel/Render communication)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



# --- Request / Response models ---

class StartRequest(BaseModel):
    topic: str
    difficulty: str
    user_id: Optional[str] = None


class StartResponse(BaseModel):
    session_id: str
    message: str
    phase: str
    showEditor: bool
    start_time: float


class MessageRequest(BaseModel):
    session_id: str
    message: str


class MessageResponse(BaseModel):
    phase: str
    message: str
    showEditor: bool


class MessageStreamRequest(BaseModel):
    session_id: str
    message: str
    silence_count: int = 0


class ExecuteRequest(BaseModel):
    session_id: str
    code: str
    language: str = "python"

class ExecuteResponse(BaseModel):
    passed: bool
    feedback: str
    test_cases_output: str
    phase: str

async def run_python_code(code: str) -> dict:
    """Executes python code securely using a local subprocess."""
    import sys
    import subprocess
    import tempfile
    import asyncio
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(code)
        temp_path = f.name
        
    try:
        # Run code with a 5 second timeout
        res = await asyncio.to_thread(
            subprocess.run, 
            [sys.executable, temp_path], 
            capture_output=True, 
            text=True, 
            timeout=5.0
        )
        output = ""
        if res.stderr:
            output += res.stderr + "\n"
        output += res.stdout
        return {"success": res.returncode == 0, "output": output.strip() or "Code executed with no output."}
    except subprocess.TimeoutExpired:
        return {"success": False, "output": "Execution Error: Code timed out after 5 seconds. Check for infinite loops."}
    except Exception as e:
        return {"success": False, "output": f"Execution Engine Error: {str(e)}"}
    finally:
        try:
            os.remove(temp_path)
        except:
            pass


@app.post("/execute", response_model=ExecuteResponse)
async def execute_code(req: ExecuteRequest):
    """Executes the user's code against Piston to get real stack traces, then feeds it to AI."""
    from backend.ai_service import evaluate_code
    
    session = get_session(req.session_id)
    
    # 1. Real Code Execution via Subprocess
    exec_res = await run_python_code(req.code)
    actual_output = exec_res["output"]
    
    # 2. Ask AI to evaluate if this output constitutes a solved problem
    eval_result = await evaluate_code(session["topic"], session["difficulty"], req.code, actual_output)
    
    user_msg = f"[Submitted Code for Evaluation]\n```python\n{req.code}\n```"
    ai_msg = f"⏱️ **Execution Engine Output:**\n```\n{actual_output}\n```\n\nAI Evaluation:\nPassed: {eval_result['passed']}\nFeedback: {eval_result['feedback']}"
    
    add_to_history(req.session_id, "user", user_msg)
    
    if eval_result["passed"]:
        session["phase"] = "technical"
        ai_msg += "\n\nLet's move to the technical questions."
    else:
        if session["coding_attempts"] >= 2:
            session["phase"] = "feedback"
            ai_msg += "\n\nMaximum attempts reached. Moving to final review."
        else:
            ai_msg += "\n\nPlease fix the issues and try again."

    add_to_history(req.session_id, "ai", ai_msg)
    
    return ExecuteResponse(
        passed=eval_result["passed"],
        feedback=eval_result["feedback"],
        test_cases_output=actual_output,
        phase=session["phase"]
    )

# --- Endpoints ---

@app.post("/start", response_model=StartResponse)
async def start_interview(req: StartRequest):
    """Start a new interview session.
    
    Creates session, generates HR intro via AI, returns first message.
    """
    print(f"!!! Received start request for {req.topic} {req.difficulty} ({req.user_id})", flush=True)
    session_id, session = create_session(req.topic, req.difficulty, req.user_id)

    print(f"!!! Session created: {session_id}. Calling AI...", flush=True)
    # Generate the opening HR question via AI
    ai_message = await generate_response(
        phase=session["phase"],
        topic=session["topic"],
        difficulty=session["difficulty"],
        user_input="[Interview starting]",
        history=[],
    )

    # Record AI message in history
    add_to_history(session_id, "ai", ai_message)

    return StartResponse(
        session_id=session_id,
        message=ai_message,
        phase=session["phase"],
        showEditor=should_show_editor(session["phase"]),
        start_time=session["start_time"]
    )


@app.post("/message", response_model=MessageResponse)
async def send_message(req: MessageRequest):
    """Process a user message during the interview.
    
    Flow: receive input → advance state machine → call AI → return response.
    Backend ALWAYS controls phase transitions. AI NEVER decides phase.
    """
    session = get_session(req.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    # Record user message
    add_to_history(req.session_id, "user", req.message)

    # State machine decides next phase (NOT the AI)
    new_phase = next_phase(session, req.message)
    session["phase"] = new_phase
    session["step"] += 1

    # Generate AI response for the new phase
    ai_message = await generate_response(
        phase=new_phase,
        topic=session["topic"],
        difficulty=session["difficulty"],
        user_input=req.message,
        history=session["history"],
    )

    # Record AI response
    add_to_history(req.session_id, "ai", ai_message)

    return MessageResponse(
        phase=new_phase,
        message=ai_message,
        showEditor=should_show_editor(new_phase),
    )


from fastapi.responses import StreamingResponse

@app.post("/message_stream")
async def send_message_stream(req: MessageStreamRequest):
    """Process a user message and return a streamed AI response using SSE."""
    from backend.ai_service import generate_response_stream
    
    session = get_session(req.session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    is_silence = req.message == "[SILENCE]"

    # Record user message if it's not silence
    if not is_silence:
        add_to_history(req.session_id, "user", req.message)

    # State machine decides next phase
    new_phase = next_phase(session, req.message if not is_silence else "")
    session["phase"] = new_phase
    if not is_silence:
        session["step"] += 1

    show_editor = should_show_editor(new_phase)

    async def event_generator():
        # First send the state changes so UI can apply phase/editor visibility
        init_data = json.dumps({"type": "init", "phase": new_phase, "showEditor": show_editor})
        yield f"data: {init_data}\n\n"

        full_response = ""
        async for chunk in generate_response_stream(
            phase=new_phase,
            topic=session["topic"],
            difficulty=session["difficulty"],
            user_input=req.message,
            history=session["history"],
            silence_count=req.silence_count
        ):
            full_response += chunk
            chunk_data = json.dumps({"type": "chunk", "content": chunk})
            yield f"data: {chunk_data}\n\n"

        # Sync backend session state if AI triggered a transition
        if "[START_CODING]" in full_response and session["phase"] == "discussion":
            session["phase"] = "coding"

        # Record AI response
        add_to_history(req.session_id, "ai", full_response)
        
        if new_phase == "feedback":
            import re
            # Much more robust regex: catches "7/10", "7 out of 10", "Score: 7", etc.
            score = 5 # Default
            match = re.search(r'(\d{1,2})\s*(?:/|out of)\s*10', full_response, re.IGNORECASE)
            if match:
                score = int(match.group(1))
            else:
                # Fallback: just look for the first number 1-10 near the word "score" or "rating"
                match_fallback = re.search(r'(?:score|rating|out of 10).*?(\d{1,2})', full_response, re.IGNORECASE | re.DOTALL)
                if match_fallback:
                    score = int(match_fallback.group(1))
            
            session["score"] = min(10, max(0, score))
            session["final_feedback"] = full_response
            from backend.session import log_interview_completion
            log_interview_completion(req.session_id)
        
        # Signal that stream is done
        done_data = json.dumps({"type": "done"})
        yield f"data: {done_data}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/health")
async def health():
    return {"status": "ok"}
# Force reload for new API key
