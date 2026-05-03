import os
import json
import re
from typing import Dict, Any, List
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from .env file
load_dotenv()

# Configure OpenAI Client
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    print("[WARNING] OPENAI_API_KEY missing — OpenAI disabled")
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# Configure Groq Client (OpenAI-compatible interface)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("[WARNING] GROQ_API_KEY missing — Groq disabled")
groq_client = OpenAI(
    api_key=GROQ_API_KEY,
    base_url="https://api.groq.com/openai/v1"
) if GROQ_API_KEY else None


# Safe fallback — returned when AI fails or returns invalid data
EVALUATION_FALLBACK = {
    "coverage_score": 20,
    "depth_score": 20,
    "clarity_score": 40,
    "feedback": "Answer is relevant but incomplete.",
    "missing_points": ["Add more key concepts and explanation"]
}

# Groq model priority list — tries in order, falls back to OpenAI if all fail
GROQ_MODELS = [
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768"
]

def validate_language(text: str, language: str) -> bool:
    """Checks if text matches the target language using script detection."""
    if not text or len(text.strip()) < 5: return True
    
    if language == "en":
        # Reject if contains Devanagari or Bengali scripts
        if re.search(r'[\u0900-\u09FF]', text):
            return False
        return True
    elif language == "hi":
        # Must contain Devanagari script
        return bool(re.search(r'[\u0900-\u097F]', text))
    elif language == "bn":
        # Must contain Bengali script
        return bool(re.search(r'[\u0980-\u09FF]', text))
    return True

def is_result_language_valid(result: Dict[str, Any], language: str) -> bool:
    """Validates language across all text fields in the result."""
    check_fields = ["feedback", "improved_answer", "summary"]
    text_blobs = []
    for f in check_fields:
        val = result.get(f)
        if val and isinstance(val, str): text_blobs.append(val)
    
    missing = result.get("missing_points")
    if missing and isinstance(missing, list):
        text_blobs.extend([str(m) for m in missing])
    
    if not text_blobs: return True
    return validate_language(" ".join(text_blobs), language)

LANGUAGE_FALLBACK_MSGS = {
    "en": "Unable to generate response in selected language.",
    "hi": "चयनित भाषा में उत्तर उत्पन्न करने में असमर्थ।",
    "bn": "নির্বাচিত ভাষায় উত্তর তৈরি করা সম্ভব হয়নি।"
}

def _clamp_scores(result: Dict[str, Any]) -> Dict[str, Any]:
    """Clamp all scores to valid 0–100 integer range.
    
    Additionally: if coverage_score > 0 (answer has some relevance),
    ensure depth and clarity are also at least 1 to avoid unfair zeros.
    """
    for key in ("coverage_score", "depth_score", "clarity_score"):
        raw = result.get(key, 0)
        try:
            result[key] = max(0, min(100, int(raw)))
        except (TypeError, ValueError):
            result[key] = 0

    # Minimum score clamp: if coverage indicates any relevance, scores must be >= 1
    if result.get("coverage_score", 0) > 0:
        for key in ("depth_score", "clarity_score"):
            result[key] = max(1, result[key])

    return result


def _parse_json_response(text: str) -> Dict[str, Any]:
    """Strip markdown fences and parse JSON. Returns {} on failure."""
    try:
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        return json.loads(text.strip())
    except (json.JSONDecodeError, IndexError):
        return {}


