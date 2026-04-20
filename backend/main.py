from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os

app = FastAPI(title="EvalMind AI Backend")

# CORS Setup - allowing all for hackathon/demo purposes
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
    marks: int = 5 # Default 5 marks

class BreakdownItem(BaseModel):
    concept: str
    score: str

class EvaluationResponse(BaseModel):
    score: int
    max_score: int
    breakdown: List[BreakdownItem]
    missing_concepts: List[str]
    feedback: str

@app.get("/")
async def health_check():
    return {"message": "Backend running"}

@app.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_answer(request: EvaluationRequest):
    if not request.answer.strip():
        raise HTTPException(status_code=400, detail="Answer cannot be empty")
    
    # MVP Evaluation Logic
    answer = request.answer.lower()
    question_text = request.question.lower()
    max_marks = request.marks
    
    # Base score scaling
    score = max_marks / 2 
    
    # Predefined Questions Mapping
    predefined_questions = {
        "photosynthesis": ["sunlight", "chlorophyll", "glucose", "water", "carbon dioxide"],
        "inheritance": ["class", "parent", "child", "extend", "override"],
        "sql": ["database", "relational", "schema", "table", "query"],
        "neural network": ["layer", "weight", "activation", "neuron", "training"]
    }
    
    is_predefined = False
    keywords_found = []
    missing_concepts = []
    
    # Check if question text contains any of our predefined keys
    for key, q_keywords in predefined_questions.items():
        if key in question_text:
            is_predefined = True
            keyword_weight = (max_marks * 0.6) / len(q_keywords) # Keywords worth 60% of score
            for kw in q_keywords:
                if kw in answer:
                    score += keyword_weight
                    keywords_found.append(kw)
                else:
                    missing_concepts.append(kw.capitalize())
            break
            
    if not is_predefined:
        # General Evaluation Mode
        words = answer.split()
        
        # Length expectations based on marks
        if max_marks == 10:
            if len(words) > 80: score += 4
            elif len(words) > 40: score += 2
        elif max_marks == 5:
            if len(words) > 40: score += 2
            elif len(words) > 20: score += 1
        elif max_marks == 2:
            if len(words) > 15: score += 1
            
        academic_cues = ["because", "therefore", "however", "consequently", "furthermore", "specifically", "process"]
        for cue in academic_cues:
            if cue in answer:
                score += (max_marks * 0.05) # Each cue worth 5%
        
        missing_concepts = ["Technical Detail", "Structural Clarity", "Contextual Depth"]
    
    # Final Score Normalization
    final_score = int(min(round(score), max_marks))
    
    # Ensure minimum score if answer is non-empty and long enough
    if len(answer) > 50 and final_score < (max_marks * 0.4):
        final_score = int(max_marks * 0.4)

    # Generate mock breakdown
    breakdown = [
        BreakdownItem(concept="Clarity", score=f"{max(1, final_score//4)}/{max(1, max_marks//4)}"),
        BreakdownItem(concept="Accuracy", score=f"{max(1, final_score//3)}/{max(1, max_marks//3)}"),
        BreakdownItem(concept="Completeness", score=f"{max(1, final_score//2)}/{max(1, max_marks//2)}")
    ]
    
    # Generate mock feedback
    if is_predefined:
        if final_score >= (max_marks * 0.8):
            feedback = f"Excellent {max_marks}-mark answer! You've captured all essential concepts with required depth."
        else:
            feedback = f"For a {max_marks}-mark question, your answer is partially complete. Consider adding more detail on {', '.join(missing_concepts[:2])}."
    else:
        feedback = f"General Evaluation ({max_marks} Marks): Your response is well-structured. For higher marks, ensure you use specific terminology and provide more exhaustive explanations."

    return EvaluationResponse(
        score=final_score,
        max_score=max_marks,
        breakdown=breakdown,
        missing_concepts=missing_concepts[:3], 
        feedback=feedback
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
