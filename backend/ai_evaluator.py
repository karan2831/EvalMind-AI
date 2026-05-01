import os
import json
from typing import Dict, Any
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

        # Language naming mapping
        lang_map = {"en": "English", "hi": "Hindi", "bn": "Bengali"}
        target_lang = lang_map.get(language, "English")

        prompt = f"""
You are a strict academic evaluator. Evaluate the student's answer using exam-level standards.

LANGUAGE RULE:
- Target Language: {target_lang}
- AUTO-MATCH: If the student's question or answer is written in Hindi or Bengali, you SHOULD automatically respond in that same language to match the student's context, unless {target_lang} is explicitly different from English.
- You MUST always output your evaluation (especially 'feedback' and 'missing_points') in the detected/selected language only.
- Compare the meaning and concepts — NOT word-for-word translation.
{context_block}
CONTEXT
Marks:
- 2 → short, direct answer expected
- 5 → moderate explanation with key concepts
- 10 → detailed, structured answer required

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

depth_score:
- explanation quality relative to marks
- short answers MUST score low for 5/10 marks

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
- Do NOT assume missing facts
- Do NOT overestimate
- Partial credit is fair: a 3/5-mark answer should score ~50–60, not 0

OUTPUT CONSTRAINTS
- missing_points ≤ 5
- feedback must be short and specific
- Do NOT include model_answer in output

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
  "missing_points": ["point1", "point2"]
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


async def get_improvement_ai(question: str, answer: str, language: str = "en") -> Dict[str, Any]:
    """
    Suggests a high-quality, improved version of the student's answer.
    """
    try:
        # Language naming mapping
        lang_map = {"en": "English", "hi": "Hindi", "bn": "Bengali"}
        target_lang = lang_map.get(language, "English")

        prompt = f"""
You are a expert tutor. You help students refine their answers.

LANGUAGE RULE:
- The question or answer may be in English, Hindi, or Bengali.
- You MUST always write the improved answer in {target_lang} only.
- AUTO-MATCH: If the input is in Hindi or Bengali, match that language for the output.
- Generate improved answer in the selected/detected language ({target_lang}).
- Understand the intent of the student's answer regardless of language.

Improve the student's answer to achieve full marks.

Rules:
- Keep it exam-ready
- Keep it clear and structured
- Fix mistakes but preserve intent
- Do not add unnecessary fluff
- Maximum 120 words

Q: {question}
Answer: {answer}

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

        if not result or "improved_answer" not in result:
            return {"improved_answer": "Unable to generate improvement at this time."}

        return result

    except Exception as e:
        print("[AI ERROR]", e)
        print(f"Improvement Error: {e}")
        return {"improved_answer": "Unable to generate improvement at this time."}
