from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import re
import fitz # PyMuPDF

app = FastAPI(title="EvalMind AI Backend")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EvaluationRequest(BaseModel):
    question: str
    answer: str
    marks: int = 5

class ScoreBreakdown(BaseModel):
    coverage: float
    depth: float
    clarity: float

class BreakdownItem(BaseModel):
    concept: str
    score: str

class EvaluationResponse(BaseModel):
    score: int
    max_score: int
    breakdown: List[BreakdownItem]
    scoring_breakdown: ScoreBreakdown
    confidence: float
    missing_points: List[str]
    ideal_answer: str
    detected_level: str
    feedback: str
    feedback_simple: str
    mistake_explanations: List[str]
    summary: str
    result_label: str
    improvement_plan: str # NEW: "Where you can improve" comparison
    learning_outcome: str # NEW: Closing learning statement
    extracted_text_preview: Optional[str] = None

# ==========================================
# PART 1: DYNAMIC KNOWLEDGE ENGINE
# ==========================================
DOMAIN_KNOWLEDGE = {
    "photosynthesis": {
        "definition": "The biological process by which green plants and some other organisms use sunlight to synthesize nutrients from carbon dioxide and water.",
        "points": ["Light absorption via chlorophyll in chloroplasts", "Photolysis (splitting of water) in thylakoids", "Calvin Cycle (carbon fixation) in stroma", "Conversion of light energy to chemical energy (ATP/NADPH)", "Release of oxygen as a vital byproduct"],
        "explanations": {
            "Light absorption via chlorophyll in chloroplasts": "You didn't mention chlorophyll, which is the green part of the plant that catches sunlight.",
            "Photolysis (splitting of water) in thylakoids": "You missed how plants split water to get energy.",
            "Calvin Cycle (carbon fixation) in stroma": "You should explain how plants turn CO2 into sugar.",
            "Conversion of light energy to chemical energy (ATP/NADPH)": "You forgot to say that light is turned into a type of battery power for the plant.",
            "Release of oxygen as a vital byproduct": "You should mention that plants give out oxygen, which we breathe."
        }
    },
    "inheritance": {
        "definition": "A fundamental OOP mechanism where a new class (subclass) derives attributes and behaviors from an existing class (superclass).",
        "points": ["Encourages code reusability and hierarchical organization", "Use of 'extends' or 'inherits' keywords", "Method overriding for specific child implementations", "Support for single, multilevel, or hierarchical types", "Access modifiers control inherited visibility"],
        "explanations": {
            "Encourages code reusability and hierarchical organization": "You should mention that this helps us use the same code again instead of rewriting it.",
            "Use of 'extends' or 'inherits' keywords": "You didn't say that we use special words like 'extends' to connect classes.",
            "Method overriding for specific child implementations": "You missed explaining how a child class can change its own version of a parent's rule.",
            "Support for single, multilevel, or hierarchical types": "You should mention that there are different ways to connect classes (like levels).",
            "Access modifiers control inherited visibility": "You forgot to say that some parts of the parent can be hidden from the child."
        }
    },
    "sql": {
        "definition": "A domain-specific language used in programming and designed for managing data held in a relational database management system.",
        "points": ["Utilizes structured tables with rows and columns", "Enforces strict schemas and data types", "Supports ACID properties (Atomicity, Consistency, Isolation, Durability)", "Relational algebra through JOINs and UNIONs", "Standard operations: SELECT, INSERT, UPDATE, DELETE"],
        "explanations": {
            "Utilizes structured tables with rows and columns": "You didn't mention that SQL uses tables with rows and columns like a spreadsheet.",
            "Enforces strict schemas and data types": "You should say that every piece of data must have a specific type.",
            "Supports ACID properties (Atomicity, Consistency, Isolation, Durability)": "You missed how SQL keeps data safe and consistent.",
            "Relational algebra through JOINs and UNIONs": "You forgot to explain how we connect different tables together.",
            "Standard operations: SELECT, INSERT, UPDATE, DELETE": "You should mention the basic actions like picking, adding, or changing data."
        }
    },
    "neural network": {
        "definition": "A computational model inspired by the human brain's neural structure, designed to recognize patterns and solve complex problems.",
        "points": ["Comprised of input, hidden, and output layers", "Neurons connected by weighted edges (synapses)", "Activation functions (ReLU, Sigmoid) introduce non-linearity", "Learning via backpropagation and gradient descent", "Loss functions measure prediction error"],
        "explanations": {
            "Comprised of input, hidden, and output layers": "You didn't mention that it has layers like a sandwich (start, middle, end).",
            "Neurons connected by weighted edges (synapses)": "You should explain that connections have different 'strengths' called weights.",
            "Activation functions (ReLU, Sigmoid) introduce non-linearity": "You missed how the network decides which information is important.",
            "Learning via backpropagation and gradient descent": "You should explain that it learns by looking at its mistakes and trying again.",
            "Loss functions measure prediction error": "You forgot to say how the network knows how far off its guess was."
        }
    }
}

