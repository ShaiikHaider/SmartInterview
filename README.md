# AI Interview Coach 🤖🎤

A production-grade, state-machine-driven AI Interview Coach. It simulates a real-time technical interview using bidirectional voice and a live coding environment.

## Features
- **Bidirectional Voice**: Hands-free interview using Web Speech APIs (STT & TTS).
- **Interactive Coding**: Monaco Editor with AI-run code evaluation and feedback.
- **Strict Interview Phases**: From HR Intro to Technical Discussion and Coding.
- **AI Personas**: FAANG-level interviewer logic powered by Google Gemini 2.5 Flash.

## Setup

### Backend (FastAPI)
1. Install dependencies: `pip install -r backend/requirements.txt`
2. Create `backend/.env` with your `GEMINI_API_KEY`.
3. Run: `uvicorn backend.main:app`

### Frontend (Next.js)
1. Install dependencies: `npm install`
2. Run: `npm run dev`

## Deployment 🚀

To make this application live for your friends, follow these two steps:

### 1. Backend (Hosted on Render)
- **Repo**: Connect this GitHub repository to [Render](https://render.com).
- **Settings**:
  - **Environment**: Python
  - **Build Command**: `pip install --only-binary :all: -r backend/requirements.txt`
  - **Start Command**: `PYTHONPATH=. uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- **Environment Variables**:
  - `GEMINI_API_KEY`: Your Google Gemini API Key.

### 2. Frontend (Hosted on Vercel)
- **Repo**: Connect this GitHub repository to [Vercel](https://vercel.com).
- **Settings**: Vercel will auto-detect Next.js.
- **Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: Use your **Render Web Service URL** (e.g., `https://smartinterview-a5w7.onrender.com`).

Once both are deployed, your friends can use the Vercel link to start their voice-enabled interviews!
