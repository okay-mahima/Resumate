# Resumate

Resumate is an AI-powered resume analysis platform that helps candidates understand how their resume looks to recruiters and how well it matches a job description. It combines PDF resume parsing, AI-driven extraction, ATS-style job matching, and a chat assistant for resume Q&A.

## Overview

This project contains:

- A Python FastAPI backend that reads uploaded PDF resumes and analyzes them using Groq-based AI
- A React + Vite frontend for upload, results display, job description analysis, and chat
- A reusable resume parsing prototype under the day5 project folder

The app is designed to help users:

- Upload a resume in PDF format
- Extract structured information like name, email, phone, skills, projects, education, certifications, and summary
- Check how the resume matches a specific job description
- Ask questions about the resume in natural language

## Features

- Resume PDF upload and parsing
- AI-powered structured resume extraction
- Resume score based on general quality
- Job description matching with score, matched skills, missing skills, and suggestions
- Resume Q&A chat assistant grounded in the uploaded resume
- Responsive single-page web dashboard

## Tech Stack

### Frontend
- React
- Vite
- JavaScript/JSX

### Backend
- Python
- FastAPI
- Uvicorn
- Pydantic
- python-multipart
- pypdf
- Groq SDK
- python-dotenv

### AI layer
- Groq API
- Model: openai/gpt-oss-120b

## Backend API

The backend service is implemented in [project/backend/main.py](project/backend/main.py).

### Main endpoints

- GET /
  - Returns a basic welcome message
- GET /health
  - Checks backend status and model configuration
- POST /analyze
  - Uploads a PDF resume and extracts structured resume data
- POST /chat
  - Answers questions based on the uploaded resume
- GET /chat/history
  - Retrieves previous chat history
- DELETE /chat/history
  - Clears chat history
- POST /jd-match
  - Compares the resume against a job description and returns a match score

### Example request flow

1. Upload a PDF to /analyze
2. Receive structured resume fields such as:
   - name
   - email
   - phone
   - skills
   - experience
   - education
   - projects
   - certifications
   - summary
   - score
3. Paste a job description into the frontend and analyze the match
4. Ask AI questions about the candidate using the resume chat feature

## Frontend Behavior

The frontend in [project/frontend/src/App.jsx](project/frontend/src/App.jsx) allows users to:

- choose a PDF resume file
- upload it for AI analysis
- view a candidate summary
- view skills, projects, and education
- compare against a job description
- ask AI-based questions about the resume

The app currently targets a deployed backend URL:

```js
const API_URL = "https://resumate-9elk.onrender.com";
```

If you want to run the backend locally, update this value to:

```js
const API_URL = "http://localhost:8000";
```

## Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Resumate
```

### 2. Set up the backend

Go to the backend folder:

```bash
cd project/backend
```

Create a `.env` file with your Groq API key:

```env
GROQ_API_KEY=your_api_key_here
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:

```text
http://localhost:8000
```

### 3. Set up the frontend

Open a new terminal and run:

```bash
cd project/frontend
npm install
npm run dev
```

The frontend will start with Vite and usually runs at:

```text
http://localhost:5173
```

## How to Use the App

1. Open the frontend in the browser.
2. Click to upload a PDF resume.
3. Click Analyze Resume.
4. Review the extracted candidate details.
5. Go to the Job Description tab and paste a job description.
6. Click Analyze Match to see match score, missing skills, and suggestions.
7. Use the AI assistant chat panel to ask resume-related questions.

## Environment Notes

The backend requires a valid Groq API key in order to process resume analysis and chat requests. If the key is missing, the app raises an error during startup.

## Notes on the Project

- The backend uses strict JSON outputs from the LLM so that resume fields can be structured consistently.
- The resume chat is designed to answer only from the uploaded resume content and avoid hallucinating facts.
- The job description analysis compares the resume against a specific role and returns ATS-style insights.
- The folder [project/day5](project/day5) contains additional experimentation and parsing logic for structured resume extraction.

## Future Improvements

Possible enhancements for this project include:

- resume history and saved analyses
- user authentication
- support for DOCX and TXT resumes
- more advanced ATS scoring
- richer analytics and charts
- export to PDF or JSON

## License

This project is intended for educational and demonstration purposes unless a separate license is added by the repository owner.

## Contributing

Contributions are welcome. You can improve the AI prompts, optimize the frontend UX, add additional resume parsing features, or improve the match scoring logic.
