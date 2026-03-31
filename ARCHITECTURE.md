# MentailPeace — Architecture & Technical Specification

**Version**: 3.0 (Mem0 + Knowledge Router)
**Date**: 2026-03-31
**Status**: Finalized — Ready for Implementation

---

## 1. System Overview

MentailPeace is an AI therapy companion app. The AI is named **Kael** (never called chatbot or AI therapist). It's a single continuous chat per user (like WhatsApp with one person) with persistent memory that makes Kael feel like it truly knows you.

### High-Level Flow

```
User sends message
      |
      +---> Crisis classifier (background LLM, non-blocking)
      |
      +---> Topic classifier (keywords -> strategy selection)
      |
      +---> Prompt Builder:
              base_prompt.txt (Kael persona)
              + 2 matched strategies (from knowledge tree)
              + Mem0 memories (manually fetched via m.search())
              + last 20 messages
              + user message
                    |
                    v
              OpenRouter LLM -> SSE stream -> user
                    |
                    v
              Mem0 stores new memories (m.add() in background)
```

---

## 2. Knowledge Routing Architecture

### The Problem
Loading ALL 10 therapy strategies into every prompt wastes ~3500 tokens. Most messages only need 2 strategies.

### The Solution: PageIndex-Inspired Routing
Inspired by vectorless RAG (PageIndex concept). A structured JSON index maps user topics to relevant therapy strategies. No vector DB needed for routing — just JSON lookup.

```
                         User Message
                              |
                              v
                    +------------------+
                    |   CRISIS CHECK    | <- background LLM call (non-blocking)
                    |   (parallel)      | <- cheap fast model
                    +--------+---------+
                             |
                    +--------+--------+
                    |                  |
               Crisis detected    Safe to proceed
                    |                  |
                    v                  v
           +----------------+  +------------------+
           | Flag in DB      |  |  TOPIC CLASSIFIER |
           | Next response   |  |                    |
           | includes        |  |  Tier 1: Keywords  | <- zero tokens
           | resources       |  |  Tier 2: LLM call  | <- only if unclear
           +----------------+  +--------+-----------+
                                        |
                                Returns 1-3 categories
                                        |
                                        v
                           +---------------------+
                           |  STRATEGY SELECTOR    |
                           |                       |
                           |  Always: Rogers base  |
                           |  + Top 2 matched      |
                           |  strategies (by weight)|
                           +---------+-------------+
                                     |
                                     v
                    +-------------------------------+
                    |      PROMPT BUILDER            |
                    |                                |
                    |  base_prompt.txt               |
                    |  + selected strategies          |
                    |  + Mem0 memories (m.search())   |
                    |  + last 20 messages             |
                    |  + user message                 |
                    +---------------+---------------+
                                    |
                                    v
                    +-------------------------------+
                    |     OpenRouter LLM (SSE)       |
                    +-------------------------------+
```

### Knowledge Tree (index.json)

```
Therapy Knowledge Index
|
+-- Anxiety & Fear
|   +-- CBT (Beck)           weight: 1.0
|   +-- DBT (Linehan)        weight: 0.8
|   +-- ACT (Hayes)          weight: 0.7
|   +-- Gestalt (Perls)      weight: 0.5
|
+-- Depression & Low Mood
|   +-- CBT (Beck)           weight: 1.0
|   +-- Positive Psych       weight: 0.8
|   +-- ACT (Hayes)          weight: 0.7
|   +-- SFBT (de Shazer)     weight: 0.6
|
+-- Relationships
|   +-- Person-Centered      weight: 1.0
|   +-- Narrative (White)    weight: 0.8
|   +-- DBT                  weight: 0.7
|   +-- Psychodynamic        weight: 0.6
|
+-- Addiction & Habits
|   +-- MI (Miller)          weight: 1.0
|   +-- CBT                  weight: 0.8
|   +-- DBT                  weight: 0.7
|
+-- Trauma & Past Pain
|   +-- Narrative            weight: 1.0
|   +-- Psychodynamic        weight: 0.8
|   +-- DBT                  weight: 0.7
|   +-- Gestalt              weight: 0.6
|
+-- Self-Esteem & Identity
|   +-- Person-Centered      weight: 1.0
|   +-- Positive Psych       weight: 0.8
|   +-- Narrative            weight: 0.7
|   +-- CBT                  weight: 0.6
|
+-- Stress & Overwhelm
|   +-- DBT                  weight: 1.0
|   +-- ACT                  weight: 0.8
|   +-- SFBT                 weight: 0.7
|   +-- Gestalt              weight: 0.6
|
+-- General / Unknown
    +-- Person-Centered      weight: 1.0
    +-- SFBT                 weight: 0.8
    +-- MI                   weight: 0.6
```

