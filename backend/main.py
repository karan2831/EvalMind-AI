from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request, Depends
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict
import os
import re
import requests
import time
import fitz # PyMuPDF
import logging
from dotenv import load_dotenv
from supabase import create_client, Client
from ai_evaluator import get_evaluation_ai, get_improvement_ai

load_dotenv()

# Initialize Supabase Admin Client
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
supabase_admin: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase_admin = create_client(SUPABASE_URL, SUPABASE_KEY)


# Configure Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("EvalMindSecurity")

app = FastAPI(title="EvalMind AI Backend")

# ==========================================
# PART 0: HEALTH & SYSTEM MONITORING
# ==========================================
@app.get("/health")
async def health_check():
    health_status = {
        "status": "healthy",
        "timestamp": time.time(),
        "services": {
            "database": "connected" if supabase_admin else "disconnected",
            "razorpay": "configured" if os.environ.get("RAZORPAY_KEY_ID") and os.environ.get("RAZORPAY_KEY_SECRET") else "missing_keys"
        }
    }
    if not supabase_admin:
        health_status["status"] = "degraded"
    return health_status


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"[ERROR] Global Exception on {request.url.path}: {str(exc)}")
    return {"detail": "An unexpected internal server error occurred."}


# ==========================================
# PART 1: SECURITY - RATE LIMITING
# ==========================================
# Simple IP-based Rate Limiter (In-Memory)
rate_limit_store = {}
RATE_LIMIT_MAX = 20
RATE_LIMIT_WINDOW = 60 # Seconds

async def check_rate_limit(request: Request):
    client_ip = request.client.host
    now = time.time()
    
    # Initialize or clean up old entries
    if client_ip not in rate_limit_store:
        rate_limit_store[client_ip] = []
    
    # Keep only requests within the window
    rate_limit_store[client_ip] = [t for t in rate_limit_store[client_ip] if now - t < RATE_LIMIT_WINDOW]
    
    if len(rate_limit_store[client_ip]) >= RATE_LIMIT_MAX:
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(status_code=429, detail="Too many requests. Please try again later.")
    
    rate_limit_store[client_ip].append(now)

