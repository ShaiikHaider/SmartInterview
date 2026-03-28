# SmartInterview

A voice-enabled AI technical interview simulator.

## Project Structure
- `frontend/`: Next.js application (React, TailwindCSS, Monaco Editor)
- `backend/`: FastAPI application (Python, Google Gemini API)

## Getting Started

### Frontend
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`

### Backend
1. Navigate to the backend directory: `cd backend`
2. Create a virtual environment: `python -m venv .venv`
3. Activate the virtual environment: `source .venv/bin/activate` (or `.venv\Scripts\activate` on Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Run the server: `python main.py`

## Deployment

### Frontend (Vercel)
- Root Directory: `frontend`
- Framework Preset: `Next.js`

### Backend (Render)
- Build Command: `pip install -r requirements.txt`
- Start Command: `python main.py` (or `uvicorn main:app --host 0.0.0.0 --port 10000`)