### 10 Therapy Strategies

| # | Strategy | Pioneer | Core Idea | Kael Use |
|---|----------|---------|-----------|----------|
| 1 | **CBT** | Aaron Beck | Thoughts shape feelings/behavior | Thought challenging, cognitive restructuring |
| 2 | **Psychodynamic** | Freud, Jung | Unconscious patterns from past drive present | Pattern tracking, "when did you first feel this?" |
| 3 | **Person-Centered** | Carl Rogers | People have answers within — therapist creates space | Core tone: reflect, validate, don't fix (ALWAYS loaded) |
| 4 | **DBT** | Marsha Linehan | Balance acceptance AND change | Breathing, grounding (5-4-3-2-1), TIPP technique |
| 5 | **SFBT** | de Shazer, Berg | Focus on solutions, not problems | Scaling questions, miracle question, finding exceptions |
| 6 | **Gestalt** | Fritz Perls | Present moment + body awareness | "What are you feeling in your body right now?" |
| 7 | **MI** | William Miller | People change from own reasons, not being told | OARS: Open questions, Affirmations, Reflections, Summaries |
| 8 | **ACT** | Steven Hayes | Accept difficult feelings, act on values | Cognitive defusion, values clarification |
| 9 | **Narrative** | White, Epston | You are not the problem — the problem is the problem | Externalize issues, rewrite your story |
| 10 | **Positive Psychology** | Martin Seligman | Build strengths, not just fix weaknesses | Gratitude, flow states, character strengths |

---

## 3. Mem0 Integration (Verified)

### Why Mem0 (Not Memori)
- 100% free, 100% self-hosted — no cloud dependency, no rate limits
- Apache 2.0 — free for production and commercial use forever
- OpenRouter officially supported (dedicated config parameter)
- Smart deduplication (ADD/UPDATE/DELETE/NOOP)
- Optional graph memory (Neo4j) for relationship tracking
- 37k+ GitHub stars, mature community
- pip install — runs inside our FastAPI app, no separate server

### Verified Configuration

```python
from mem0 import Memory

config = {
    "vector_store": {
        "provider": "pgvector",
        "config": {
            "host": "db.xxxxx.supabase.co",
            "port": 5432,
            "user": "postgres",
            "password": "your-password",
            "dbname": "postgres",
            "collection_name": "mem0"
        }
    },
    "llm": {
        "provider": "openrouter",
        "config": {
            "model": "anthropic/claude-sonnet-4",
            "api_key": "your-openrouter-key"
        }
    }
}

m = Memory.from_config(config)
```

**Prerequisite:** Run once in Supabase SQL editor:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### How Mem0 Works

**Store (after each conversation):**
```python
m.add("My sister Maya and I had a fight about dad's retirement", user_id="user_123")
# Mem0 LLM extracts: sister Maya, fight, dad retiring
# Checks existing: duplicates? → ADD/UPDATE/DELETE/NOOP
# Saves to PostgreSQL (pgvector)
```

**Search (before each LLM call):**
```python
results = m.search("family problems", user_id="user_123")
# Vector similarity search — matches by MEANING not keywords
# "dad" matches "father", "fight" matches "conflict"
# Returns only relevant memories (not everything)
```

### Memory Approach
- Mem0 stores flat facts + vector embeddings in PostgreSQL (pgvector)
- No structured categories like Memori's 8 — but we add structure via metadata:
  ```python
  m.add("Learned box breathing", user_id="user_123", metadata={"category": "skill"})
  m.add("Sister Maya", user_id="user_123", metadata={"category": "people"})
  ```
- Smart deduplication: "I live in Mumbai" → later "I moved to Bangalore" → Mem0 UPDATES, doesn't duplicate
- Optional graph memory (Neo4j) for entity relationships — can add later

### Database Layout

```
Your Supabase PostgreSQL
+-- users                 (our table)
+-- profiles              (our table)
+-- messages              (our table)
+-- scheduled_notifications (our table)
+-- mem0                  (Mem0 creates this — memories + vectors)
```

### Key Difference from Memori
| Aspect | Memori | Mem0 (our choice) |
|--------|--------|-------------------|
| Cloud dependency | Rate limited (100/day without key) | None — 100% local |
| OpenRouter | Not officially tested | Officially supported |
| Categories | 8 structured | Flat facts + metadata tags |
| Accuracy (LoCoMo) | 81.95% | 62.47% (offset by our knowledge routing) |
| Deduplication | Semantic triples only | Smart ADD/UPDATE/DELETE/NOOP |
| Graph memory | No | Optional (Neo4j) |
| Production limits | Unclear | None |

