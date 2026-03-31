# MentailPeace — Architecture & Technical Specification

**Version**: 2.0 (Post-Planning)
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
              + Memori memories (auto-injected, up to 5)
              + last 20 messages
              + user message
                    |
                    v
              OpenRouter LLM -> SSE stream -> user
                    |
                    v
              Memori auto-extracts new memories (background)
```

---

## 2. Knowledge Routing Architecture

### The Problem
Loading ALL 10 therapy strategies into every prompt wastes ~3500 tokens. Most messages only need 2 strategies.

### The Solution: PageIndex-Inspired Routing
Inspired by vectorless RAG (PageIndex concept). A structured JSON index maps user topics to relevant therapy strategies. No vector DB needed.

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
                    |  + Memori memories (auto)       |
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

### Classification Example

```
User: "I can't stop worrying about my exam, my heart races every night"

  Tier 1 Keyword Match:
    "worrying" -> anxiety_fear
    "heart racing" -> anxiety_fear
    Score: anxiety_fear = 2 hits

  Strategy Selection:
    Base:    person_centered.json  (always)
    Primary: cbt.json              (weight 1.0 in anxiety)
    Secondary: dbt.json            (weight 0.8 in anxiety)

  Prompt = base_prompt + Rogers + CBT + DBT + memories + history
  Tokens saved: ~2000 (skipped 7 other strategies)
```

---

## 3. Memori Integration (Verified)

### What Memori Is
Open-source (Apache 2.0), SQL-native memory layer for LLMs. Auto-extracts and auto-retrieves memories. Published benchmark: 81.95% accuracy on LoCoMo at only 1,294 tokens per query (vs 26,000+ for full context). 20x cost reduction.

### Verified Configuration

```python
# Initialization
mem = Memori(
    database_connect="postgresql+psycopg2://user:pass@host:5432/mentailpeace",
    conscious_ingest=True,    # essentials at session start
    auto_ingest=True          # relevant memories per message
)

# LLM registration (OpenRouter via OpenAI-compatible client)
client = OpenAI(
    api_key=openrouter_key,
    base_url="https://openrouter.ai/api/v1"
)
mem.llm.register(client)

