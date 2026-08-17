import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel
from pypdf import PdfReader


# =========================================================
# PATHS
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent

# Your .env is here:
# project/day5/.env
ENV_FILE = BASE_DIR / "day5" / ".env"

load_dotenv(ENV_FILE)


# =========================================================
# GROQ
# =========================================================

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError(
        f"GROQ_API_KEY nahi mili.\n"
        f"Please check: {ENV_FILE}"
    )

client = Groq(api_key=api_key)

MODEL = "openai/gpt-oss-120b"


# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(
    title="Resume Analyzer API",
    description="AI-powered Resume Analyzer with Resume Chat and Job Description Matching",
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# FILE PATH
# =========================================================

BACKEND_DIR = Path(__file__).resolve().parent

UPLOAD_DIR = BACKEND_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

RESUME_PATH = UPLOAD_DIR / "uploaded_resume.pdf"


# =========================================================
# IN-MEMORY CHAT HISTORY
# =========================================================
# This keeps chat history while backend is running.
#
# Example:
# [
#     {
#         "question": "...",
#         "answer": "..."
#     }
# ]

chat_history: list[dict[str, str]] = []


# =========================================================
# REQUEST MODELS
# =========================================================

class ChatRequest(BaseModel):
    question: str


class JDMatchRequest(BaseModel):
    job_description: str


# =========================================================
# PDF READER
# =========================================================

def read_pdf(file_path: Path) -> str:
    """
    Extract text from a PDF resume.
    """

    reader = PdfReader(str(file_path))

    text = ""

    for page in reader.pages:
        page_text = page.extract_text()

        if page_text:
            text += page_text + "\n"

    return text.strip()


# =========================================================
# GROQ JSON HELPER
# =========================================================

def call_groq_json(prompt: str) -> dict[str, Any]:
    """
    Send prompt to Groq and return parsed JSON.
    """

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        response_format={
            "type": "json_object"
        },
    )

    content = response.choices[0].message.content

    if not content:
        raise ValueError("AI ne empty response diya.")

    return json.loads(content)


# =========================================================
# ANALYZE RESUME
# =========================================================

def analyze_resume(resume_text: str) -> dict[str, Any]:

    prompt = f"""
You are an expert resume analyzer.

Analyze the following resume carefully.

Return ONLY valid JSON.

Use exactly this structure:

{{
    "name": null,
    "email": null,
    "phone": null,
    "skills": [],
    "experience": [],
    "education": [],
    "projects": [],
    "certifications": [],
    "summary": "",
    "score": 0
}}

Rules:

1. Do not invent information.
2. If information is unavailable, use null.
3. If a list has no information, return an empty list.
4. Resume score must be between 0 and 100.
5. This score represents GENERAL RESUME QUALITY.
6. Do NOT calculate the score based on a job description.
7. Keep the summary professional.
8. Extract skills from the entire resume.
9. Include internships in experience.
10. Preserve the information present in the resume.
11. For education, include degree, institution, start year,
    end year and percentage if available.
12. For experience, include title, company, location,
    startDate, endDate and responsibilities if available.
13. For projects, include name, link and description if available.
14. For certifications, return certification names.

Resume:

-------------------------
{resume_text}
-------------------------
"""

    return call_groq_json(prompt)


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():

    return {
        "message": "Resume Analyzer Backend is running!"
    }


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health():

    return {
        "status": "healthy",
        "model": MODEL
    }


# =========================================================
# ANALYZE RESUME
# =========================================================

@app.post("/analyze")
async def analyze_resume_file(
    file: UploadFile = File(...)
):

    # -----------------------------------------------------
    # Check file
    # -----------------------------------------------------

    if not file.filename:
        return {
            "error": "Please select a resume file."
        }

    if not file.filename.lower().endswith(".pdf"):
        return {
            "error": "Please upload a PDF resume."
        }

    # -----------------------------------------------------
    # Clear old chat history
    # -----------------------------------------------------
    # New resume = new conversation

    chat_history.clear()

    # -----------------------------------------------------
    # Save uploaded PDF
    # -----------------------------------------------------

    contents = await file.read()

    with open(RESUME_PATH, "wb") as f:
        f.write(contents)

    # -----------------------------------------------------
    # Extract text
    # -----------------------------------------------------

    try:
        resume_text = read_pdf(RESUME_PATH)

    except Exception as error:
        return {
            "error": f"PDF read nahi ho payi: {str(error)}"
        }

    if not resume_text.strip():
        return {
            "error": "Could not extract text from this PDF."
        }

    # -----------------------------------------------------
    # AI Analysis
    # -----------------------------------------------------

    try:
        result = analyze_resume(resume_text)

    except Exception as error:
        return {
            "error": f"Resume analysis failed: {str(error)}"
        }

    # -----------------------------------------------------
    # Response
    # -----------------------------------------------------

    return {
        "filename": file.filename,
        "resume": result
    }


# =========================================================
# CHAT WITH RESUME
# =========================================================