---

## 4. AI Features & Implementation

### Feature 1: Therapeutic Conversation
- Knowledge Router classifies topic -> selects 2 strategies
- Base prompt (Kael persona) + strategies + Mem0 memories + history -> LLM
- Response streamed via SSE

### Feature 2: JSON Response Format
Every Kael response is strict JSON:
```json
{"message": "therapeutic response with markdown...", "options": ["option 1", "option 2", "Something else..."]}
```
- `message`: 40-120 words, markdown supported
- `options`: 0-5 diagnostic pills
  - At least one uncomfortable truth
  - At least one common deflection
  - Last one always a free-text escape hatch
  - Only latest message shows options (older = plain text)

### Feature 3: Automatic Memory (Mem0)
- Before LLM call: `m.search(user_message, user_id=uid)` — fetch relevant memories
- After LLM response: `m.add(conversation, user_id=uid)` — store new memories (background)
- Smart dedup handles repeated information automatically
- We manually control what goes into the prompt (not auto-injected black box)

### Feature 4: Crisis Detection (LLM-Based, Non-Blocking)
- Runs in PARALLEL with main chat flow — never interrupts user
- Background LLM call with cheap fast model
- Returns level: none / low / medium / high / critical
- medium: Kael weaves gentle resource mention into next response
- high/critical: Kael leads next response with resources naturally
- Resources: 988 Suicide & Crisis Lifeline, Crisis Text Line (741741), 911
- Mem0 history helps — prior crisis flags lower the threshold

### Feature 5: Onboarding (7 Steps, Mem0-Powered)
- Steps 1-3: Scripted (need basic info first) — each answer stored via Mem0 immediately
- Steps 4+: AI-generated using Mem0 context building in real-time
- By step 7: Mem0 has a mini-profile, Kael's first real response feels personal
- Onboarding exchanges do NOT count toward exchange limits

### Feature 6: Welcome-Back (Mem0-Powered)
- Triggered when user returns after 48+ hours
- Mem0 search retrieves last topics, commitments, coping skills
- Kael picks up naturally — never says "welcome back"
- Same JSON format with options, includes "start fresh" escape hatch

### Feature 7: Proactive Notifications (Mem0-Powered)
- Background job detects user inactivity
- Mem0 provides context (commitments, patterns, recent topics)
- LLM generates personal check-in (not generic spam)
- Spacing: 4-12h first -> 24-48h after 1 missed -> 72h+ after 2 -> stop after 3
- Delivered via Web Push API

### Feature 8: Undo Last Message
- Zero AI. Pure DB operation.
- DELETE last user message + last AI response
- Decrement exchange_count
- Frontend restores previous AI message with live options

### Feature 9: Session Title Generation
- Small LLM call after every few exchanges
- "Summarize this conversation in 3-5 words"
- For internal tracking only

---

## 5. Token Budget (Per Request)

| Component | Tokens |
|-----------|--------|
| base_prompt.txt (Kael persona + Rogers tone) | ~500-600 |
| 1-2 matched strategies | ~350-700 |
| Mem0 memories (manually fetched) | ~300-500 |
| Last 20 messages | ~2000-4000 |
| User message | ~50-200 |
| **TOTAL** | **~3,200-6,000** |

vs loading all strategies: ~11,000+ tokens. **~50% savings.**

---

## 6. File Structure

```
backend/app/
+-- knowledge/
|   +-- index.json                  # Topic -> strategy mapping tree
|   +-- base_prompt.txt             # Kael persona + Rogers tone + response format + option rules
|   +-- strategies/
|       +-- cbt.json                # ~350 tokens each
|       +-- dbt.json
|       +-- act.json
|       +-- sfbt.json
|       +-- mi.json
|       +-- person_centered.json    # Rogers (loaded when topic-specific depth needed)
|       +-- narrative.json
|       +-- psychodynamic.json
|       +-- gestalt.json
|       +-- positive_psychology.json
|
+-- services/
|   +-- knowledge_router.py         # Topic classify + strategy select
|   +-- prompt_builder.py           # Assemble final LLM prompt
|   +-- crisis_detector.py          # Background LLM crisis classification
|   +-- chat_service.py             # Orchestrates full chat flow
|   +-- llm_service.py              # OpenRouter API client with SSE streaming
|   +-- memory_service.py           # Mem0 wrapper (init, add, search, per-user)
|   +-- notification_service.py     # Background proactive notifications
```

