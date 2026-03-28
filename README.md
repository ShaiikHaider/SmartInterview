# 🤖 SmartInterview: AI Technical Interview Coach

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Live-green?logo=vercel&logoColor=white)](https://smart-interview-hk7cpejeb-shaiikhaiders-projects.vercel.app/)
[![FastAPI Backend](https://img.shields.io/badge/Render-Live-blue?logo=render&logoColor=white)](https://smartinterview-a5w7.onrender.com/health)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Google Gemini](https://img.shields.io/badge/Gemini-2.0_Flash-orange?logo=google-gemini&logoColor=white)](https://ai.google.dev/)

**SmartInterview** is a production-grade, voice-enabled AI technical interview coach designed to simulate real-world FAANG interviews. Built on a sophisticated state-machine architecture and powered by Google Gemini 2.0 Flash, it provides a rigorous, hands-free technical assessment experience.

🚀 **[Try the Live Demo](https://smart-interview-hk7cpejeb-shaiikhaiders-projects.vercel.app/)**

---

## 🔥 Key Features

### 🧠 Phase-Driven AI Interviewer
The interview follows a strict, 7-stage professional sequence:
1.  **HR Introduction**: Set the stage and introduce yourself.
2.  **HR Follow-up**: Detailed background and experience check.
3.  **Problem Selection**: AI generates a unique coding problem based on your chosen topic and difficulty.
4.  **Approach Discussion**: Explain your logic before you code—the AI will challenge your edge cases.
5.  **Live Coding**: Integrated Monaco Editor with real-time feedback and hints.
6.  **Technical Deep-Dive**: Fundamental CS questions related to the problem.
7.  **Professional Feedback**: Receive a comprehensive score (1-10) and a Hire/No-Hire recommendation.

### 🎙️ Hands-Free Voice Integration
- **Speech-to-Text**: Respond to the interviewer naturally using your voice.
- **Text-to-Speech**: The AI interviewer speaks back to you with natural conversational cues.
- **Hands-Free Flow**: Experience the pressure of a real technical round without typing every response.

### 💻 Integrated Solution Editor
- **Monaco Editor Support**: FAANG-style coding environment (Python).
- **AI Mental Code Evaluation**: The backend runs "mental test cases" to verify your solution's correctness and complexity.

---

## 🎨 UX & UI Highlights
- **Premium Dark Mode**: Sleek, distraction-free interface built for focus.
- **Real-Time Progress**: Dynamic progress bars and phase icons.
- **Split-Screen Design**: Seamlessly transition from conversational discussion to full-screen coding.
- **Active Chat Indicators**: Animated typing dots and voice status indicators.

---

## 🛠️ Tech Stack Implementation

### Frontend (Next.js 15 + React 19)
- **Framework**: `Next.js` (App Router) for high-performance server-side rendering.
- **Styling**: `Tailwind CSS 4` for a beautiful, modern design system.
- **Editor**: `@monaco-editor/react` for the professional code IDE.
- **State Management**: React Hooks and Session Storage for stable interview sessions across refreshes.

### Backend (FastAPI + Python)
- **Server**: `FastAPI` for asynchronous, high-concurrency request handling.
- **AI Engine**: `Google Gemini 2.0 Flash` SDK with tailored system prompts.
- **KeyManager**: Custom-built **Round-Robin Rotation** and **Auto-Cooldown** system to maximize free-tier quota (RPM/RPD limits).
- **Session Logic**: Memory-based session tracking with a robust state-machine.

---

## 🛤️ Getting Started

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Gemini API Key

### Local Setup

#### 1. Clone the repository
```bash
git clone https://github.com/ShaiikHaider/SmartInterview.git
cd SmartInterview
```

#### 2. Configure Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate | Unix: source .venv/bin/activate
pip install -r requirements.txt
# Create a .env file with: GEMINI_API_KEY=your_api_key_here
python main.py
```

#### 3. Configure Frontend
```bash
cd frontend
npm install
# Create a .env.local file with: NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

---

## ☁️ Deployment

### Vercel (Frontend)
- **Root Directory**: `frontend`
- **Build Command**: `next build`
- **Output Directory**: `.next`
- **Framework**: `Next.js`

### Render (Backend)
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `python main.py`

---

## 📜 Future Roadmap
- [ ] Multi-language Support (Java, C++, JS)
- [ ] Exportable Interview Transcripts
- [ ] User Dashboards & Performance History (Postgres)
- [ ] Real-time Code Execution (Dockerized)

---

**Developed with ❤️ by ShaiikHaider**
