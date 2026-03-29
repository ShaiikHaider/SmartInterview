"""AI service using Groq for fast interview question generation."""

import os
import json
import logging
import asyncio
import time
from typing import List, Dict, Any, Optional
from groq import AsyncGroq, GroqError, RateLimitError
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path=env_path, override=True)

API_KEYS = [os.getenv("GROQ_API_KEY")]
API_KEYS = [k for k in API_KEYS if k]

if not API_KEYS:
    logger.error("❌ NO API KEYS FOUND! Check if GROQ_API_KEY is set in .env")
else:
    logger.info(f"✅ Loaded {len(API_KEYS)} API key(s).")

class KeyManager:
    def __init__(self, keys: List[str]):
        self.keys = keys
        self.index = 0
        self.exhausted_keys = {}
        self.lock = asyncio.Lock()
        self.cooldown_seconds = 60

    async def get_next_key(self) -> Optional[str]:
        async with self.lock:
            start_index = self.index
            current_time = time.time()
            keys_to_reset = [k for k, t in self.exhausted_keys.items() if current_time - t > self.cooldown_seconds]
            for k in keys_to_reset:
                logger.info(f"Key at index {self.keys.index(k)} cooled down and is now AVAILABLE again.")
                del self.exhausted_keys[k]

            while len(self.exhausted_keys) < len(self.keys):
                key = self.keys[self.index]
                self.index = (self.index + 1) % len(self.keys)
                if key not in self.exhausted_keys:
                    return key
                if self.index == start_index:
                    break
            
            logger.error("❌ ALL KEYS EXHAUSTED")
            return None

    async def mark_exhausted(self, key: str, reason: str = "Unknown"):
        async with self.lock:
            if key not in self.exhausted_keys:
                logger.warning(f"⚠️ API Key EXHAUSTED. Reason: {reason}")
                self.exhausted_keys[key] = time.time()

key_manager = KeyManager(API_KEYS)
MODEL = "llama-3.3-70b-versatile"

SYSTEM_PROMPT = """You are a rigorous FAANG technical interviewer. 
Keep responses EXTREMELY conversational, natural, and short (max 2-3 sentences).
Do NOT use markdown (bolding, lists) as this is spoken via Text-to-Speech.
You must actively interrupt and disagree if the candidate's approach is flawed, suboptimal, or if they haven't clarified constraints.
Play "bad cop" when probing time/space complexity. Ask ONLY one question at a time.
If the candidate is in the Discussion phase, DO NOT let them write code until they have clearly explained their approach and validated edge cases. 
Once you are 100% satisfied with their problem-solving approach and are ready for them to begin coding, you MUST append the exact string [START_CODING] to the very end of your response."""

def _format_history_messages(history: list[dict], max_messages: int = 4) -> list[dict]:
    recent = history[-max_messages:] if len(history) > max_messages else history
    messages = []
    for msg in recent:
        role = "user" if msg["role"] == "user" else "assistant"
        messages.append({"role": role, "content": msg['content']})
    return messages

async def call_groq(messages: list[dict], system_instruction: str = SYSTEM_PROMPT, json_mode: bool = False) -> str:
    for attempt in range(len(API_KEYS) + 1):
        key = await key_manager.get_next_key()
        if not key:
            return "I hit my Groq API limit! Give me 60 seconds."
            
        client = AsyncGroq(api_key=key)
        all_msgs = [{"role": "system", "content": system_instruction}] + messages
        
        try:
            kwargs = {
                "model": MODEL,
                "messages": all_msgs,
                "temperature": 0.7,
            }
            if json_mode:
                kwargs["response_format"] = {"type": "json_object"}
                kwargs["temperature"] = 0.1
                
            response = await client.chat.completions.create(**kwargs)
            return response.choices[0].message.content.strip()
            
        except RateLimitError as e:
            await key_manager.mark_exhausted(key, reason=str(e))
            continue
        except GroqError as e:
            if attempt == 0:
                await asyncio.sleep(1)
                continue
            return f"[API Error: {str(e)}]"
        except Exception as e:
            return f"[System Error: {str(e)}]"
    
    return "ERROR: Could not get response after rotating keys."