---

## 7. Database Schema

```sql
-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_provider VARCHAR(20) DEFAULT 'email',  -- email | google | guest
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    subscription_status VARCHAR(20) DEFAULT 'free',  -- guest | free | trial | active | expired
    exchange_count INTEGER DEFAULT 0,
    notification_enabled BOOLEAN DEFAULT FALSE,
    last_active_at TIMESTAMPTZ DEFAULT NOW(),
    onboarding_step INTEGER DEFAULT 0,
    onboarding_completed BOOLEAN DEFAULT FALSE
);

-- User Profile (our table for structured data — Mem0 also stores facts)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100),
    age VARCHAR(20),
    gender VARCHAR(50),
    location VARCHAR(100),
    timezone VARCHAR(50),
    profession VARCHAR(100),
    key_relationships JSONB DEFAULT '[]',
    interests JSONB DEFAULT '[]',
    notification_preferences JSONB DEFAULT '{}'
);

-- Messages (single continuous chat per user)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,           -- user | assistant
    content TEXT NOT NULL,
    options JSONB DEFAULT '[]',          -- tappable option pills
    exchange_number INTEGER DEFAULT 0,
    source VARCHAR(20) DEFAULT 'chat',   -- chat | notification | onboarding | welcome_back
    is_onboarding BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled Notifications
CREATE TABLE scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message_content JSONB,               -- {message, options}
    send_at TIMESTAMPTZ,
    recheck_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending', -- pending | scheduled | sent | cancelled
    classification VARCHAR(50),           -- action_followup | conversation_continuation | new_topic | pattern_callback
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mem0 creates its own table (mem0) for memories + vectors
-- Requires: CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 8. API Endpoints

```
AUTH
----
POST   /api/auth/signup          # Google OAuth or Email + password
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/guest           # Create guest session

ONBOARDING
----------
POST   /api/onboarding           # Submit onboarding step, get next message

CHAT
----
POST   /api/chat                 # Send message, get SSE streaming response
DELETE /api/chat/undo            # Undo last exchange

WELCOME BACK
------------
POST   /api/welcome-back         # Generate welcome-back message if needed

PROFILE
-------
GET    /api/profile              # Get user profile
PATCH  /api/profile              # Update profile fields

USER
----
GET    /api/user                 # Get user data (subscription, exchange count)
DELETE /api/user                 # Delete account and all data

MESSAGES
--------
GET    /api/messages             # Fetch messages (with pagination)

CONFIG
------
GET    /api/config               # Get configurable parameters
```

---

## 9. Configurable Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `GUEST_EXCHANGE_LIMIT` | 5 | Exchanges before guest signup wall |
| `PAYWALL_EXCHANGE_LIMIT` | 30 | Exchanges before paywall |
| `CONTEXT_WINDOW_EXCHANGES` | 20 | Recent exchanges sent to LLM |
| `MESSAGE_STALENESS_WINDOW` | 48 hours | When welcome-back triggers |
| `NOTIFICATION_RECHECK_FALLBACK` | 24 hours | Default recheck interval |
| `LLM_MODEL` | TBD | Main chat model (via OpenRouter) |
| `CRISIS_MODEL` | TBD | Cheap model for crisis classification |

---

## 10. Implementation Phases

### Phase 1: Foundation + Mem0 Test
- PostgreSQL schema + pgvector extension (Supabase)
- Mem0 integration (pip install, pgvector config, OpenRouter config)
- Test: add memory, search memory, verify dedup works
- FastAPI auth (email + guest mode, JWT)
- Configurable parameters

### Phase 2: Knowledge System + Chat
- Knowledge tree (index.json + 10 strategy files)
- base_prompt.txt (Kael persona + Rogers tone)
- Knowledge router (topic classify + strategy select)
- Prompt builder (assemble: base + strategies + Mem0 memories + history)
- OpenRouter LLM service with SSE streaming
- Chat endpoint with Mem0 memory flow
- Crisis detector (background, non-blocking)

### Phase 3: Onboarding + Returns
- 7-step in-chat onboarding (steps 1-3 scripted, 4+ AI)
- Welcome-back flow (Mem0-powered)
- Notification service (background worker, Mem0-powered)

### Phase 4: Frontend
- React chat UI with tappable option pills
- Streaming text display (SSE)
- Thinking indicator
- Message undo
- Profile/Settings screen
- Responsive mobile layout

### Phase 5: Polish
- Guest wall + signup overlay
- Paywall (Stripe for web)
- Exchange counting
- Error handling, edge cases
- Web Push API for notifications