async def verify_token(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.warning(f"Unauthorized access attempt from IP: {request.client.host}")
        raise HTTPException(status_code=401, detail="Authentication required for PDF evaluation")
    return auth_header

# ==========================================
# PART 2: SECURITY - CORS & HEADERS
# ==========================================
# PROD: Replace with actual frontend domains
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://evalmind-ai.vercel.app", # Example Vercel Domain
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# PART 3: INPUT VALIDATION (PYDANTIC)
# ==========================================
class EvaluationRequest(BaseModel):
    question: str = Field(..., min_length=5, max_length=5000)
    answer: str = Field(..., min_length=5, max_length=10000)
    marks: int = Field(..., description="Must be 2, 5, or 10")

    @validator("marks")
    def validate_marks(cls, v):
        if v not in [2, 5, 10]:
            raise ValueError("Marks must be 2, 5, or 10")
        return v

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
    improvement_plan: str
    learning_outcome: str
    improved_answer: Optional[str] = None
    validation_confidence: float = 1.0
    extracted_text_preview: Optional[str] = None

class CreateOrderRequest(BaseModel):
    order_id: str
    user_id: str
    amount: int
    currency: str

class VerifyPaymentRequest(BaseModel):
    order_id: str
    payment_id: str

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    avatar: Optional[str] = None

# --- Support Route (Direct) ---
class SupportRequest(BaseModel):
    subject: str
    description: str
    user_email: str | None = None

@app.post("/support/create")
async def create_support(data: SupportRequest):
    try:
        logger.info(f"[SUPPORT] Incoming request: {data}")

        if not data.subject or not data.subject.strip():
            raise HTTPException(status_code=400, detail="Subject is required")

        if not data.description or not data.description.strip():
            raise HTTPException(status_code=400, detail="Description is required")

        if not supabase_admin:
            logger.error("[SUPPORT] Supabase not initialized")

        # --- DB INSERT (non-blocking) ---
        try:
            insert_data = {
                "user_id": None,
                "subject": data.subject,
                "description": data.description,
                "status": "pending"
            }

            if data.user_email:
                insert_data["user_email"] = data.user_email

            def insert_s():
                return supabase_admin.table("support_requests").insert(insert_data).execute()

            if supabase_admin:
                await asyncio.to_thread(insert_s)
                logger.info(f"[SUPPORT] Stored request for: {data.user_email}")

        except Exception as db_e:
            logger.error(f"[SUPPORT] DB save failed: {db_e}")

        # Email
        RESEND_API_KEY = os.getenv("RESEND_API_KEY")

        if not RESEND_API_KEY:
            logger.warning("[SUPPORT] RESEND_API_KEY missing")

        if RESEND_API_KEY:
            headers = {
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json"
            }

            try:
                res = requests.post(
                    "https://api.resend.com/emails",
                    headers=headers,
                    json={
                        "from": "EvalMind <onboarding@resend.dev>",
                        "to": [os.getenv("ADMIN_EMAIL")],
                        "subject": f"New Support: {data.subject}",
                        "html": f"<p>{data.description}</p>"
                    },
                    timeout=5
                )
                logger.info(f"[SUPPORT] Email status: {res.status_code}")
                logger.info(f"[SUPPORT] Email response: {res.text}")
            except Exception as e:
                logger.error(f"[SUPPORT] Email error: {e}")

        return {"success": True}

    except Exception as e:
        logger.error(f"[SUPPORT] Crash: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# PART 4: DYNAMIC KNOWLEDGE ENGINE
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

def validate_input_quality(answer: str, question: str, marks: int, key_points: List[str]):
    answer_lower = answer.lower()
    
    # Rule 1: Repeated characters (Extreme spam)
    if re.search(r'(.)\1{10,}', answer):
        return "garbage", 0.0, "Contains excessive repeated characters."
    
    # Extract keywords for relevance check
    all_keywords = []
    for pt in key_points:
        all_keywords.extend([w for w in re.findall(r'\w+', pt.lower()) if len(w) > 4])
    
    relevant_matches = sum(1 for kw in set(all_keywords) if kw in answer_lower)
    words = answer.split()
    word_count = len(words)
    unique_words = set(w.lower() for w in words)
    
    # Gibberish Check
    is_gibberish = word_count > 10 and (len(unique_words) / word_count) < 0.3
    has_no_real_words = not re.search(r'[a-zA-Z]{3,}', answer)
    
    if has_no_real_words or (is_gibberish and relevant_matches == 0):
        return "garbage", 0.1, "No meaningful or relevant words detected."

    # Rule 2: Relevance Check (Context Awareness)
    # If it's very short but contains relevant keywords, it's not garbage
    relevance_score = min(1.0, relevant_matches / 2) if relevant_matches > 0 else 0
    
    # Soft Length Thresholds
    min_chars = {2: 10, 5: 25, 10: 60}
    is_very_short = len(answer.strip()) < min_chars.get(marks, 25)
    
    if is_very_short:
        if relevant_matches >= 1:
            return "low_quality", 0.6, "Answer is relevant but very concise."
        else:
            return "garbage", 0.2, "Answer is too short and lacks relevance."

    if relevant_matches == 0 and word_count > 5:
        # Check for generic but meaningful structure
        structure_cues = ["is", "the", "and", "because", "process"]
        has_structure = sum(1 for c in structure_cues if c in answer_lower) >= 2
        if not has_structure:
            return "garbage", 0.3, "Answer does not appear relevant to the topic."

    return "valid", 1.0, ""

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

# ==========================================
# PART 5: PROTECTED ENDPOINTS
# ==========================================
@app.post("/evaluate-pdf", dependencies=[Depends(check_rate_limit), Depends(verify_token)])
async def evaluate_pdf(
    request: Request,
    file: UploadFile = File(...),
    marks: int = Form(...),
    mode: str = Form(...),
    question: Optional[str] = Form(None)
):
    # Security: File Type Check
    if not file.filename.lower().endswith('.pdf') or file.content_type != 'application/pdf':
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a PDF.")
    
    try:
        # Security: File Size Check (10MB)
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="PDF too large. Max 10MB allowed.")
            
        doc = fitz.open(stream=contents, filetype="pdf")
        if len(doc) > 10:
            doc.close()
            raise HTTPException(status_code=400, detail="PDF has too many pages. Max 10 allowed.")
        
        txt = ""
        for page in doc: txt += page.get_text()
        doc.close()
        
        if not txt.strip(): raise HTTPException(status_code=400, detail="Scanned PDF detected. OCR not supported.")
        
        # Security: Input Validation for Multipart Form
        if marks not in [2, 5, 10]: raise HTTPException(status_code=400, detail="Marks must be 2, 5, or 10")
        if len(txt) > 20000: raise HTTPException(status_code=400, detail="PDF content too long.")

        # Step 1: auth + usage check
        user_id_for_usage = None
        current_usage_count = 0
        if mode in ["answer_sheet", "combined"]:
            try:
                auth_header = request.headers.get("Authorization")

                if not auth_header or not auth_header.startswith("Bearer "):
                    raise HTTPException(status_code=401, detail="Unauthorized")

                token = auth_header.split(" ")[1]

                user_response = supabase_admin.auth.get_user(token)

                if not user_response or not user_response.user:
                    raise HTTPException(status_code=401, detail="Invalid user")

                user_id_for_usage = user_response.user.id

                user_data = supabase_admin.table("users") \
                    .select("usage_count, tier") \
                    .eq("id", user_id_for_usage) \
                    .single() \
                    .execute()

                current_usage_count = user_data.data.get("usage_count", 0)
                tier = user_data.data.get("tier", "free")

                # 🔒 HARD LIMIT ENFORCEMENT
                if tier != "premium" and current_usage_count >= 20:
                    raise HTTPException(
                        status_code=403,
                        detail="Monthly limit reached"
                    )

            except HTTPException:
                # IMPORTANT: re-raise it
                raise
            except Exception as e:
                logger.error(f"[USAGE FETCH ERROR] {e}")

        # Step 2: run evaluation
        if mode == "answer_sheet":
            if not question or len(question) < 5: raise HTTPException(status_code=400, detail="Question is too short.")
            res = await evaluate_answer(EvaluationRequest(question=question, answer=txt, marks=marks))
        elif mode == "combined":
            pattern = re.compile(r'(?:Question|Q):?\s*(.*?)\s*(?:Answer|A):?\s*(.*?)(?=(?:Question|Q):|$)', re.DOTALL | re.IGNORECASE)
            pairs = pattern.findall(txt)
            if not pairs: raise HTTPException(status_code=400, detail="No Q&A pairs found in PDF.")
            total = 0
            evs = []
            for q, a in pairs:
                eval_res = await evaluate_answer(EvaluationRequest(question=q, answer=a, marks=marks))
                evs.append({"question": q, "result": eval_res})
                total += eval_res.score
            res = {"evaluations": evs, "total_score": total, "total_max_score": len(evs)*marks, "count": len(evs), "extracted_text_preview": txt[:300]}
        else:
            raise HTTPException(status_code=400, detail="Invalid evaluation mode.")
            
        # Step 3: increment usage AFTER success
        if mode in ["answer_sheet", "combined"] and user_id_for_usage:
            try:
                result = await asyncio.to_thread(
                    lambda: supabase_admin.rpc(
                        "increment_usage_safe",
                        {"uid": user_id_for_usage}
                    ).execute()
                )

                success = result.data

                if not success:
                    raise HTTPException(
                        status_code=403,
                        detail="Monthly limit reached"
                    )

            except HTTPException:
                # IMPORTANT: re-raise it
                raise
            except Exception as e:
                # Only log, do not break evaluation
                logger.error(f"[USAGE INCREMENT ERROR] {e}")

        # Step 4: Save History
        if user_id_for_usage:
            try:
                score = res.get("total_score") if isinstance(res, dict) and "total_score" in res else getattr(res, "score", None)
                result_data = res if isinstance(res, dict) else res.model_dump()
                
                def save_history():
                    return supabase_admin.table("history").insert({
                        "user_id": user_id_for_usage,
                        "input_text": txt,
                        "result": result_data,
                        "score": score
                    }).execute()
                
                hist_res = await asyncio.to_thread(save_history)
                print("[HISTORY SAVED]", hist_res.data)
            except Exception as e:
                print("[HISTORY ERROR]", e)
                logger.error(f"[HISTORY ERROR] {e}")

        return res
        
    except HTTPException as he: raise he
    except Exception as e:
        logger.error(f"Internal Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Something went wrong. Please try again.")

@app.post("/ai")
async def ai_handler(request: dict):
    question = request.get("question")
    answer = request.get("answer")
    marks = request.get("marks", 5)
    mode = request.get("mode", "evaluate") # "evaluate" or "improve"

    if mode == "evaluate":
        try:
            # Determine subject
            subject = "theory"
            if any(term in question.lower() for term in ["code", "program", "function", "java", "python", "script"]):
                subject = "coding"
            elif any(term in question.lower() for term in ["calculate", "solve", "math", "numerical", "find"]):
                subject = "numerical"
                
            ai_result = await get_evaluation_ai(question, answer, marks, subject)
            
            # Post-process for consistency
            cov_raw = ai_result.get("coverage_score", 50)
            dep_raw = ai_result.get("depth_score", 50)
            cla_raw = ai_result.get("clarity_score", 50)
            final_score = round(((cov_raw * 0.5) + (dep_raw * 0.3) + (cla_raw * 0.2)) / 100 * marks)
            
            return {
                "score": final_score,
                "coverage_score": cov_raw,
                "depth_score": dep_raw,
                "clarity_score": cla_raw,
                "feedback": ai_result.get("feedback", ""),
                "missing_points": ai_result.get("missing_points", []),
                "model_answer": ai_result.get("model_answer", "")
            }
        except Exception as e:
            logger.error(f"Evaluation Error: {str(e)}")
            raise HTTPException(status_code=500, detail="AI Evaluation failed.")

    elif mode == "improve":
        try:
            ai_result = await get_improvement_ai(question, answer)
            return {"improved_answer": ai_result.get("improved_answer", "No improvement generated.")}
        except Exception as e:
            logger.error(f"Improvement Error: {str(e)}")
            raise HTTPException(status_code=500, detail="AI Improvement failed.")

    else:
        raise HTTPException(status_code=400, detail="Invalid mode. Choose 'evaluate' or 'improve'.")

@app.post("/evaluate", response_model=EvaluationResponse, dependencies=[Depends(check_rate_limit)])
async def evaluate_answer(request: EvaluationRequest):
    try:
        # Determine subject
        subject = "theory"
        if any(term in request.question.lower() for term in ["code", "program", "function", "java", "python", "script"]):
            subject = "coding"
        elif any(term in request.question.lower() for term in ["calculate", "solve", "math", "numerical", "find"]):
            subject = "numerical"
            
        ai_result = await get_evaluation_ai(request.question, request.answer, request.marks, subject)
        
        # Calculate scores
        cov_raw = ai_result.get("coverage_score", 50)
        dep_raw = ai_result.get("depth_score", 50)
        cla_raw = ai_result.get("clarity_score", 50)
        final_score = round(((cov_raw * 0.5) + (dep_raw * 0.3) + (cla_raw * 0.2)) / 100 * request.marks)
        
        # Map to UI model
        cov = cov_raw / 100
        depth = dep_raw / 100
        clarity = cla_raw / 100
        
        breakdown = [
            BreakdownItem(concept="Coverage", score=f"{int(cov*100)}%"),
            BreakdownItem(concept="Depth", score=f"{int(depth*100)}%"),
            BreakdownItem(concept="Clarity", score=f"{int(clarity*100)}%")
        ]
        
        scoring = ScoreBreakdown(coverage=cov, depth=depth, clarity=clarity)
        
        percentage = (final_score / request.marks) * 100 if request.marks > 0 else 0
        if percentage >= 85:
            result_label = "Excellent Answer"
            summary = "Your answer is well-structured and complete."
        elif percentage >= 50:
            result_label = "Good Answer"
            summary = "Your answer is good but could be more detailed."
        else:
            result_label = "Needs Improvement"
            summary = "Your answer needs more detail."

        return EvaluationResponse(
            score=final_score,
            max_score=request.marks,
            breakdown=breakdown,
            scoring_breakdown=scoring,
            confidence=round((cov + clarity) / 2, 2),
            missing_points=ai_result.get("missing_points", [])[:3],
            ideal_answer=ai_result.get("model_answer", "No ideal answer provided."),
            detected_level=f"{request.marks}-mark level",
            feedback="AI Evaluation Complete",
            feedback_simple=ai_result.get("feedback", "No feedback provided."),
            mistake_explanations=[f"Focus on: {p}" for p in ai_result.get("missing_points", [])[:3]],
            summary=summary,
            result_label=result_label,
            improvement_plan="Review the missing points and the improved answer for reference.",
            learning_outcome="Keep practicing to refine your explanations!",
            improved_answer=None, # Separate step now
            validation_confidence=1.0,
            extracted_text_preview=request.answer[:300]
        )
    except Exception as e:
        logger.error(f"Evaluation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Something went wrong during AI evaluation: {str(e)}")

# ==========================================
# PART 5.5: PROFILE & SUPPORT
# ==========================================
@app.get("/profile/{user_id}", dependencies=[Depends(check_rate_limit)])
async def get_profile(user_id: str):
    if not supabase_admin:
        raise HTTPException(status_code=500, detail="Supabase not initialized")
    
    try:
        def fetch_p():
            return supabase_admin.table("profiles").select("*").eq("id", user_id).execute()
        
        res = await asyncio.to_thread(fetch_p)
        if not res.data:
            return {"full_name": "", "avatar": "avatar1"}
        return res.data[0]
    except Exception as e:
        logger.error(f"Error fetching profile: {str(e)}")
        return {"full_name": "", "avatar": "avatar1"}

@app.post("/profile/update", dependencies=[Depends(check_rate_limit)])
async def update_profile(req: ProfileUpdate, request: Request):
    auth_header = await verify_token(request)
    token = auth_header.split(" ")[1]
    
    try:
        # Verify user with token
        user_res = supabase_admin.auth.get_user(token)
        if not user_res or not user_res.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_id = user_res.user.id
        
        def upsert_p():
            update_data = {"id": user_id, "updated_at": "now()"}
            if req.full_name is not None:
                update_data["full_name"] = req.full_name
            if req.avatar is not None:
                update_data["avatar"] = req.avatar
                
            return supabase_admin.table("profiles").upsert(update_data).execute()
        
        await asyncio.to_thread(upsert_p)
        return {"success": True}
    except Exception as e:
        logger.error(f"Profile update error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update profile")

# ==========================================
# PART 6: RAZORPAY WEBHOOK & RECONCILIATION
# ==========================================
import hmac
import hashlib
import asyncio

class ReconcileRequest(BaseModel):
    order_id: str
    payment_id: str
    amount: int
    currency: str
    status: str

@app.post("/internal/create-order")
async def create_internal_order(req: CreateOrderRequest, request: Request):
    # 🔐 Validate internal secret
    internal_token = request.headers.get("X-Internal-Secret")
    secret = os.environ.get("INTERNAL_API_SECRET")
    
    if not secret:
        logger.error("[CRITICAL] INTERNAL_API_SECRET is missing. Rejecting order creation.")
        raise HTTPException(status_code=500, detail="Server misconfiguration")
        
    if internal_token != secret:
        logger.warning(f"[SECURITY_ALERT] unauthorized access attempt on internal order creation from {request.client.host}")
        raise HTTPException(status_code=403, detail="Forbidden")

    if not supabase_admin:
        raise HTTPException(status_code=500, detail="Supabase admin not initialized")

    try:
        # Insert into payments table using admin client to bypass RLS
        def run_insert():
            return supabase_admin.table("payments").insert({
                "order_id": req.order_id,
                "user_id": req.user_id,
                "amount": req.amount,
                "currency": req.currency,
                "status": "created"
            }).execute()

        await asyncio.to_thread(run_insert)
        print(f"[BACKEND] Order stored: {req.order_id}")
        return {"success": True}
    except Exception as e:
        logger.error(f"[ERROR] Internal order creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to store order")

@app.post("/internal/verify-payment")
async def verify_internal_payment(req: VerifyPaymentRequest, request: Request):
    # 🔐 Validate internal request
    internal_token = request.headers.get("X-Internal-Secret")
    secret = os.environ.get("INTERNAL_API_SECRET")
    
    if not secret:
        logger.error("[CRITICAL] INTERNAL_API_SECRET is missing. Rejecting verification.")
        raise HTTPException(status_code=500, detail="Server misconfiguration")
        
    if internal_token != secret:
        logger.warning(f"[SECURITY_ALERT] unauthorized access attempt on internal verification from {request.client.host}")
        raise HTTPException(status_code=403, detail="Forbidden")

    if not supabase_admin:
        raise HTTPException(status_code=500, detail="Supabase admin not initialized")

    try:
        # 1. Fetch record from payments table using order_id
        def get_payment():
            return supabase_admin.table("payments").select("*").eq("order_id", req.order_id).execute()
        
        res = await asyncio.to_thread(get_payment)
        
        if not res.data or len(res.data) == 0:
            logger.warning(f"[SECURITY_ALERT] missing order: {req.order_id}")
            raise HTTPException(status_code=404, detail="Order not found")
            
        payment_record = res.data[0]
        
        # Idempotency check
        if payment_record.get("status") == "captured":
            return {"status": "already_processed"}
            
        user_id = payment_record.get("user_id")

        # 2. Update payment status
        def update_payment():
            return supabase_admin.table("payments").update({
                "status": "captured",
                "payment_id": req.payment_id
            }).eq("order_id", req.order_id).execute()
            
        await asyncio.to_thread(update_payment)

        # 3. Upgrade user to premium
        def upgrade_user():
            return supabase_admin.table("users").update({
                "tier": "premium"
            }).eq("id", user_id).execute()
            
        await asyncio.to_thread(upgrade_user)
        
        logger.info(f"[SUCCESS] user upgraded: {user_id}")
        return {"status": "verified"}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"[CRITICAL ERROR] Payment verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during verification")

