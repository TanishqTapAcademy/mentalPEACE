# MentailPeace — Build Progress

## Checkpoint 1: Project Setup (2026-03-27)

### Completed
- [x] Backend folder structure (FastAPI + Python 3.14)
- [x] Frontend folder structure (React + Vite + TypeScript + Tailwind)
- [x] Supabase PostgreSQL connected (PgBouncer fix applied)
- [x] Auto DB check on server startup
- [x] CORS configured (frontend -> backend)
- [x] `.env` files (backend: DB, JWT, OpenRouter | frontend: API URL)
- [x] `.gitignore` set up
- [x] MVP PRD created (focused on Chat, Memory, Prompts, Onboarding, Auth)

### How to Run
```
Backend:  cd backend && source venv/bin/activate && uvicorn app.main:app --reload
Frontend: cd frontend && npm run dev
```

### Endpoints Working
```
GET /         -> {"message": "MentailPeace API is running"}
GET /health   -> {"status": "ok"}
Startup       -> Auto checks DB connection
```

---

## Next Up: Checkpoint 2
- [ ] Database models (User, Message, Profile, Coach's Read, Event Log)
- [ ] Auth (Google OAuth, Email OTP, Guest mode, JWT)
- [ ] Onboarding (6-step in-chat flow)
- [ ] Chat + SSE streaming
- [ ] Memory (Memori integration + Coach's Read)
