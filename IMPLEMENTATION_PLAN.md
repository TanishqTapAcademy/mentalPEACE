# MentailPeace — Implementation Plan (v3.0)

**Updated**: 2026-03-31
**Status**: Planning complete — ready to code
**Memory System**: Mem0 (replaced Memori)

---

## Tech Stack
- **Backend**: Python (FastAPI)
- **Frontend**: React (Vite + TypeScript + Tailwind)
- **Database**: PostgreSQL (Supabase + pgvector extension)
- **AI**: OpenRouter API (multi-LLM access)
- **Memory**: Mem0 (pip install, 100% local, Apache 2.0, OpenRouter supported)
- **Streaming**: SSE (Server-Sent Events)

---

## Project Structure

```
mentailpeace/
+-- backend/
|   +-- app/
|   |   +-- main.py                    # FastAPI app, CORS, lifespan
|   |   +-- core/
|   |   |   +-- config.py             # Pydantic settings (.env)
|   |   |   +-- database.py           # Async SQLAlchemy engine + session
|   |   +-- models/
|   |   |   +-- user.py               # User + Profile ORM
|   |   |   +-- message.py            # Message ORM
|   |   |   +-- notification.py       # Scheduled notification ORM
|   |   +-- schemas/                   # Pydantic request/response schemas
|   |   +-- routers/
|   |   |   +-- auth.py               # Signup, login, guest, refresh
|   |   |   +-- chat.py               # Chat + undo endpoints
|   |   |   +-- onboarding.py         # 7-step onboarding
|   |   |   +-- profile.py            # Profile CRUD
|   |   |   +-- messages.py           # Message history
|   |   +-- knowledge/
|   |   |   +-- index.json            # Topic -> strategy mapping tree
|   |   |   +-- base_prompt.txt       # Kael persona + Rogers tone + response format
|   |   |   +-- strategies/
|   |   |       +-- cbt.json          # ~350 tokens each
|   |   |       +-- dbt.json
|   |   |       +-- act.json
|   |   |       +-- sfbt.json
|   |   |       +-- mi.json
|   |   |       +-- person_centered.json
|   |   |       +-- narrative.json
|   |   |       +-- psychodynamic.json
|   |   |       +-- gestalt.json
|   |   |       +-- positive_psychology.json
|   |   +-- services/
|   |       +-- knowledge_router.py   # Topic classify + strategy select
|   |       +-- prompt_builder.py     # Assemble final LLM prompt
|   |       +-- crisis_detector.py    # Background LLM crisis classification
|   |       +-- chat_service.py       # Orchestrates full chat flow
|   |       +-- llm_service.py        # OpenRouter API client + SSE streaming
|   |       +-- memory_service.py     # Mem0 wrapper (init, add, search, per-user)
|   |       +-- notification_service.py # Background proactive notifications
|   +-- requirements.txt
|   +-- .env
+-- frontend/
|   +-- src/
|   |   +-- components/
|   |   |   +-- chat/                 # ChatWindow, MessageBubble, ChatInput, OptionPills
|   |   |   +-- layout/              # AppLayout, Header
|   |   |   +-- auth/                # LoginForm, SignupForm
|   |   |   +-- onboarding/          # OnboardingStep
|   |   |   +-- settings/            # ProfileSettings
|   |   +-- hooks/
|   |   |   +-- useChat.ts           # SSE streaming + message state
|   |   |   +-- useAuth.ts           # Auth state + JWT
|   |   +-- stores/                   # Zustand (auth, chat)
|   |   +-- api/                      # API client (axios + SSE fetch)
|   |   +-- types/                    # TypeScript interfaces
|   +-- vite.config.ts
|   +-- package.json
+-- docker-compose.yml
+-- .env.example
```

---

## Implementation Phases

### Phase 1: Foundation + Mem0 Test
**Goal**: Database, auth, and verify Mem0 works with Supabase + OpenRouter

1. Enable pgvector extension in Supabase
   - `CREATE EXTENSION IF NOT EXISTS vector;`
2. PostgreSQL schema via Alembic migrations
   - users, profiles, messages, scheduled_notifications tables
