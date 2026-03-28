"""AI service using Google Gemini for interview question generation.

Every AI call includes: current phase, topic, difficulty, user input, conversation history.
"""

import os
import json
import logging
import asyncio
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import errors
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load local .env if it exists
env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_path)

# API Configuration
API_KEYS = [
    os.getenv("GEMINI_API_KEY"),
    "AIzaSyByTucn1kRBfwz0G44X6ijYH_qKdckiU84" # Provided by user
]
# Filter out None values
API_KEYS = [k for k in API_KEYS if k]

class KeyManager:
    def __init__(self, keys: List[str]):
        self.keys = keys
        self.index = 0
        self.exhausted_keys = set()
        self.lock = asyncio.Lock()

    async def get_next_key(self) -> Optional[str]:
        async with self.lock:
            start_index = self.index
            while len(self.exhausted_keys) < len(self.keys):
                key = self.keys[self.index]
                self.index = (self.index + 1) % len(self.keys)
                if key not in self.exhausted_keys:
                    logger.info(f"Using API Key at index {self.keys.index(key)}")
                    return key
                if self.index == start_index:
                    break
            return None

    async def mark_exhausted(self, key: str):
        async with self.lock:
            if key not in self.exhausted_keys:
                logger.warning(f"API Key at index {self.keys.index(key)} marked as EXHAUSTED")
                self.exhausted_keys.add(key)

# Initialize global KeyManager
key_manager = KeyManager(API_KEYS)
MODEL = "gemini-2.0-flash" # Use flash for efficiency

SYSTEM_PROMPT = """You are a FAANG technical interviewer. 
Keep responses EXTREMELY conversational and short (max 2-3 sentences).
Do NOT use markdown (bolding, lists) as this is for TTS.
Always challenge logic. Ask ONLY one question at a time.
Encourage concise explanations."""

def _format_history(history: list[dict], max_messages: int = 4) -> str:
    """Minimized history to save tokens."""
    recent = history[-max_messages:] if len(history) > max_messages else history
    if not recent:
        return ""
    
    lines = []
    for msg in recent:
        role = "Candidate" if msg["role"] == "user" else "Interviewer"
        lines.append(f"{role}: {msg['content']}")
    return "\n".join(lines)

async def call_gemini(prompt: str, system_instruction: str = SYSTEM_PROMPT) -> str:
    """Robust call with rotation and retry logic."""
    for attempt in range(len(API_KEYS) + 1):
        key = await key_manager.get_next_key()
        if not key:
            return "ALL_KEYS_EXHAUSTED: Please try again later."

        client = genai.Client(api_key=key)
        try:
            # Use max_output_tokens to constrain quota usage
            response = await client.aio.models.generate_content(
                model=MODEL,
                contents=prompt,
                config={
                    "system_instruction": system_instruction,
                    "max_output_tokens": 150,
                    "temperature": 0.7
                }
            )
            return response.text.strip()
        except errors.ClientError as e:
            # Check for quota error (HTTP 429)
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                await key_manager.mark_exhausted(key)
                continue # Try next key
            
            # For other network errors, retry once with same key if it's the first attempt
            if attempt == 0:
                logger.info(f"Retrying network error: {str(e)}")
                await asyncio.sleep(1)
                continue
            
            return f"[API Error: {str(e)}]"
        except Exception as e:
            return f"[System Error: {str(e)}]"
    
    return "ERROR: Could not get response after rotating keys."

async def generate_response(
    phase: str,
    topic: str,
    difficulty: str,
    user_input: str,
    history: list[dict],
) -> str:
    """Optimized response generation."""
    history_text = _format_history(history)
    
    phase_instructions = {
        "hr_intro": "Start the interview. Ask for introduction.",
        "hr_followup": "Ask one follow-up on background.",
        "coding_problem": f"Present a {difficulty} {topic} problem. Be brief.",
        "discussion": "Challenge their approach/complexity. Short questions.",
        "coding": "Candidate is coding. Provide minimal, strict hints if stuck.",
        "technical": f"Ask one fundamental {topic} question.",
        "feedback": "Provide brief Rating (1-10) and Recommendation.",
    }
    instruction = phase_instructions.get(phase, "Continue interview.")

    full_prompt = f"PHASE: {phase}\nTOPIC: {topic}\nDIFFICULTY: {difficulty}\n\nINSTRUCTION: {instruction}\n\nHISTORY:\n{history_text}\n\nUSER: {user_input}"
    return await call_gemini(full_prompt)

async def evaluate_code(topic: str, difficulty: str, code: str) -> dict:
    """Evaluates code with a dedicated JSON prompt."""
    prompt = f"Evaluate this {topic} code ({difficulty}):\n\n{code}\n\nReturn ONLY JSON: {{'passed': bool, 'feedback': str, 'test_cases_output': str}}"
    
    # We use a slightly different system instruction for JSON output
    system_instr = "You are a code evaluator. Respond ONLY with valid JSON. Do not include markdown."
    
    raw_response = await call_gemini(prompt, system_instruction=system_instr)
    
    try:
        # Strip potential markdown if AI ignores instruction
        clean_json = raw_response.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:-3].strip()
        elif clean_json.startswith("```"):
            clean_json = clean_json[3:-3].strip()
            
        return json.loads(clean_json)
    except Exception as e:
        logger.error(f"Failed to parse JSON: {raw_response}")
        return {
            "passed": False, 
            "feedback": "Evaluation failed. Please try subbmitting again.", 
            "test_cases_output": "Error parsing AI response."
        }