async def call_groq_stream(messages: list[dict], system_instruction: str = SYSTEM_PROMPT):
    for attempt in range(len(API_KEYS) + 1):
        key = await key_manager.get_next_key()
        if not key:
            yield "I hit my Groq API limit! Give me 60 seconds."
            return
            
        client = AsyncGroq(api_key=key)
        all_msgs = [{"role": "system", "content": system_instruction}] + messages
        
        try:
            stream = await client.chat.completions.create(
                model=MODEL,
                messages=all_msgs,
                temperature=0.7,
                stream=True
            )
            async for chunk in stream:
                if chunk.choices[0].delta.content is not None:
                    yield chunk.choices[0].delta.content
            return
            
        except RateLimitError as e:
            await key_manager.mark_exhausted(key, reason=str(e))
            continue
        except GroqError as e:
            if attempt == 0:
                await asyncio.sleep(1)
                continue
            yield f"[API Error: {str(e)}]"
            return
        except Exception as e:
            yield f"[System Error: {str(e)}]"
            return
    
    yield "ERROR: Could not get response after rotating keys."

async def generate_response(phase: str, topic: str, difficulty: str, user_input: str, history: list[dict]) -> str:
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
    
    sys_prompt = f"{SYSTEM_PROMPT}\n\nCURRENT PHASE: {phase}\nTOPIC: {topic}\nDIFFICULTY: {difficulty}\n\nINSTRUCTION FOR THIS TURN: {instruction}"
    
    msgs = _format_history_messages(history)
    msgs.append({"role": "user", "content": user_input})
    
    return await call_groq(msgs, sys_prompt)

async def generate_response_stream(phase: str, topic: str, difficulty: str, user_input: str, history: list[dict], silence_count: int = 0):
    phase_instructions = {
        "hr_intro": "Start the interview. Ask a short behavioral intro question.",
        "hr_followup": "Ask one quick follow-up on their background.",
        "coding_problem": f"Present a {difficulty} problem regarding {topic}. Keep it brief without giving away the approach.",
        "discussion": "The candidate is explaining their approach. Be critical. Ask about constraints, edge cases, and Time/Space complexity. If they are completely correct and you are satisfied, tell them to start coding and append [START_CODING].",
        "coding": "Candidate is coding. Provide minimal, strict hints if stuck.",
        "technical": f"Ask one fundamental {topic} question.",
        "feedback": "Provide brief Rating (1-10) and Recommendation.",
    }
    instruction = phase_instructions.get(phase, "Continue interview.")

    if silence_count > 0:
        if silence_count == 1:
            instruction = "Candidate is silent. Ask gently 'Take your time...' or 'Are you there?'"
        elif silence_count == 2:
            instruction = "Candidate has been silent. Ask 'Do you need a hint?' or 'What are you thinking?'"
        else:
            instruction = "Candidate is unresponsive. Say 'Let's move forward' or quickly summarize."

    sys_prompt = f"{SYSTEM_PROMPT}\n\nCURRENT PHASE: {phase}\nTOPIC: {topic}\nDIFFICULTY: {difficulty}\n\nINSTRUCTION FOR THIS TURN: {instruction}"
    
    msgs = _format_history_messages(history)
    msgs.append({"role": "user", "content": user_input})
    
    async for chunk in call_groq_stream(msgs, sys_prompt):
        yield chunk

async def evaluate_code(topic: str, difficulty: str, code: str) -> dict:
    sys_prompt = "You are a code evaluator. Respond ONLY with a valid JSON object matching the exact schema provided. Do not include markdown formatting or reasoning."
    user_prompt = f"Evaluate this {topic} code ({difficulty}):\n\n```python\n{code}\n```\n\nReturn JSON: {{\"passed\": true/false, \"feedback\": \"short explanation\", \"test_cases_output\": \"results of mental test cases\"}}"
    
    raw_response = await call_groq([{"role": "user", "content": user_prompt}], sys_prompt, json_mode=True)
    
    try:
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
            "feedback": "Evaluation failed JSON parse.", 
            "test_cases_output": "Error parsing AI response."
        }