3. Mem0 integration
   - `pip install mem0ai`
   - Configure pgvector with Supabase credentials
   - Configure OpenRouter as LLM provider
   - Test: `m.add()` → `m.search()` → verify it works
   - Test: deduplication (add conflicting facts, verify UPDATE)
   - Test: per-user isolation (user_id parameter)
4. Auth endpoints
   - Email + password signup/login (JWT access + refresh tokens)
   - Guest mode (temp user, merges on signup)
5. Configurable parameters in .env

**Verification**: Add memories for test user, search them back, confirm OpenRouter + pgvector + Mem0 work together.

### Phase 2: Knowledge System + Chat
**Goal**: Kael talks with the right therapy approach

1. Knowledge files
   - index.json (topic -> strategy tree with weights)
   - base_prompt.txt (Kael persona + Rogers tone + response format + option rules)
   - 10 strategy JSON files (~350 tokens each)
2. Knowledge Router
   - Tier 1: keyword matching (free, instant)
   - Tier 2: LLM classification (fallback for unclear topics)
   - Strategy selector (Rogers base in prompt + top 2 by weight)
3. Prompt Builder
   - Fetches Mem0 memories via `m.search()`
   - Assembles: base_prompt + strategies + memories + history + user message
   - We control exactly what goes into the prompt (not auto-injected)
4. LLM Service
   - OpenRouter client with SSE streaming
   - StreamingResponse for FastAPI
5. Chat endpoint
   - POST /api/chat — full flow:
     1. Topic classify → select strategies
     2. Mem0 search → relevant memories
     3. Build prompt → send to OpenRouter
     4. Stream response via SSE
     5. Save messages to DB
     6. Mem0 add → store new memories (background)
6. Crisis Detector
   - Background LLM call (cheap model, parallel, non-blocking)
   - Graduated levels: none/low/medium/high/critical
   - Flags stored in DB, affect next Kael response

**Verification**: Chat with Kael, verify topic routing, strategy selection, streaming, Mem0 memory persistence across conversations.

### Phase 3: Onboarding + Returns
**Goal**: First-time and returning user experiences

1. 7-step onboarding
   - Steps 1-3: scripted messages (name, age, gender)
   - Steps 4+: AI-generated with Mem0 context
   - Each step stored via Mem0 immediately
   - Onboarding exchanges don't count toward limits
2. Welcome-back flow
   - Detect staleness (>48h since last message)
   - Mem0 search for recent context
   - Natural continuation (never say "welcome back")
3. Notification service
   - Background worker detects inactivity
   - Mem0 search for context (commitments, patterns)
   - Spacing: 4-12h -> 24-48h -> 72h+ -> stop
   - Web Push API

**Verification**: Complete onboarding, leave for 48h+, verify welcome-back. Test notifications.

### Phase 4: Frontend
**Goal**: Full React UI

1. Chat UI
   - MessageBubble (user right, Kael left, markdown rendering)
   - OptionPills (tappable, only on latest AI message)
   - ChatInput (always visible, send button)
   - Streaming text display (SSE hook)
   - Thinking indicator ("Kael is thinking...")
2. Auth pages (login, signup)
3. Onboarding (in-chat, not separate screens)
4. Message undo (DELETE last exchange, restore previous options)
5. Profile/Settings screen
6. Responsive mobile layout

**Verification**: Full E2E flow in browser.

### Phase 5: Polish
**Goal**: Production-ready

1. Guest wall (after GUEST_EXCHANGE_LIMIT exchanges)
2. Paywall (after PAYWALL_EXCHANGE_LIMIT, Stripe)
3. Exchange counting
4. Error handling (network drops, LLM failures, retries)
5. Loading states, empty states
6. Rate limiting
7. Date separators in chat
8. Dark/light mode

---

## Key Documents

| Document | Purpose |
|----------|---------|
| `PRD.md` | Original product requirements |
| `MVP_PRD.md` | Detailed Kael requirements |
| `KAEL_REQUIREMENTS_MAPPING.md` | Kael features -> our implementation mapping |
| `ARCHITECTURE.md` | Full technical architecture (v3.0 — Mem0 + Knowledge Router) |
| `MEM0_VERIFIED.md` | Verified Mem0 API reference |
| `IMPLEMENTATION_PLAN.md` | This file — build phases and file structure |