@app.post("/internal/reconcile")
async def reconcile_payment(req: ReconcileRequest, request: Request):
    # 🛡️ Apply rate limiting
    await check_rate_limit(request)
    
    # 🔐 Mandatory internal secret - No fallback allowed
    internal_token = request.headers.get("X-Internal-Secret")
    secret = os.environ.get("INTERNAL_API_SECRET")
    if not secret:
        logger.error("[CRITICAL] INTERNAL_API_SECRET is missing. Rejecting reconciliation.")
        raise HTTPException(status_code=500, detail="Server misconfiguration")
        
    if internal_token != secret:
        logger.warning(f"[SECURITY_ALERT] unauthorized access attempt on internal reconciliation from {request.client.host}")
        raise HTTPException(status_code=403, detail="Forbidden")

    if not supabase_admin:
        raise HTTPException(status_code=500, detail="Supabase admin not initialized")

    try:
        # Using atomic RPC for reconciliation too to prevent duplicate upgrades
        def run_rpc():
            return supabase_admin.rpc('confirm_payment_success', {
                'p_order_id': req.order_id,
                'p_payment_id': req.payment_id,
                'p_event_id': f"reconcile_{req.order_id}_{int(time.time())}", # manual event_id for reconciliation
                'p_amount': req.amount
            }).execute()

        result = await asyncio.wait_for(asyncio.to_thread(run_rpc), timeout=10.0)
        
        rpc_data = result.data if hasattr(result, 'data') else result
        if rpc_data.get('status') == 'error':
            logger.warning(f"[SECURITY_ALERT] reconciliation rejected: {rpc_data.get('message')}")
            raise HTTPException(status_code=400, detail=rpc_data.get('message'))
            
        return {"status": rpc_data.get('status')}
    except Exception as e:
        logger.error(f"[ERROR] Internal reconciliation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Reconciliation failed")


