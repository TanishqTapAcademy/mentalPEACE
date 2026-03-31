# MentailPeace — Implementation Plan (v2.0)

**Updated**: 2026-03-31
**Status**: Planning complete — ready to code

---

## Tech Stack
- **Backend**: Python (FastAPI)
- **Frontend**: React (Vite + TypeScript + Tailwind)
- **Database**: PostgreSQL (Supabase — Memori BYODB + app data)
- **AI**: OpenRouter API (multi-LLM access)
- **Memory**: Memori (SQL-native, auto extract/retrieve, Advanced Augmentation for 8 categories)
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
|   |   |   +-- base_prompt.txt       # Kael persona + response format
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
|   |       +-- knowledge_router.py   # Crisis check + classify + select strategies
|   |       +-- prompt_builder.py     # Assemble final LLM prompt
|   |       +-- crisis_detector.py    # Background LLM crisis classification
|   |       +-- chat_service.py       # Orchestrates full chat flow
|   |       +-- llm_service.py        # OpenRouter API client + SSE streaming
|   |       +-- memory_service.py     # Memori wrapper (init, attribution, sessions)
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

### Phase 1: Foundation + Memori Test
**Goal**: Database, auth, and verify Memori + OpenRouter works

1. PostgreSQL schema via Alembic migrations
   - users, profiles, messages, scheduled_notifications tables
2. Memori integration
   - Install memori, configure BYODB with Supabase PostgreSQL
   - Test OpenRouter compatibility (CRITICAL — not officially supported)
   - Verify auto_ingest + conscious_ingest work
   - Verify Advanced Augmentation (8 categories)
   - Fallback plan if OpenRouter doesn't work
3. Auth endpoints
   - Email + password signup/login (JWT access + refresh tokens)
   - Guest mode (temp user, merges on signup)
4. Configurable parameters in .env

**Verification**: Send test messages through Memori + OpenRouter, confirm memories extracted and retrieved.

### Phase 2: Knowledge System + Chat
**Goal**: Kael talks with the right therapy approach

1. Knowledge files
   - index.json (topic -> strategy tree with weights)
   - base_prompt.txt (Kael persona, response format, option rules)
   - 10 strategy JSON files (~350 tokens each)
2. Knowledge Router
   - Tier 1: keyword matching (free, instant)
   - Tier 2: LLM classification (fallback for unclear topics)
   - Strategy selector (base + top 2 by weight)
3. Prompt Builder
   - Assembles: base_prompt + strategies + Memori memories + history + user message
4. LLM Service
   - OpenRouter client with SSE streaming
   - StreamingResponse for FastAPI
5. Chat endpoint
   - POST /api/chat — full flow: classify -> build prompt -> stream -> save -> Memori extracts
6. Crisis Detector
   - Background LLM call (cheap model, parallel, non-blocking)
   - Graduated levels: none/low/medium/high/critical
   - Flags stored in DB, affect next Kael response

**Verification**: Chat with Kael, verify topic routing, strategy selection, streaming, memory persistence.

### Phase 3: Onboarding + Returns
**Goal**: First-time and returning user experiences

1. 7-step onboarding
   - Steps 1-3: scripted messages (name, age, gender)
   - Steps 4+: AI-generated with Memori context
   - Onboarding exchanges don't count toward limits
2. Welcome-back flow
   - Detect staleness (>48h since last message)
   - Memori-powered natural continuation
3. Notification service
   - Background worker detects inactivity
   - Memori-powered personal check-ins
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
| `ARCHITECTURE.md` | Full technical architecture (knowledge routing, Memori, features) |
| `MEMORI_VERIFIED.md` | Verified Memori API reference (what's real vs assumed) |
| `IMPLEMENTATION_PLAN.md` | This file — build phases and file structure |
