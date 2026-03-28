"""AI service using Google Gemini for interview question generation.

Every AI call includes: current phase, topic, difficulty, user input, conversation history.
"""

import os
import json
from google import genai
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_path)

# Initialize client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-2.5-flash"

SYSTEM_PROMPT = """You are a FAANG-level technical interviewer conducting a real interview.
Your responses will be read aloud by a Text-to-Speech engine, so you MUST speak naturally using conversational cues (like "Alright", "Hmm", "Interesting").

DO NOT behave like a helpful assistant. Do NOT use markdown like bolding, bullet points, or numbered lists because it sounds weird when spoken.

STRICT RULES:
- Ask ONLY one question at a time
- NEVER provide full solutions
- ALWAYS challenge weak answers or logic loopholes
- If the candidate's approach has flaws, INTERRUPT them and ask for clarification immediately.
- Act like a collaborative but rigorous mentor—guide them if they are stuck but keep the pressure on.
- Ask "why" and "how"
- Ask time and space complexity
- Force explanation BEFORE coding
- Keep responses extremely conversational and short (1-2 sentences). Speak in plain English.

PHASE BEHAVIOR:

HR:
- Ask introduction
- Ask 1 follow-up about their experience

CODING PROBLEM:
- Provide ONE problem only
- Based on the given topic + difficulty
- State the problem clearly with examples
- DO NOT explain solution
- DO NOT give hints

DISCUSSION:
- Ask for their approach
- Challenge their logic
- Interrupt mistakes immediately
- Ask about complexity
- Push back on vague answers

CODING:
- Tell them to code their solution
- DO NOT guide much
- If they ask for help, give minimal hints only
- Point out bugs if you see them

TECHNICAL:
- Ask 1-2 fundamental CS questions related to the topic
- Example: "What's the difference between BFS and DFS?" or "Explain hash collisions"

FEEDBACK:
- Give a structured evaluation with:
  - Strengths (bullet points)
  - Weaknesses (bullet points)  
  - Overall rating (1-10)
  - Hire recommendation (Hire / No Hire / Lean Hire)

TONE:
- Professional
- Slightly strict
- Real interviewer energy
- Not a friendly chatbot
- Challenge everything"""


def _format_history(history: list[dict], max_messages: int = 10) -> str:
    """Format recent conversation history for context."""
    recent = history[-max_messages:] if len(history) > max_messages else history
    if not recent:
        return "No previous conversation."
    
    lines = []
    for msg in recent:
        role = "Candidate" if msg["role"] == "user" else "Interviewer"
        lines.append(f"{role}: {msg['content']}")
    return "\n".join(lines)


def _build_phase_instruction(phase: str, topic: str, difficulty: str) -> str:
    """Build phase-specific instruction for the AI."""
    instructions = {
        "hr_intro": "You are starting the interview. Ask the candidate to introduce themselves. Be professional but brief.",
        "hr_followup": "Ask ONE follow-up question about their background or experience. Be specific.",
        "coding_problem": f"Present ONE {difficulty}-level coding problem about {topic}. State the problem clearly with input/output examples. Do NOT explain the solution.",
        "discussion": "Ask the candidate to explain their approach to the problem. Challenge their logic. Ask about time and space complexity. Push back on vague answers.",
        "coding": "The candidate is coding. If they share code or ask questions, give minimal guidance. Point out obvious bugs. Do NOT write code for them.",
        "technical": f"Ask ONE fundamental computer science question related to {topic}. This should test deep understanding.",
        "feedback": "Provide a structured evaluation: Strengths, Weaknesses, Rating (1-10), and Hire Recommendation.",
    }
    return instructions.get(phase, "Continue the interview professionally.")


async def generate_response(
    phase: str,
    topic: str,
    difficulty: str,
    user_input: str,
    history: list[dict],
) -> str:
    """Generate an AI interviewer response using Gemini.
    
    Every call includes: phase, topic, difficulty, user input, and conversation history.
    """
    phase_instruction = _build_phase_instruction(phase, topic, difficulty)
    history_text = _format_history(history)

    user_prompt = f"""CURRENT PHASE: {phase}
TOPIC: {topic}
DIFFICULTY: {difficulty}

PHASE INSTRUCTION: {phase_instruction}

CONVERSATION HISTORY:
{history_text}

CANDIDATE'S LATEST INPUT: {user_input}

Respond as the interviewer for the current phase. Follow the phase instruction strictly."""

    try:
        response = await client.aio.models.generate_content(
            model=MODEL,
            contents=[
                {"role": "user", "parts": [{"text": f"SYSTEM: {SYSTEM_PROMPT}\n\n{user_prompt}"}]}
            ],
        )
        return response.text.strip()
    except Exception as e:
        return f"[Interview system error: {str(e)}. Please try again.]"

async def evaluate_code(topic: str, difficulty: str, code: str) -> dict:
    """Evaluate user code using Gemini and return JSON pass/fail status."""
    prompt = f"""You are a technical interviewer evaluating a {difficulty} coding problem about {topic}.
The candidate submitted the following Python code:
```python
{code}
```
Run mental test cases to check if this code perfectly solves a typical {difficulty} problem about {topic}.
Return ONLY a valid JSON object with EXACTLY these keys:
- "passed": true if the code is completely correct, false if it has bugs or logic errors.
- "feedback": "A short 1-2 sentence explanation of what is wrong, or 'Perfect solution!' if correct."
- "test_cases_output": "A short summary of test cases run and their results."

Do not include any markdown formatting, only the raw JSON object."""

    try:
        response = await client.aio.models.generate_content(
            model=MODEL,
            contents=[{"role": "user", "parts": [{"text": prompt}]}]
        )
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
        return json.loads(text)
    except Exception as e:
        return {"passed": False, "feedback": f"System error evaluating code: {str(e)}", "test_cases_output": "Error"}
