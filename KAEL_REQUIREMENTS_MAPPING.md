# Kael PRD Requirements → MentailPeace Implementation Mapping

**Goal:** Implement all Kael features using our stack (FastAPI + React + PostgreSQL + Memori + OpenRouter)

---

## 1. CHAT ARCHITECTURE

### Requirement: Single Continuous Chat
- The entire app is ONE infinite chat (like WhatsApp with one person)
- No "new chat" or "sessions" from the user's perspective
- Topics flow naturally — Kael handles topic transitions

**Our Implementation:**
- Drop the multi-session model from our plan
- Single chat thread per user stored in `messages` table
- No session sidebar — just one continuous conversation
- Topic transitions handled by the AI via system prompt

---

### Requirement: Tappable Options
- Every AI response can include 0-5 tappable option pills
- Options are diagnostic — each reveals something about the user
- At least one uncomfortable truth, one common deflection
- Last option is always a free-text escape hatch
- Only the MOST RECENT AI message shows options (older ones = plain text)
- User can always type instead of tapping

**Our Implementation:**
- AI response format: JSON `{"message": "...", "options": [...]}`
- Frontend: render options as pill buttons below the latest AI message
- Text input always visible at bottom
- Tapping an option sends it as the user's message
- Previous messages' options are stripped in the UI

---

### Requirement: Undo Last Message
- User can undo their most recent message + AI's response
- Previous AI message reappears with its options live again
- Hard-delete from database (not soft-delete)
- Exchange count decremented
- Only available for the very last exchange

**Our Implementation:**
- `DELETE /api/chat/undo` endpoint
- Hard-deletes last user message + AI response from `messages` table
- Decrements `exchange_count` on user
- Frontend: removes both messages, restores previous AI message's options

---

### Requirement: Message Display
- AI messages support Markdown (bold, italic, bullets)
- User messages are plain text
- Options as pill buttons below AI messages
- Text input always visible at bottom

**Our Implementation:**
- Use a markdown renderer (react-markdown) for AI messages
- Style user messages as plain text bubbles
- Options component renders conditionally on latest AI message

---

## 2. MEMORY SYSTEM

### Kael's 3 Artifacts → Memori Mapping

Kael uses 3 custom memory artifacts. We'll achieve the same outcomes using Memori's 8 categories.

| Kael Artifact | What It Does | Memori Equivalent |
|---|---|---|
| **Coach's Read** (300-500 word narrative summary of user's journey) | Gives AI a "working memory" of the user's psychological state | Memori's auto-retrieved context covers this — all 8 categories combined create a similar holistic picture |
| **Event/Fact Log** (append-only, psychologically weighted facts) | Tracks specific disclosures, commitments, patterns | Memori's `events` + `facts` categories |
| **User Profile** (structured JSON: name, age, relationships, etc.) | Permanent personal data | Memori's `attributes` + `people` + `relationships` + `preferences` categories + our own `profiles` table |

### Requirement: Cycle-Based Memory Operations
- Kael runs memory ops every 20 exchanges (CYCLE_LENGTH)
- 3 parallel LLM calls: update Coach's Read, update Event Log, update Profile
- Runs asynchronously (never blocks user)

**Our Implementation:**
- Memori handles extraction automatically per-exchange (even better than cycle-based)
- We add a `coach_reads` table for periodic narrative summaries
- Background task runs every N exchanges to generate a Coach's Read using LLM
- Coach's Read is our custom addition ON TOP of Memori — combines Memori's memories into a narrative

### Requirement: LLM Context Payload (Per Exchange)
Every message to the LLM must include:

| # | Component | Our Source |
|---|---|---|
| 1 | System Prompt (Kael persona, rules, format) | Static prompt template |
| 2 | User Profile (structured personal data) | Our `profiles` table + Memori's `attributes`/`people` |
| 3 | Coach's Latest Read (narrative summary) | Our `coach_reads` table (latest entry) |
| 4 | Event Log (last 100 items) | Memori's `events` + `facts` (retrieved via API) |
| 5 | Recent Exchanges (last 20 messages) | Our `messages` table (last N) |
| 6 | User's Current Message | From the request |
| 7 | Timestamps (current + last message) | System-generated |