def generate_ideal_answer(question: str, marks: int):
    q_lower = question.lower()
    knowledge = None
    for key, data in DOMAIN_KNOWLEDGE.items():
        if key in q_lower:
            knowledge = data
            break
    if not knowledge:
        knowledge = {
            "definition": f"The core concept of {question} involves specialized principles within its respective field.",
            "points": ["Primary definition and core utility", "Structural components or prerequisites", "Functional mechanics and implementation", "Operational benefits or output"],
            "explanations": {
                "Primary definition and core utility": "You missed the basic meaning of the topic.",
                "Structural components or prerequisites": "You should list the parts needed for this to work.",
                "Functional mechanics and implementation": "You didn't explain how it actually happens.",
                "Operational benefits or output": "You should mention what we get at the end."
            }
        }
    if marks <= 2:
        ideal = f"{knowledge['definition']}"
        key_points = [knowledge['points'][0]]
    elif marks <= 5:
        ideal = f"{knowledge['definition']} Specifically, it involves: {', '.join(knowledge['points'][:3])}."
        key_points = knowledge['points'][:3]
    else:
        intro = f"Introduction: {knowledge['definition']}"
        body = "Explanation: " + " ".join(knowledge['points'])
        ideal = f"{intro}\n\n{body}\n\nIn conclusion, this is essential for functionality."
        key_points = knowledge['points']
    return ideal, key_points, knowledge.get("explanations", {})

def calculate_metrics(student_answer: str, key_points: List[str], marks: int):
    answer_lower = student_answer.lower()
    words = student_answer.split()
    word_count = len(words)
    matches = 0
    missing = []
    for pt in key_points:
        keywords = [w for w in re.findall(r'\w+', pt.lower()) if len(w) > 4]
        if any(kw in answer_lower for kw in keywords):
            matches += 1
        else:
            missing.append(pt)
    cov = matches / len(key_points) if key_points else 0
    target_words = {2: 20, 5: 60, 10: 150}
    target = target_words.get(marks, 60)
    depth = min(1.0, word_count / target)
    cues = ["therefore", "however", "consequently", "specifically", "furthermore", "process", "for example"]
    found_cues = sum(1 for c in cues if c in answer_lower)
    clarity = min(1.0, (found_cues / 3) + (0.5 if word_count > 10 else 0))
    if word_count < 30: detected_level = "2-mark level"
    elif word_count < 90: detected_level = "5-mark level"
    else: detected_level = "10-mark level"
    return cov, depth, clarity, missing, detected_level

@app.post("/evaluate-pdf")
async def evaluate_pdf(
    file: UploadFile = File(...),
    marks: int = Form(...),
    mode: str = Form(...),
    question: Optional[str] = Form(None)
):
    if not file.filename.endswith('.pdf'): raise HTTPException(status_code=400, detail="Upload a PDF.")
    try:
        contents = await file.read()
        doc = fitz.open(stream=contents, filetype="pdf")
        if len(doc) > 10: raise HTTPException(status_code=400, detail="Max 10 pages.")
        txt = ""
        for page in doc: txt += page.get_text()
        doc.close()
        if not txt.strip(): raise HTTPException(status_code=400, detail="Scanned PDF detected.")
        if mode == "answer_sheet":
            return await evaluate_answer(EvaluationRequest(question=question, answer=txt, marks=marks))
        elif mode == "combined":
            pattern = re.compile(r'(?:Question|Q):?\s*(.*?)\s*(?:Answer|A):?\s*(.*?)(?=(?:Question|Q):|$)', re.DOTALL | re.IGNORECASE)
            pairs = pattern.findall(txt)
            if not pairs: raise HTTPException(status_code=400, detail="No questions found.")
            total = 0
            evs = []
            for q, a in pairs:
                res = await evaluate_answer(EvaluationRequest(question=q, answer=a, marks=marks))
                evs.append({"question": q, "result": res})
                total += res.score
            return {"evaluations": evs, "total_score": total, "total_max_score": len(evs)*marks, "count": len(evs), "extracted_text_preview": txt[:300]}
    except HTTPException as he: raise he
    except Exception as e: raise HTTPException(status_code=500, detail=str(e))

