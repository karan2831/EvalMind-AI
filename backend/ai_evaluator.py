import os
import json
from google import genai
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure Gemini API Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("❌ GEMINI_API_KEY is missing. Please set it in environment variables.")

print("[GEMINI INIT] Using key:", GEMINI_API_KEY[:6] + "****")

client = genai.Client(api_key=GEMINI_API_KEY)

# Startup test to verify API key works
try:
    _test = client.models.generate_content(
        model="gemini-1.0-pro",
        contents=[{
            "role": "user",
            "parts": [{"text": "Hello"}]
        }]
    )
    print("✅ Gemini API key working")
except Exception as _e:
    print("❌ Gemini API key invalid or no access:", _e)

# Safe fallback — returned when AI fails or returns invalid data
EVALUATION_FALLBACK = {
    "coverage_score": 20,
    "depth_score": 20,
    "clarity_score": 40,
    "feedback": "Answer is relevant but incomplete.",
    "missing_points": ["Add more key concepts and explanation"]
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


async def get_evaluation_ai(question: str, answer: str, marks: int = 5, subject: str = "theory") -> Dict[str, Any]:
    """
    Performs strict academic evaluation of a student's answer.
    Always returns a valid result — never raises to the caller.
    """
    try:
        prompt = f"""
You are a strict academic evaluator. Evaluate the student's answer using exam-level standards.

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

        model_name = 'gemini-1.0-pro'
        print("[AI MODEL]", model_name)
        response = client.models.generate_content(
            model=model_name,
            contents=[{
                "role": "user",
                "parts": [{"text": prompt}]
            }]
        )
        result = _parse_json_response(response.text)

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


async def get_improvement_ai(question: str, answer: str) -> Dict[str, Any]:
    """
    Provides an improved version of the student's answer.
    Always returns a valid result — never raises to the caller.
    """
    try:
        prompt = f"""
You are an expert teacher.

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
  "improved_answer": "refined version of student response"
}}
"""

        model_name = 'gemini-1.0-pro'
        print("[AI MODEL]", model_name)
        response = client.models.generate_content(
            model=model_name,
            contents=[{
                "role": "user",
                "parts": [{"text": prompt}]
            }]
        )
        result = _parse_json_response(response.text)

        if not result or "improved_answer" not in result:
            return {"improved_answer": "Unable to generate improvement at this time."}

        return result

    except Exception as e:
        print("[AI ERROR]", e)
        print(f"Improvement Error: {e}")
        return {"improved_answer": "Unable to generate improvement at this time."}