async def get_evaluation_ai(question: str, answer: str, marks: int = 5, subject: str = "theory", language: str = "en") -> Dict[str, Any]:
    """
    Performs strict academic evaluation of a student's answer.
    Always returns a valid result — never raises to the caller.
    """
    try:
        # Reference context (reserved for future enrichment)
        reference_context = ""
        context_block = f"\nREFERENCE CONTEXT (use to verify, do NOT copy):\n{reference_context}\n" if reference_context else ""

        lang_map = {"en": "English", "hi": "Hindi", "bn": "Bengali"}
        target_lang = lang_map.get(language, "English")
        lang_inst = {
            "en": "Respond ONLY in English. Do NOT use any Hindi or Bengali words.",
            "hi": "केवल हिंदी में उत्तर दें। किसी भी अंग्रेज़ी या बंगाली शब्द का उपयोग न करें।",
            "bn": "শুধুমাত্র বাংলায় উত্তর দিন। ইংরেজি বা হিন্দি ব্যবহার করবেন না।"
        }
        
        prompt = f"""
{lang_inst.get(language, "Respond in English.")}

IMPORTANT:
- Do NOT mix languages
- Do NOT include translations
- Output must be strictly in the selected language ({target_lang})
- Every text field (feedback, missing_points, ideal_answer) MUST be in {target_lang}.

You are a strict academic evaluator. Evaluate the student's answer using exam-level standards.
{context_block}
CONTEXT (Weightage Standards)
Marks:
- 2 → Word Range: 20–50. Basic Identification/Definition. Direct, single-point answer.
- 5 → Word Range: 90–140. Conceptual Explanation. Definition + explanation + 2–3 key points.
- 10 → Word Range: 200–350. Advanced Structured Explanation. Intro + Body (4–6 points) + Conclusion.

Subject: {subject}
- theory → concepts, explanation, structure
- numerical → correctness, formulas, steps
- coding → logic, correctness, approach

TASK
1. Internally identify 4–8 key points for a full-mark answer.
2. Compare the student answer against these key points.

SCORING (0–100 integers only)

coverage_score:
- % of key points present (e.g., 3/6 ≈ 50)
- CRITICAL: Coverage (key points) > Word count. Reward relevant content even if concise.

depth_score:
- explanation quality relative to marks
- short answers MUST score low for 5/10 marks if they lack the required depth/explanation

clarity_score:
- structure, readability, coherence

RULES
- Be strict (exam style)
- Do NOT reward vague or generic answers
- If the answer is relevant but incomplete → assign LOW but NON-ZERO scores (e.g. 10–30)
- NEVER assign 0 to an answer that contains even one relevant concept or keyword
- Only assign 0 for completely irrelevant, nonsense, or blank answers
- Penalize missing concepts heavily but proportionally
- Clarity must NOT compensate for low coverage or depth
- Do NOT overestimate
- Partial credit is fair: a 3/5-mark answer should score ~50–60, not 0

OUTPUT CONSTRAINTS
- missing_points ≤ 5
- feedback MUST scale based on marks:
  * 2 Marks → Short (1–2 lines), focused only on correctness.
  * 5 Marks → Moderate (2–4 lines), including brief explanation and missing concepts.
  * 10 Marks → Detailed and structured. MUST include: Strengths, Weaknesses, and Improvement Suggestions in a multi-line format.
- Set 'ideal_answer' in the output JSON to an empty string "".

INPUT
Q: {question}
A: {answer}
Marks: {marks}

OUTPUT (JSON ONLY)
Return valid JSON only (no markdown, no extra text).
If unable, return {{}}.

{{
  "coverage_score": number,
  "depth_score": number,
  "clarity_score": number,
  "feedback": "string",
  "missing_points": ["point1", "point2"],
  "ideal_answer": "a perfect model answer following the word range and structure for {marks} marks"
}}
"""

        messages = [{"role": "user", "content": prompt}]
        response = None

        if groq_client:
            for model in GROQ_MODELS:
                try:
                    print(f"[AI MODEL TRY] {model}")
                    response = groq_client.chat.completions.create(
                        model=model,
                        messages=messages,
                        max_tokens=800,
                        temperature=0.2
                    )
                    print(f"[AI MODEL SUCCESS] {model}")
                    break
                except Exception as e:
                    print(f"[MODEL FAILED] {model} → {e}")
                    continue

        if response is None:
            print("[GROQ FAILED COMPLETELY] Switching to OpenAI")
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.2
            )

        result = _parse_json_response(response.choices[0].message.content)

        # Language Validation + Retry Logic
        if result and not is_result_language_valid(result, language):
            print(f"[LANGUAGE MISMATCH] Retrying with stronger instruction for {language}")
            retry_prompt = prompt + "\n\nSTRICTLY follow the language rules. Previous response violated them. Output must be 100% in " + target_lang
            retry_messages = [{"role": "user", "content": retry_prompt}]
            
            try:
                retry_response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=retry_messages,
                    temperature=0.1
                )
                result = _parse_json_response(retry_response.choices[0].message.content)
            except: pass

            # If still invalid, enforce localized fallback
            if result and not is_result_language_valid(result, language):
                print("[LANGUAGE MISMATCH] Second failure, applying fallback message")
                msg = LANGUAGE_FALLBACK_MSGS.get(language, "Language mismatch")
                if "feedback" in result: result["feedback"] = msg
                if "missing_points" in result: result["missing_points"] = [msg]

        # Validate required fields; fall back if missing
        required = {"coverage_score", "depth_score", "clarity_score", "feedback", "missing_points"}
        if not result or not required.issubset(result.keys()):
            print("Evaluation: missing fields, using fallback.")
            return dict(EVALUATION_FALLBACK)

        return _clamp_scores(result)

    except Exception as e:
        print("[AI ERROR]", e)
        print(f"Evaluation Error: {e}")
        return dict(EVALUATION_FALLBACK)