@app.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    # 🛡️ Apply rate limiting
    await check_rate_limit(request)
    
    try:
        # 1. RAW BODY VALIDATION (CRITICAL)
        raw_body = await request.body()
        received_signature = request.headers.get("X-Razorpay-Signature")
        
        if not received_signature:
            logger.warning("[SECURITY_ALERT] Missing Razorpay signature")
            return JSONResponse(content={"error": "Missing signature"}, status_code=400)

        # 2. VERIFY SIGNATURE
        secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET")
        if not secret:
            logger.error("[CRITICAL] RAZORPAY_WEBHOOK_SECRET is not configured.")
            return JSONResponse(content={"error": "Internal configuration error"}, status_code=500)
            
        expected_signature = hmac.new(
            bytes(secret, 'utf-8'),
            raw_body,
            hashlib.sha256
        ).hexdigest()

        # 3. COMPARE SIGNATURE
        if expected_signature != received_signature:
            logger.warning(f"[SECURITY_ALERT] Invalid webhook signature from {request.client.host}")
            return JSONResponse(content={"error": "Invalid signature"}, status_code=400)

        # 4. PARSE JSON ONLY AFTER VERIFICATION
        payload = json.loads(raw_body)
        event_type = payload.get("event")
        event_id = payload.get("id")

        logger.info(f"[INFO] Webhook event received: {event_type} (ID: {event_id})")

        # 5. HANDLE ONLY IMPORTANT EVENTS
        if event_type != "payment.captured":
            logger.info(f"[INFO] Ignoring event: {event_type}")
            return {"status": "ok"}

        # 6. EXTRACT DATA
        payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = payment_entity.get("order_id")
        payment_id = payment_entity.get("id")
        amount = payment_entity.get("amount")

        if not order_id or not payment_id:
            logger.error(f"[ERROR] Missing data in payload for event {event_id}")
            return {"status": "ok"}

        # 7-9. IDEMPOTENCY, ATOMIC TRANSACTION, AND DATABASE UPDATE (VIA RPC)
        if supabase_admin:
            try:
                def call_rpc():
                    return supabase_admin.rpc('confirm_payment_success', {
                        'p_order_id': order_id,
                        'p_payment_id': payment_id,
                        'p_event_id': event_id,
                        'p_amount': int(amount)
                    }).execute()

                result = await asyncio.wait_for(asyncio.to_thread(call_rpc), timeout=10.0)
                rpc_data = result.data if hasattr(result, 'data') else result

                # 10. LOGGING & RESPONSE
                if rpc_data.get('status') == 'success':
                    logger.info(f"[SUCCESS] Payment captured via webhook for Order {order_id}")
                    return {"status": "ok"}
                elif rpc_data.get('status') in ['already_processed', 'already_captured']:
                    logger.warning(f"[WARNING] Duplicate webhook ignored for Event {event_id}")
                    return {"status": "already_processed"}
                else:
                    logger.error(f"[CRITICAL_ERROR] Webhook processing failed: {rpc_data.get('message')}")
            except Exception as e:
                logger.error(f"[CRITICAL_ERROR] Database interaction failed: {str(e)}")
        else:
            logger.error("[CRITICAL] Supabase admin client not initialized.")

        # 11. RESPONSE
        return {"status": "ok"}

    except Exception as e:
        # 12. FAILSAFE
        logger.error(f"[CRITICAL_ERROR] Webhook processing failed: {str(e)}")
        return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