# Attribution (required — without this, no memories are created)
mem.attribution(entity_id=user_id, process_id="kael")
```

### Dual Memory System (Verified Behavior)

| Mode | When It Runs | What It Does | Tokens |
|------|-------------|-------------|--------|
| **Conscious Ingest** | Once at session start | Injects essential long-term memories into session context | ~100-300 |
| **Auto Ingest** | Every message | Searches all memories, injects up to 5 most relevant | ~200-500 |
| **Combined** | Both together | Best of both — essentials + per-query relevance | ~300-800 |

**Important corrections from research:**
- Conscious Agent runs ONCE at startup, NOT continuously every 6 hours
- Short-term and long-term are SEPARATE pipelines, not merged during search
- You CAN manually trigger analysis: `mem.trigger_conscious_analysis()`
- Short-term memory has ~7 day retention

### Memory Categories

**Basic (5):** facts, preferences, skills, context, rules
**Advanced Augmentation (8):** attributes, events, facts, people, preferences, relationships, rules, skills

We use **Advanced Augmentation** for the full 8 categories needed for therapy.

### Available API Methods

```python
mem.get_memory_stats()                              # Returns memory counts
mem.search_memories_by_category("skill", limit=5)   # Search by category
mem.recall("query", limit=5)                        # Manual recall
mem.trigger_conscious_analysis()                    # Manual promotion
mem.new_session()                                   # New session
mem.set_session(session_id="...")                    # Set specific session
```

### What Memori Handles Automatically (No Custom Code)
- Memory extraction from every conversation
- Memory retrieval per query
- Deduplication (for semantic triples)
- Relevance ranking
- Token-efficient context injection

### OpenRouter Compatibility
Not officially documented by MemoriLabs, but custom base_url is supported (tested with Nebius AI Studio). OpenRouter provides OpenAI-compatible API. **Needs early testing in Phase 1.**

---

## 4. AI Features & Implementation

### Feature 1: Therapeutic Conversation
- Knowledge Router classifies topic -> selects 2 strategies
- Base prompt (Kael persona) + strategies + Memori memories + history -> LLM
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

### Feature 3: Automatic Memory
Memori handles everything. Both modes enabled:
- Conscious Ingest: essentials at session start
- Auto Ingest: up to 5 relevant memories per message
- Auto-extraction after every LLM response

### Feature 4: Crisis Detection (LLM-Based, Non-Blocking)
- Runs in PARALLEL with main chat flow — never interrupts user
- Background LLM call with cheap fast model
- Returns level: none / low / medium / high / critical
- medium: Kael weaves gentle resource mention into next response
- high/critical: Kael leads next response with resources naturally
- Resources: 988 Suicide & Crisis Lifeline, Crisis Text Line (741741), 911
- Memori history helps — prior crisis flags lower the threshold

**Why not regex:**
```
"I don't want to be here anymore"      -> regex misses, LLM catches
"What's even the point of going on"    -> regex misses, LLM catches
"My job is killing me"                 -> regex false-flags, LLM understands metaphor
```

### Feature 5: Onboarding (7 Steps, Memori-Powered)
- Steps 1-3: Scripted (need basic info first) — each answer stored via Memori immediately
- Steps 4+: AI-generated using Memori context building in real-time
- By step 7: Memori has a mini-profile, Kael's first real response feels personal
- Onboarding exchanges do NOT count toward exchange limits

### Feature 6: Welcome-Back (Memori-Powered)
- Triggered when user returns after 48+ hours
- Memori auto-retrieves last topics, commitments, coping skills practiced
- Kael picks up naturally — never says "welcome back"
- Same JSON format with options, includes "start fresh" escape hatch

### Feature 7: Proactive Notifications (Memori-Powered)
- Background job detects user inactivity
- Memori provides context (commitments, patterns, recent topics)
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
| base_prompt.txt (Kael persona) | ~400-500 |
| person_centered.json (always loaded) | ~350 |
| 1-2 matched strategies | ~350-700 |
| Memori memories (auto-injected) | ~300-800 |
| Last 20 messages | ~2000-4000 |
| User message | ~50-200 |
| **TOTAL** | **~3,450-6,550** |

vs loading all strategies: ~11,000+ tokens. **~50% savings.**

---

## 6. File Structure

```
backend/app/
+-- knowledge/
|   +-- index.json                  # Topic -> strategy mapping tree
|   +-- base_prompt.txt             # Kael persona + response format + option rules
|   +-- strategies/
|       +-- cbt.json                # ~350 tokens each
|       +-- dbt.json
|       +-- act.json
|       +-- sfbt.json
|       +-- mi.json
|       +-- person_centered.json    # Rogers (always loaded as base)
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
|   +-- memory_service.py           # Memori wrapper (init, attribution, session mgmt)
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

-- User Profile (our table — Memori also stores attributes/people/etc)
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

-- Memori manages its own tables automatically (we don't touch them)
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

### Phase 1: Foundation + Memori Test
- PostgreSQL schema (users, profiles, messages, scheduled_notifications)
- Memori integration (BYODB PostgreSQL, test OpenRouter compatibility)
- FastAPI auth (email + guest mode, JWT)
- Configurable parameters

### Phase 2: Knowledge System + Chat
- Knowledge tree (index.json + 10 strategy files)
- base_prompt.txt (Kael persona)
- Knowledge router (topic classify + strategy select)
- Prompt builder (assemble full payload)
- OpenRouter LLM service with SSE streaming
- Chat endpoint with Memori auto memory
- Crisis detector (background, non-blocking)

### Phase 3: Onboarding + Returns
- 7-step in-chat onboarding (steps 1-3 scripted, 4+ AI)
- Welcome-back flow (Memori-powered)
- Notification service (background worker, Memori-powered)

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