**Our Implementation:**
- Build a `context_assembler.py` that composes this payload before each LLM call
- Memori provides memories 2-4 automatically
- We manually fetch recent messages and Coach's Read
- Format everything into the prompt structure Kael specifies

---

## 3. ONBOARDING

### Requirement: Scripted In-Chat Onboarding (7 Steps)
All onboarding happens inside the chat — no separate screens.

| Step | What Happens | Input Type |
|---|---|---|
| 1 | Introduction — Kael introduces itself, asks for name | Free text |
| 2 | Age — "How old are you?" | Tappable: 18-24, 25-30, 31-40, 41+ |
| 3 | Gender — "How do you identify?" | Tappable: Male, Female, Non-binary, Prefer not to say |
| 4 | What brings you here | Tappable options + free text |
| 5 | Follow-up question (branching based on Step 4) | Tappable options |
| 6 | Notification permission | Tappable: Yes / Maybe later |
| 7 | Transition to AI-generated conversation | First AI message based on Steps 4-5 answers |

**Our Implementation:**
- Onboarding messages are **hardcoded** (not AI-generated) for consistency
- Store onboarding state on the user: `onboarding_step` field
- `POST /api/onboarding` endpoint handles each step
- Step 4 branching logic in backend
- Step 6 triggers browser notification permission (web equivalent)
- Step 7 triggers first AI-generated message with full context
- Onboarding exchanges do NOT count toward exchange limits

---

## 4. USER RETURN BEHAVIOR

### Requirement: Staleness & Welcome-Back Messages
- If user returns and last AI message is FRESH (< 48 hours): show it with live options
- If STALE (> 48 hours) or no unanswered message: generate a welcome-back message
- Welcome-back message uses a specific prompt (Prompt 6)
- Never say "Welcome back!" — just pick up naturally

**Our Implementation:**
- `MESSAGE_STALENESS_WINDOW` config (default: 48 hours)
- On app load, frontend checks last AI message timestamp
- If stale: calls `POST /api/welcome-back` which generates a fresh message via Prompt 6
- If fresh: shows existing message with live options
- Welcome-back message saved as a regular message (source = "system")

---

## 5. NOTIFICATION SYSTEM

### Requirement: AI-Initiated Proactive Messages
- Kael sends messages like a real coach texting you
- AI decides WHAT to say, WHEN to send, and WHETHER to send at all
- One notification planned at a time
- Uses Prompt 5 with full context
- Notifications appear as regular chat messages
- Push notification shows the message text

**Our Implementation:**
- Background service: `notification_service.py`
- `scheduled_notifications` table: stores one pending notification per user
- Worker process checks for due notifications
- Prompt 5 generates message + `send_at` timestamp + `options`
- Delivery: Web Push API (browser notifications) instead of OneSignal (mobile)
- AI receives `unresponded_count` to calibrate spacing
- Loop: trigger → generate → schedule → deliver → trigger next

### Notification Triggers:
1. User goes inactive (stops chatting)
2. Previous notification was sent
3. Previous notification was cancelled (user came back)
4. `recheck_at` time reached

---

## 6. AUTH & MONETIZATION

### Requirement: Auth (Google, Apple, Email OTP + Guest Mode)
- Guest users can try the app without signing up
- Guest wall after 5 exchanges
- Guest data merged to authenticated account on signup

**Our Implementation:**
- Auth options: Google OAuth, Email OTP (or email + password for web)
- Guest mode: create temporary user with `auth_provider = "guest"`
- After `GUEST_EXCHANGE_LIMIT` exchanges: show signup overlay
- On signup: merge guest profile + messages to new authenticated user

### Requirement: Paywall
- After 30 exchanges: hard paywall
- 3-day free trial, then subscription
- Managed by Adapty (mobile) — for web, use Stripe

**Our Implementation:**
- `exchange_count` tracked on user
- After `PAYWALL_EXCHANGE_LIMIT`: show paywall
- For web MVP: Stripe integration (or skip for initial build)
- Subscription status: guest | free | trial | active | expired
- Notifications still sent to expired users (re-engagement)

---

## 7. CONFIGURABLE PARAMETERS

All server-side, hot-swappable:

| Parameter | Default | Description |
|---|---|---|
| `GUEST_EXCHANGE_LIMIT` | 5 | Exchanges before guest signup wall |
| `PAYWALL_EXCHANGE_LIMIT` | 30 | Exchanges before paywall |
| `CYCLE_LENGTH` | 20 | Exchanges per Coach's Read generation |
| `CONTEXT_WINDOW_EXCHANGES` | 20 | Recent exchanges sent to LLM |
| `EVENT_LOG_CONTEXT_LIMIT` | 100 | Max event items sent to LLM |
| `MESSAGE_STALENESS_WINDOW` | 48 hours | When options expire and welcome-back triggers |
| `NOTIFICATION_RECHECK_FALLBACK` | 24 hours | Default recheck interval |
| `COACH_READ_MAX_WORDS` | 500 | Max length for Coach's Read |
| `LLM_MODEL` | TBD | Main chat model (via OpenRouter) |
| `MEMORY_OPS_MODEL` | TBD | Cheaper model for Coach's Read generation |
| `NOTIFICATION_MODEL` | TBD | Main model for notification generation |

---

## 8. DATA MODELS

### User
```json
{
  "id": "uuid",
  "auth_provider": "google | email | guest",
  "email": "string | null",
  "created_at": "timestamp",
  "subscription_status": "guest | free | trial | active | expired",
  "exchange_count": 0,
  "notification_enabled": false,
  "last_active_at": "timestamp",
  "deep_link_context": "string | null",
  "onboarding_step": 0,
  "onboarding_completed": false,
  "profile": { /* see Profile */ }
}
```

### Profile (our table + Memori handles the rest)
```json
{
  "name": "string",
  "age": "string",
  "gender": "string",
  "location": "string | null",
  "timezone": "string | null",
  "profession": "string | null",
  "relationship_status": "string | null",
  "key_relationships": [{"name": "string", "relationship": "string"}],
  "interests": ["string"],
  "notification_preferences": {
    "work_hours": "string | null",
    "quiet_hours": "string | null",
    "sleep_schedule": "string | null"
  }
}
```

### Message
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "role": "user | assistant",
  "content": "string",
  "options": ["string"],
  "exchange_number": 0,
  "cycle_id": 0,
  "source": "chat | notification | onboarding | welcome_back",
  "is_onboarding": false,
  "created_at": "timestamp"
}
```

### Coach's Read
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "cycle_id": 0,
  "content": "string (300-500 words)",
  "is_current": true,
  "created_at": "timestamp"
}
```

### Scheduled Notification
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "message_content": "JSON string | null",
  "send_at": "timestamp | null",
  "recheck_at": "timestamp | null",
  "status": "scheduled | sent | cancelled | pending_recheck",
  "classification": "action_followup | conversation_continuation | new_topic | pattern_callback | null",
  "created_at": "timestamp"
}
```

---

## 9. PROMPTS NEEDED

| Prompt | Purpose | When Used |
|---|---|---|
| **Prompt 1** | Main system prompt — Kael persona, coaching philosophy, response format, option rules | Every chat exchange |
| **Prompt 2** | Coach's Read generation | Every 20 exchanges (background) |
| **Prompt 5** | Notification generation (what to say, when to send) | When user goes inactive |
| **Prompt 6** | Welcome-back message generation | When user returns to stale chat |

**Note:** Prompts 3 (Event Log) and 4 (Profile Update) from Kael are handled by Memori automatically — that's our memory advantage.

---

## 10. API ENDPOINTS (Updated)

```
AUTH
────
POST   /api/auth/signup          # Google OAuth or Email OTP
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/guest           # Create guest session

ONBOARDING
──────────
POST   /api/onboarding           # Submit onboarding step, get next message

CHAT
────
POST   /api/chat                 # Send message, get SSE streaming response
DELETE /api/chat/undo             # Undo last exchange

WELCOME BACK
────────────
POST   /api/welcome-back         # Generate welcome-back message if needed

PROFILE
───────
GET    /api/profile              # Get user profile
PATCH  /api/profile              # Update profile fields

USER
────
GET    /api/user                 # Get user data (subscription, exchange count)
DELETE /api/user                 # Delete account and all data

MESSAGES
────────
GET    /api/messages             # Fetch messages (with pagination, after timestamp)