@app.post("/chat")
def chat(request: ChatRequest):

    question = request.question.strip()

    # -----------------------------------------------------
    # Validate question
    # -----------------------------------------------------

    if not question:
        return {
            "error": "Please enter a question."
        }

    # -----------------------------------------------------
    # Check resume
    # -----------------------------------------------------

    if not RESUME_PATH.exists():
        return {
            "error": "Please upload a resume first."
        }

    # -----------------------------------------------------
    # Read resume
    # -----------------------------------------------------

    try:
        resume_text = read_pdf(RESUME_PATH)

    except Exception as error:
        return {
            "error": f"Resume read nahi ho paya: {str(error)}"
        }

    # -----------------------------------------------------
    # Previous chat history
    # -----------------------------------------------------

    previous_conversation = ""

    for chat in chat_history:

        previous_conversation += f"""
User:
{chat["question"]}

AI:
{chat["answer"]}

"""

    # -----------------------------------------------------
    # Chat prompt
    # -----------------------------------------------------
    prompt = f"""
You are an AI assistant for a Resume Analyzer.

You answer questions about a candidate using ONLY
the information available in the resume.

Resume:

-------------------------
{resume_text}
-------------------------

Previous conversation:

-------------------------
{previous_conversation}
-------------------------

STRICT RESPONSE RULES:

1. Use only information from the resume.
2. Do not invent facts or make assumptions.
3. If the answer is not available in the resume, say exactly:
   "I don't have enough information in the resume to answer that."
4. Answer the user's question directly.
5. Answer clearly, professionally, and naturally.
6. Keep answers concise but useful.
7. NEVER use HTML tags.
8. NEVER use <br>, <p>, <div>, <ul>, <li>, or any other HTML tags.
9. NEVER return raw HTML.
10. Use normal line breaks between paragraphs.
11. When listing multiple items, use Markdown bullet points starting with "-".
12. Do not use unnecessary symbols or decorative formatting.
13. Do not repeat the entire resume unless specifically asked.
14. For education questions, use the education section.
15. For qualification questions, identify the highest qualification
    available in the resume.
16. For skills questions, use the skills mentioned in the resume.
17. For experience questions, use internships and jobs mentioned.
18. For project questions, use projects from the resume.
19. For certification questions, use certifications from the resume.
20. Previous conversation can be used to understand context,
    but factual answers must still come from the resume.
21. Do not output JSON for normal chat questions.
22. Return only the natural-language answer to the user's question.

Current user question:

{question}
"""

    
    # -----------------------------------------------------
    # Call AI
    # -----------------------------------------------------

    try:

        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        answer = response.choices[0].message.content

        if not answer:
            answer = "AI ne koi answer nahi diya."

    except Exception as error:

        return {
            "error": f"AI chat failed: {str(error)}"
        }

    # -----------------------------------------------------
    # Save conversation
    # -----------------------------------------------------

    chat_history.append(
        {
            "question": question,
            "answer": answer
        }
    )

    # -----------------------------------------------------
    # Return answer + full history
    # -----------------------------------------------------

    return {
        "question": question,
        "answer": answer,
        "history": chat_history
    }


# =========================================================
# GET CHAT HISTORY
# =========================================================

@app.get("/chat/history")
def get_chat_history():

    return {
        "history": chat_history
    }


# =========================================================
# CLEAR CHAT HISTORY
# =========================================================

@app.delete("/chat/history")
def clear_chat_history():

    chat_history.clear()

    return {
        "message": "Chat history cleared.",
        "history": []
    }


# =========================================================
# JOB DESCRIPTION MATCH
# =========================================================

@app.post("/jd-match")
def job_description_match(request: JDMatchRequest):

    job_description = request.job_description.strip()

    # -----------------------------------------------------
    # Validate JD
    # -----------------------------------------------------

    if not job_description:

        return {
            "error": "Please enter a job description."
        }

    # -----------------------------------------------------
    # Check resume
    # -----------------------------------------------------

    if not RESUME_PATH.exists():

        return {
            "error": "Please upload a resume first."
        }

    # -----------------------------------------------------
    # Read resume
    # -----------------------------------------------------

    try:

        resume_text = read_pdf(RESUME_PATH)

    except Exception as error:

        return {
            "error": f"Resume read nahi ho paya: {str(error)}"
        }

    # -----------------------------------------------------
    # JD Matching Prompt
    # -----------------------------------------------------

    prompt = f"""
You are an expert ATS resume and job description analyzer.

Compare the candidate's resume with the provided job description.

IMPORTANT:

The match score MUST be based ONLY on how well the resume
matches the provided job description.

Do NOT use the general resume quality score.

Return ONLY valid JSON in exactly this format:

{{
    "match_score": 0,
    "match_level": "",
    "matched_skills": [],
    "missing_skills": [],
    "recommendations": [],
    "summary": ""
}}

Rules:

1. match_score must be between 0 and 100.
2. 0 means very poor match.
3. 100 means excellent match.
4. Identify skills from the job description.
5. Compare them with the candidate's resume.
6. matched_skills must contain skills present in both
   the resume and job description.
7. missing_skills must contain important job-description
   skills that are not clearly present in the resume.
8. Do not invent candidate skills.
9. matching_experience should contain only experience
   relevant to the job description.
10. matching_projects should contain only relevant projects.
11. recommendations should explain how the candidate can
    improve the resume for this specific job.
12. summary should briefly explain why the resume matches
    or does not match the job.
13. Keep the analysis professional.
14. Do not give a high score simply because the resume is good.
15. The score must reflect JOB DESCRIPTION MATCH.

CANDIDATE RESUME:

-------------------------
{resume_text}
-------------------------

JOB DESCRIPTION:

-------------------------
{job_description}
-------------------------
"""

    # -----------------------------------------------------
    # AI analysis
    # -----------------------------------------------------

    try:

        result = call_groq_json(prompt)

    except Exception as error:

        return {
            "error": f"JD matching failed: {str(error)}"
        }

    

    return {
        "job_description": job_description,
        "match": result
    }