@app.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_answer(request: EvaluationRequest):
    if not request.answer.strip(): raise HTTPException(status_code=400, detail="Empty answer")
    ideal, key_points, exp_map = generate_ideal_answer(request.question, request.marks)
    cov, depth, clarity, missing, det_lvl = calculate_metrics(request.answer, key_points, request.marks)
    
    scoring = ScoreBreakdown(coverage=cov, depth=depth, clarity=clarity)
    confidence = (cov * 0.6 + clarity * 0.4)
    raw_score = (cov * 0.5 + depth * 0.3 + clarity * 0.2) * request.marks
    final_score = min(max(1, int(round(raw_score))), request.marks)

    # RESULT LABEL
    percentage = (final_score / request.marks) * 100
    if percentage >= 85: result_label = "Excellent Answer"
    elif percentage >= 50: result_label = "Good Answer"
    else: result_label = "Needs Improvement"

    # REFINED HUMAN-LIKE FEEDBACK
    prefix = "Good start! " if final_score >= request.marks * 0.4 else "Nice attempt! "
    next_step = " Next time, try adding more explanation or examples to your points." if final_score < request.marks else " You have a deep understanding of this topic."

    if final_score == request.marks:
        summary = "Your answer is well-structured and complete."
        feedback_simple = f"{prefix}Your answer is very clear and covers everything I was looking for.{next_step}"
        improvement_plan = "You've mastered this topic! To push further, try explaining related advanced concepts."
    elif final_score >= request.marks * 0.7:
        summary = "Your answer is good but needs more explanation."
        feedback_simple = f"{prefix}You have the right ideas, but you missed a few details that would make it perfect.{next_step}"
        improvement_plan = f"You are very close to full marks. The main difference is the level of detail. While the ideal answer explains the 'why', yours focuses on the 'what'. Adding more 'because' statements will help."
    else:
        summary = "Your answer is too short and misses key points."
        feedback_simple = f"{prefix}Your answer is a bit too short and misses some important points we discussed.{next_step}"
        improvement_plan = "Your current answer lacks the structure and depth needed for high marks. Try breaking your answer into an introduction, 3 main points, and a conclusion to match the model answer."

    mistakes = []
    req_lvl = f"{request.marks}-mark level"
    if det_lvl != req_lvl and request.marks > 2:
        mistakes.append(f"This answer is okay for 2 marks, but for {request.marks} marks you need to explain things in more detail.")
    
    for m in missing:
        expl = exp_map.get(m, f"You missed a key part: {m}.")
        mistakes.append(expl)
    
    if len(mistakes) == 0:
        mistakes.append("Everything looks great! No major mistakes found.")
    else:
        mistakes.append(f"Try to add these points to get the full {request.marks} marks next time.")

    breakdown = [BreakdownItem(concept="Coverage", score=f"{int(cov*100)}%"), BreakdownItem(concept="Depth", score=f"{int(depth*100)}%"), BreakdownItem(concept="Clarity", score=f"{int(clarity*100)}%")]

    return EvaluationResponse(
        score=final_score, max_score=request.marks, breakdown=breakdown, scoring_breakdown=scoring,
        confidence=round(confidence, 2), missing_points=missing[:3], ideal_answer=ideal,
        detected_level=det_lvl, feedback=f"Assessment Complete",
        feedback_simple=feedback_simple, mistake_explanations=mistakes, 
        summary=summary, result_label=result_label,
        improvement_plan=improvement_plan,
        learning_outcome="After this feedback, you should be able to answer this question with full marks.",
        extracted_text_preview=request.answer[:300]
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
