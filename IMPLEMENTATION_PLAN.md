# MentailPeace — Full-Stack MVP Plan

## Context
Building an AI therapist app from scratch. Empty git repo. The user wants personalized therapy sessions with intelligent memory that persists across sessions. Using **Memori** as the memory layer for its structured categories and token efficiency.

## Tech Stack
- **Backend**: Python (FastAPI)
- **Frontend**: React (Vite + TypeScript + Tailwind)
- **Database**: PostgreSQL (Memori BYODB + app data)
- **AI**: OpenRouter API (multi-LLM access)
- **Memory**: Memori (SQL-native, 8 memory categories, Apache 2.0)
- **Streaming**: SSE (Server-Sent Events) — simplest streaming, like ChatGPT

## Project Structure
```
mentailpeace/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, lifespan
│   │   ├── config.py            # Pydantic settings (.env)
│   │   ├── database.py          # Async SQLAlchemy engine + session
│   │   ├── models/              # SQLAlchemy ORM (user, session, message)
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── api/                 # FastAPI routers (auth, sessions, chat)
│   │   ├── services/
│   │   │   ├── chat_service.py  # Orchestrates chat flow + Memori integration
│   │   │   ├── llm_service.py   # OpenRouter API client with streaming
│   │   │   └── memory_service.py# Memori wrapper — therapy-specific memory logic
│   │   └── prompts/
│   │       └── therapist.py     # System prompt + memory context formatting
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── components/chat/     # ChatWindow, MessageBubble, ChatInput
│   │   ├── components/sessions/ # SessionList, SessionCard
│   │   ├── components/layout/   # AppLayout, Sidebar, Header
│   │   ├── components/auth/     # LoginForm, SignupForm
│   │   ├── hooks/               # useChat (SSE streaming), useSessions, useAuth
│   │   ├── stores/              # Zustand (auth, chat state)
│   │   ├── api/                 # API client layer (axios + SSE fetch)
│   │   └── types/               # TypeScript interfaces
│   ├── vite.config.ts
│   └── package.json
├── docker-compose.yml           # PostgreSQL
└── .env.example
```

## How Memori Fits In

Memori handles memory automatically. We wrap it in a `memory_service.py` for therapy-specific logic.

### Memori's 8 Memory Categories → Therapy Mapping
| Memori Category | Therapy Usage |
|---|---|
| **attributes** | Patient demographics, personality traits |
| **events** | Session summaries, life events discussed |
| **facts** | Diagnoses, medications, specific statements |
| **people** | Family members, friends, coworkers mentioned |
| **preferences** | Communication style, therapy approach preferences |
| **relationships** | Dynamics with family, partner, colleagues |
| **rules** | Boundaries set, therapy goals, commitments |
| **skills** | Coping strategies learned, techniques practiced |

### Chat Flow with Memori
```
1. User sends message
2. Memori auto-injects relevant memories into the LLM context
3. LLM generates therapist response (streamed via SSE)
4. Memori auto-extracts new memories in background (zero latency)
5. Save message to our messages table for session history
```

### memory_service.py Responsibilities
- Initialize Memori with entity_id (user) and process_id (therapist agent)
- Register the OpenRouter LLM client with Memori
- Per-session attribution setup
- Optional: query specific memory categories for session summaries

## Database Schema (Our App Tables — Memori manages its own)
```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Therapy sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    mood_start VARCHAR(50),
    mood_end VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- Messages (for session history display)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints
```
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/refresh

GET    /api/sessions
POST   /api/sessions
GET    /api/sessions/{id}
PATCH  /api/sessions/{id}          # End session

POST   /api/chat/{session_id}      # SSE streaming response (tokens stream back)
```

## Implementation Phases

### Phase 1: Foundation
- Project structure, .gitignore, .env.example
- docker-compose.yml (PostgreSQL)
- FastAPI skeleton: config, database, models, migrations
- Auth endpoints (signup, login, JWT)
- Session CRUD

### Phase 2: Chat + Memori Integration
- Install Memori: `pip install memori`
- `llm_service.py` — OpenRouter client with streaming
- `memory_service.py` — Memori setup, entity/process attribution
- `chat_service.py` — register LLM with Memori, handle chat flow
- SSE streaming endpoint (FastAPI StreamingResponse)
- Therapist system prompt
- Test: send messages, verify Memori remembers across sessions

### Phase 3: React Frontend
- Vite + React + TypeScript + Tailwind
- Auth pages (login/signup)
- AppLayout with sidebar
- ChatWindow, MessageBubble, ChatInput
- useChat hook with SSE streaming (fetch + ReadableStream)
- SessionList sidebar

### Phase 4: Polish
- Mood tracking (start/end of session)
- Session titles (auto-generated)
- Error handling, loading states
- Responsive design
- Rate limiting

## Verification
- Start PostgreSQL via docker-compose
- Start backend: `uvicorn app.main:app --reload`
- Start frontend: `npm run dev`
- Test flow: sign up → start session → chat → end session → start new session → verify AI recalls info from previous session