CONFIG (internal)
──────
GET    /api/config               # Get configurable parameters
```

---

## 11. EDGE CASES TO HANDLE

| Scenario | Handling |
|---|---|
| Guest hits exchange limit | Show signup overlay, freeze chat |
| Guest signs up | Merge guest data to new authenticated user |
| User hits paywall | Show paywall screen |
| App crash during AI generation | Server completes generation, user sees it on return |
| Network drops during streaming | "Connection lost. Tap to retry." |
| User sends message during memory ops | Use previous cycle's Coach's Read |
| Memory ops fail | Log error, retry next cycle, use stale data |
| User returns, fresh AI message (< 48h) | Show with live options |
| User returns, stale AI message (> 48h) | Strip options, generate welcome-back |
| User returns, no unanswered message | Generate welcome-back |
| Undo on message that triggered memory ops | Memory ops not reversed (acceptable) |
| Crisis language detected | Show crisis resources, step back from coaching |
| Multiple queued notifications without reply | AI spaces them out based on `unresponded_count` |

---

## 12. UI/UX REQUIREMENTS

### Chat Screen (Main — and only real screen)
- Full-screen chat with messages
- Pill-shaped tappable options below latest AI message
- Text input always at bottom with send button
- Thinking indicator (animated dots) while AI generates
- Streaming response (words appear one by one, options appear after stream completes)
- Date separators between messages from different days
- Tap message to see timestamp
- Settings icon in header → Profile/Settings screen

### Profile/Settings Screen
- Name (editable)
- Email (shown)
- Subscription status
- Appearance: Light/Dark/System
- Notifications: Toggle
- Privacy Policy, Terms of Service links
- Delete Account (hard delete with confirmation)
- Log Out

### Thinking Indicator
- Bottom bar: "Kael is thinking..." with animation
- Three-dot bubble in chat, replaced by streaming text when tokens arrive

---

## 13. WHAT MEMORI GIVES US FOR FREE (vs Kael building custom)

| Kael Builds Manually | Memori Handles Automatically |
|---|---|
| Event/Fact Log extraction (Prompt 3) | Auto-extracts events, facts from every exchange |
| Profile update extraction (Prompt 4) | Auto-extracts attributes, preferences, people |
| Deduplication logic | Built-in deduplication |
| Memory retrieval scoring | Built-in relevance retrieval |
| Relationship tracking | Built-in `relationships` category |
| Skills/coping strategies tracking | Built-in `skills` category |
| Rules/boundaries tracking | Built-in `rules` category |

**What we still build custom:**
- Coach's Read (Prompt 2) — periodic narrative summary
- Context payload assembly — combine Memori's output with Coach's Read + recent messages
- Notification system (Prompt 5)
- Welcome-back system (Prompt 6)

---

## 14. IMPLEMENTATION PHASES (Updated)

### Phase 1: Foundation
- Project structure, configs, docker-compose
- PostgreSQL schema (users, profiles, messages, coach_reads, scheduled_notifications, config)
- FastAPI skeleton with auth (email + guest mode)
- Configurable parameters system

### Phase 2: Onboarding + Basic Chat
- Scripted 7-step onboarding (hardcoded messages + branching)
- Memori integration (auto memory extraction/retrieval)
- OpenRouter LLM service with SSE streaming
- JSON response format (message + options)
- Main system prompt (Prompt 1 — adapted from Kael)
- Tappable options in frontend

### Phase 3: Memory Enhancement
- Coach's Read generation (Prompt 2, every CYCLE_LENGTH exchanges)
- Context payload assembler (Memori memories + Coach's Read + recent messages)
- Coach's Read storage and cycling

### Phase 4: Frontend
- React chat UI with tappable option pills
- Streaming text display
- Thinking indicator
- Message undo
- Profile/Settings screen
- Welcome-back flow

### Phase 5: Notifications
- Notification service (background worker)
- Prompt 5 — notification generation
- Web Push API integration
- Staleness detection + welcome-back (Prompt 6)

### Phase 6: Monetization & Polish
- Guest wall + signup overlay
- Paywall (Stripe for web)
- Exchange counting
- Crisis detection
- Error handling, edge cases
- Responsive mobile design