async def get_improvement_ai(question: str, answer: str, marks: int = 5, language: str = "en") -> Dict[str, Any]:
    """
    Suggests a high-quality, improved version of the student's answer based on marks weightage.
    """
    try:
        lang_map = {"en": "English", "hi": "Hindi", "bn": "Bengali"}
        target_lang = lang_map.get(language, "English")
        lang_inst = {
            "en": "Respond ONLY in English. Do NOT use any Hindi or Bengali words.",
            "hi": "केवल हिंदी में उत्तर दें। किसी भी अंग्रेज़ी या बंगाली शब्द का उपयोग न करें।",
            "bn": "শুধুমাত্র বাংলায় উত্তর দিন। ইংরেজি বা হিন্দি ব্যবহার করবেন না।"
        }

        prompt = f"""
{lang_inst.get(language, "Respond in English.")}

IMPORTANT:
- Do NOT mix languages
- Do NOT include translations
- Output must be strictly in the selected language ({target_lang})
- The field 'improved_answer' MUST be entirely in {target_lang}.

You are a expert tutor. You help students refine their answers.

Improve the student's answer to achieve full marks based on the following standards:

MARKS-BASED STANDARDS:
- 2 Marks: 20–50 words. Short, direct, single-point answer. No unnecessary explanation.
- 5 Marks: 90–140 words. Moderate explanation. 2–3 key points. Structure: intro + explanation.
- 10 Marks: 200–350 words. Fully structured: Introduction, detailed explanation with 4–6 key points, and a conclusion.

STRICT UX RULE:
- The same question MUST produce DIFFERENT structures and depths based on marks ({marks}).
- Ensure the tone is professional and exam-ready.

Rules:
- Keep it exam-ready
- Keep it clear and structured
- Fix mistakes but preserve intent
- Coverage (key points) is more important than word count, but stay within the range.

Q: {question}
Answer: {answer}
Marks: {marks}

OUTPUT (JSON ONLY)
Return strictly valid JSON only.

{{
  "improved_answer": "refined version of student response in the target language"
}}
"""

        messages = [{"role": "user", "content": prompt}]
        response = None

        if groq_client:
            for model in GROQ_MODELS:
                try:
                    print(f"[AI MODEL TRY] {model}")
                    response = groq_client.chat.completions.create(
                        model=model,
                        messages=messages,
                        max_tokens=800,
                        temperature=0.2
                    )
                    print(f"[AI MODEL SUCCESS] {model}")
                    break
                except Exception as e:
                    print(f"[MODEL FAILED] {model} → {e}")
                    continue

        if response is None:
            print("[GROQ FAILED COMPLETELY] Switching to OpenAI")
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages,
                temperature=0.2
            )

        result = _parse_json_response(response.choices[0].message.content)

        # Language Validation + Retry Logic
        if result and not is_result_language_valid(result, language):
            print(f"[IMPROVEMENT LANGUAGE MISMATCH] Retrying with stronger instruction for {language}")
            retry_prompt = prompt + "\n\nSTRICTLY follow the language rules. Output must be 100% in " + target_lang
            retry_messages = [{"role": "user", "content": retry_prompt}]
            
            try:
                retry_response = openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=retry_messages,
                    temperature=0.1
                )
                result = _parse_json_response(retry_response.choices[0].message.content)
            except: pass

            # If still invalid, enforce localized fallback
            if result and not is_result_language_valid(result, language):
                print("[IMPROVEMENT LANGUAGE MISMATCH] Second failure, applying fallback message")
                msg = LANGUAGE_FALLBACK_MSGS.get(language, "Language mismatch")
                if "improved_answer" in result: result["improved_answer"] = msg

        if not result or "improved_answer" not in result:
            return {"improved_answer": "Unable to generate improvement at this time."}

        return result

    except Exception as e:
        print("[AI ERROR]", e)
        print(f"Improvement Error: {e}")
        return {"improved_answer": "Unable to generate improvement at this time."}
