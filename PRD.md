# MentailPeace — Product Requirements Document (PRD)

**Version**: 1.0 (MVP)
**Date**: 2026-03-27
**Author**: Tanishq Bhosale

---

## 1. Product Overview

**MentailPeace** is an AI-powered therapy companion that provides personalized mental health support through intelligent conversations. Unlike generic chatbots, MentailPeace remembers your history, tracks your progress, and adapts its approach across sessions — just like a real therapist would.

### 1.1 Vision
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   "An AI therapist that truly knows you —                       │
│    remembers your story, tracks your growth,                    │
│    and meets you where you are."                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Problem Statement

| Problem | Impact |
|---|---|
| Therapy is expensive ($100-200/session) | Many people can't afford regular sessions |
| Long waitlists (weeks to months) | People suffer while waiting |
| Generic AI chatbots forget everything | No continuity, users repeat themselves |
| No progress tracking | Hard to see improvement over time |
| Stigma around mental health | People avoid in-person therapy |

### 1.3 Solution

MentailPeace provides 24/7 AI therapy sessions with **persistent memory** — it remembers who you are, what you've discussed, your coping strategies, relationships, and progress across every session.

---

## 2. Target Users

### 2.1 Primary Personas

```
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│  🧑‍💻 Persona 1         │  │  🧑‍🎓 Persona 2         │  │  🧑 Persona 3          │
│                      │  │                      │  │                      │
│  Working Professional│  │  College Student     │  │  Therapy Supplement  │
│                      │  │                      │  │                      │
│  Age: 25-40          │  │  Age: 18-25          │  │  Age: 25-50          │
│  Stress: Work/Life   │  │  Stress: Academic    │  │  Has a therapist     │
│  Budget: Limited     │  │  Budget: Very limited│  │  Needs support       │
│  Needs: Coping       │  │  Needs: Someone to   │  │  between sessions    │
│  strategies, someone │  │  talk to at 2am      │  │                      │
│  who remembers       │  │                      │  │  Needs: Journaling   │
│                      │  │                      │  │  + reflection tool   │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
```

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React)                           │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Auth     │  │  Chat Window │  │  Session  │  │  Mood         │  │
│  │  Pages    │  │  + SSE       │  │  Sidebar  │  │  Tracker      │  │
│  └──────────┘  └──────┬───────┘  └──────────┘  └───────────────┘  │
│                        │                                            │
└────────────────────────┼────────────────────────────────────────────┘
                         │ HTTP + SSE (streaming)
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         BACKEND (FastAPI)                            │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │  Auth     │  │  Chat        │  │  Session     │                  │
│  │  Router   │  │  Router      │  │  Router      │                  │
│  └────┬─────┘  └──────┬───────┘  └──────┬───────┘                  │
│       │               │                  │                          │
│       ▼               ▼                  ▼                          │
│  ┌──────────────────────────────────────────────┐                   │
│  │              SERVICE LAYER                    │                   │
│  │                                               │                   │
│  │  ┌─────────────┐  ┌────────────────────────┐ │                   │
│  │  │ LLM Service │  │ Memory Service (Memori)│ │                   │
│  │  │ (OpenRouter) │  │                        │ │                   │
│  │  └──────┬──────┘  └───────────┬────────────┘ │                   │
│  │         │                     │               │                   │
│  └─────────┼─────────────────────┼───────────────┘                   │
│            │                     │                                   │
└────────────┼─────────────────────┼───────────────────────────────────┘
             │                     │
             ▼                     ▼
    ┌────────────────┐   ┌──────────────────┐
    │   OpenRouter    │   │   PostgreSQL      │
    │   (Multi-LLM)  │   │                   │
    │                 │   │  ┌─────────────┐  │
    │  Claude, GPT,   │   │  │ App Tables  │  │
    │  Gemini, etc.   │   │  │ (users,     │  │
    │                 │   │  │  sessions,  │  │
    │                 │   │  │  messages)  │  │
    │                 │   │  ├─────────────┤  │
    │                 │   │  │ Memori      │  │
    │                 │   │  │ Tables      │  │
    │                 │   │  │ (memories)  │  │
    │                 │   │  └─────────────┘  │
    └────────────────┘   └──────────────────┘
```

### 3.2 Chat Flow — Step by Step

```
┌──────┐         ┌──────────┐        ┌────────┐       ┌───────────┐      ┌──────┐
│ User │         │ Frontend │        │ Backend│       │  Memori   │      │  LLM │
└──┬───┘         └────┬─────┘        └───┬────┘       └─────┬─────┘      └──┬───┘
   │                  │                  │                   │               │
   │  Types message   │                  │                   │               │
   │─────────────────→│                  │                   │               │
   │                  │                  │                   │               │
   │                  │  POST /chat      │                   │               │
   │                  │─────────────────→│                   │               │
   │                  │                  │                   │               │
   │                  │                  │  Save user msg    │               │
   │                  │                  │──→ DB             │               │
   │                  │                  │                   │               │
   │                  │                  │  Retrieve memories│               │
   │                  │                  │──────────────────→│               │
   │                  │                  │                   │               │
   │                  │                  │  Relevant context │               │
   │                  │                  │←──────────────────│               │
   │                  │                  │                   │               │
   │                  │                  │  System prompt    │               │
   │                  │                  │  + memories       │               │
   │                  │                  │  + user message   │               │
   │                  │                  │──────────────────────────────────→│
   │                  │                  │                   │               │
   │                  │   SSE: "I"       │  Stream tokens    │               │
   │                  │←─────────────────│←─────────────────────────────────│
   │  "I"             │                  │                   │               │
   │←─────────────────│                  │                   │               │
   │                  │   SSE: " hear"   │                   │               │
   │  " hear"         │←─────────────────│                   │               │
   │←─────────────────│                  │                   │               │
   │                  │   SSE: " you"    │                   │               │
   │  " you"          │←─────────────────│                   │               │
   │←─────────────────│                  │                   │               │
   │                  │                  │                   │               │
   │  Words appear    │   SSE: [DONE]    │                   │               │
   │  one by one      │←─────────────────│                   │               │
   │                  │                  │                   │               │
   │                  │                  │  Save assistant   │               │
   │                  │                  │  msg → DB         │               │
   │                  │                  │                   │               │
   │                  │                  │  Extract memories │               │
   │                  │                  │  (BACKGROUND)     │               │
   │                  │                  │──────────────────→│               │
   │                  │                  │                   │               │
   │                  │                  │   Auto-stores:    │               │
   │                  │                  │   facts, people,  │               │
   │                  │                  │   relationships,  │               │
   │                  │                  │   preferences...  │               │
```

### 3.3 Memory System — How Memori Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MEMORI MEMORY LAYER                               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 AUTO-EXTRACTION                              │   │
│  │                                                              │   │
│  │  User says: "My sister Maya and I had a fight about         │   │
│  │              our dad's retirement party"                     │   │
│  │                                                              │   │
│  │  Memori extracts:                                            │   │
│  │                                                              │   │
│  │  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐ │   │
│  │  │  PEOPLE     │ │ RELATIONSHIPS│ │ EVENTS               │ │   │
│  │  │             │ │              │ │                       │ │   │
│  │  │  Sister:    │ │ Conflict with│ │ Fight about dad's    │ │   │
│  │  │  Maya       │ │ sister Maya  │ │ retirement party     │ │   │
│  │  └─────────────┘ └──────────────┘ └──────────────────────┘ │   │
│  │                                                              │   │
│  │  ┌─────────────┐                                            │   │
│  │  │  PEOPLE     │                                            │   │
│  │  │             │                                            │   │
│  │  │  Father:    │                                            │   │
│  │  │  retiring   │                                            │   │
│  │  └─────────────┘                                            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                 AUTO-RETRIEVAL (Next Session)                │   │
│  │                                                              │   │
│  │  User says: "I'm stressed about a family event"             │   │
│  │                                                              │   │
│  │  Memori recalls:                                             │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │  "User has a sister named Maya"                       │   │   │
│  │  │  "Had conflict with sister about father's retirement" │   │   │
│  │  │  "Father is retiring"                                 │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  AI can now say: "Is this related to your dad's retirement  │   │
│  │  party? Last time you mentioned the conflict with Maya..."  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.4 All 8 Memory Categories in Action

```
┌─────────────────────────────────────────────────────────────────────┐
│                   MEMORY CATEGORIES                                  │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │  ATTRIBUTES      │  │  FACTS           │  │  PEOPLE          │    │
│  │                  │  │                  │  │                  │    │
│  │  Age: 28         │  │  Takes SSRIs     │  │  Maya (sister)   │    │
│  │  Introvert       │  │  Has insomnia    │  │  Raj (partner)   │    │
│  │  Software dev    │  │  Vegan           │  │  Dr. Patel       │    │
│  │  Lives in Mumbai │  │  Exercises daily │  │  (real therapist)│    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │  EVENTS          │  │  PREFERENCES     │  │  RELATIONSHIPS   │    │
│  │                  │  │                  │  │                  │    │
│  │  Fight with Maya │  │  Prefers CBT     │  │  Close with mom  │    │
│  │  on 2026-03-20   │  │  over DBT        │  │  Strained with   │    │
│  │  Job promotion   │  │  Likes metaphors │  │  father          │    │
│  │  on 2026-02-15   │  │  Morning sessions│  │  Dating Raj for  │    │
│  │  Panic attack at │  │  preferred       │  │  2 years         │    │
│  │  work 2026-01-10 │  │                  │  │                  │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐                          │
│  │  RULES           │  │  SKILLS          │                          │
│  │                  │  │                  │                          │
│  │  Goal: Reduce    │  │  Box breathing   │                          │
│  │  panic attacks   │  │  (learned)       │                          │
│  │  Boundary: No    │  │  Journaling      │                          │
│  │  work talk after │  │  (practicing)    │                          │
│  │  8pm             │  │  CBT reframing   │                          │
│  │  Commitment:     │  │  (in progress)   │                          │
│  │  Exercise 3x/wk  │  │  Grounding 5-4-  │                          │
│  │                  │  │  3-2-1 technique │                          │
│  └─────────────────┘  └─────────────────┘                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Tech Stack

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React + Vite + TypeScript + Tailwind | Fast dev, type safety, modern styling |
| **Backend** | Python + FastAPI | Async, fast, great for AI apps |
| **Database** | PostgreSQL (self-hosted) | Reliable, Memori BYODB compatible |
| **Memory** | Memori (Apache 2.0) | 8 memory categories, auto extract/retrieve, SQL-native |
| **AI** | OpenRouter | Multi-LLM access (Claude, GPT, Gemini, etc.) |
| **Streaming** | SSE (Server-Sent Events) | Simplest streaming, like ChatGPT |
| **Auth** | JWT (access + refresh tokens) | Stateless, scalable |

---

## 5. Feature Requirements

### 5.1 MVP Features (v1.0)

#### F1: User Authentication
```
┌─────────────────────────────────────┐
│         Sign Up / Login              │
│                                      │
│  ┌──────────────────────────────┐   │
│  │  Email    [                ] │   │
│  │  Password [                ] │   │
│  │                              │   │
│  │  [ Sign Up ]  [ Login ]      │   │
│  └──────────────────────────────┘   │
│                                      │
│  - Email + password signup/login     │
│  - JWT tokens (access + refresh)     │
│  - Password hashing (bcrypt)         │
│  - Protected routes                  │
└─────────────────────────────────────┘
```

#### F2: Therapy Chat Interface
```
┌─────────────────────────────────────────────────────────────┐
│  MentailPeace                                    [Profile]  │
│─────────────────────────────────────────────────────────────│
│         │                                                    │
│ Sessions│       Therapy Session — March 27                   │
│         │                                                    │
│ > Today │  ┌──────────────────────────────────────────────┐ │
│   Mar 25│  │  You: I've been feeling overwhelmed at work  │ │
│   Mar 20│  │       lately. My manager keeps piling on     │ │
│   Mar 15│  │       more tasks.                            │ │
│         │  └──────────────────────────────────────────────┘ │
│         │                                                    │
│         │  ┌──────────────────────────────────────────────┐ │
│         │  │  Therapist: I hear you. Last time you        │ │
│         │  │  mentioned feeling stressed about the        │ │
│         │  │  project deadline too. It sounds like work   │ │
│         │  │  pressure is a recurring theme. Let's        │ │
│         │  │  explore what's different this time — is it  │ │
│         │  │  the volume of work, or something about how  │ │
│         │  │  your manager communicates?                  │ │
│         │  └──────────────────────────────────────────────┘ │
│         │                                                    │
│         │            ▲ AI remembers previous sessions ▲      │
│         │                                                    │
│ [+ New  │  ┌──────────────────────────────────────┐  ┌───┐ │
│ Session]│  │ Type your message...                  │  │ → │ │
│         │  └──────────────────────────────────────┘  └───┘ │
└─────────────────────────────────────────────────────────────┘
```

**Requirements:**
- Streaming responses (SSE) — words appear one by one
- Message bubbles (user on right, therapist on left)
- Auto-scroll to latest message
- Typing indicator while AI responds
- Markdown support in messages

#### F3: Session Management
```
┌───────────────────────────────────────┐
│  Sessions                             │
│                                       │
│  [+ New Session]                      │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │  Today — "Work Stress"          │ │
│  │  Active                         │ │
│  └─────────────────────────────────┘ │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │  Mar 25 — "Family Dynamics"     │ │
│  │  Completed                      │ │
│  └─────────────────────────────────┘ │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │  Mar 20 — "Sleep Issues"        │ │
│  │  Completed                      │ │
│  └─────────────────────────────────┘ │
└───────────────────────────────────────┘
```

**Requirements:**
- Create new session
- List past sessions with auto-generated titles
- View past session messages (read-only)
- End session (marks as completed)

#### F4: Intelligent Memory (via Memori)
```
Session 1:                          Session 5 (weeks later):
─────────                           ────────────────────────

User: "I'm Tanishq,                User: "I had another
 I work at a startup                 panic attack"
 as a developer"
                                    AI: "I'm sorry to hear
     │                               that, Tanishq. The last
     │  Memori extracts:             time this happened was
     │  - Name: Tanishq              at your startup office.
     │  - Job: Developer             Have you tried the box
     │  - Company: Startup           breathing technique we
     │                               discussed? Do you want
     ▼                               to walk through it
                                     together?"
  ┌──────────────────┐
  │  STORED FOREVER   │                    ▲
  │  across all       │                    │
  │  sessions         │────────────────────┘
  └──────────────────┘     Retrieved automatically
```

**Requirements:**
- Auto-extract memories from every conversation (no manual tagging)
- Auto-retrieve relevant memories for each new message
- Memory persists across all sessions permanently
- 8 categories tracked: attributes, events, facts, people, preferences, relationships, rules, skills

#### F5: Mood Tracking
```
┌─────────────────────────────────────┐
│  How are you feeling right now?      │
│                                      │
│  😫    😟    😐    🙂    😊         │
│  Very   Bad   Okay  Good  Great      │
│  Bad                                 │
│                                      │
│  [Start Session]                     │
└─────────────────────────────────────┘

         ... after session ...

┌─────────────────────────────────────┐
│  How are you feeling now?            │
│                                      │
│  😫    😟    😐    🙂    😊         │
│  Very   Bad   Okay  Good  Great      │
│  Bad                                 │
│                                      │
│  [End Session]                       │
└─────────────────────────────────────┘
```

**Requirements:**
- Mood check at session start and end
- Simple 5-point scale
- Stored with session data

---

## 6. Database Schema

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│     users         │     │    sessions       │     │    messages       │
│──────────────────│     │──────────────────│     │──────────────────│
│ id (UUID, PK)    │──┐  │ id (UUID, PK)    │──┐  │ id (UUID, PK)    │
│ email (UNIQUE)   │  │  │ user_id (FK)     │  │  │ session_id (FK)  │
│ password_hash    │  └─→│ title            │  └─→│ role             │
│ display_name     │     │ mood_start       │     │ content          │
│ created_at       │     │ mood_end         │     │ created_at       │
└──────────────────┘     │ status           │     └──────────────────┘
                         │ started_at       │
                         │ ended_at         │
                         └──────────────────┘

                    ┌──────────────────────────┐
                    │  Memori Internal Tables   │
                    │  (managed by Memori)      │
                    │──────────────────────────│
                    │  Stores all 8 memory     │
                    │  categories automatically │
                    │  We don't touch these     │
                    └──────────────────────────┘
```

---

## 7. API Specification

```
AUTH
────
POST   /api/auth/signup          Body: { email, password, display_name }
                                 Returns: { user, access_token, refresh_token }

POST   /api/auth/login           Body: { email, password }
                                 Returns: { user, access_token, refresh_token }

POST   /api/auth/refresh         Body: { refresh_token }
                                 Returns: { access_token }

SESSIONS
────────
GET    /api/sessions             Returns: [ { id, title, status, started_at } ]
POST   /api/sessions             Body: { mood_start? }
                                 Returns: { id, title, status }

GET    /api/sessions/{id}        Returns: { session, messages[] }
PATCH  /api/sessions/{id}        Body: { mood_end?, status: "completed" }
                                 Returns: { session }

CHAT
────
POST   /api/chat/{session_id}    Body: { content }
                                 Returns: SSE stream of tokens

                                 Event format:
                                 data: {"token": "I"}
                                 data: {"token": " hear"}
                                 data: {"token": " you"}
                                 data: {"done": true}
```

---

## 8. User Flows

### 8.1 First-Time User

```
┌─────────┐    ┌──────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│  Land   │    │  Sign    │    │  Welcome  │    │  Select   │    │  Start    │
│  on     │───→│  Up      │───→│  Screen   │───→│  Mood     │───→│  First    │
│  App    │    │  Page    │    │  "Hi! I'm │    │  😫→😊    │    │  Chat     │
│         │    │          │    │  here to  │    │           │    │  Session  │
│         │    │          │    │  help"    │    │           │    │           │
└─────────┘    └──────────┘    └───────────┘    └───────────┘    └───────────┘
```

### 8.2 Returning User

```
┌─────────┐    ┌──────────┐    ┌───────────────┐    ┌───────────┐
│  Open   │    │  Login   │    │  See Past     │    │  Start    │
│  App    │───→│          │───→│  Sessions     │───→│  New      │
│         │    │          │    │  in Sidebar   │    │  Session  │
│         │    │          │    │               │    │           │
│         │    │          │    │  OR resume    │    │  AI knows │
│         │    │          │    │  active one   │    │  you!     │
└─────────┘    └──────────┘    └───────────────┘    └───────────┘
```

### 8.3 During a Session

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ User types  │     │ AI streams  │     │ Memori      │
│ message     │────→│ response    │────→│ extracts    │
│             │     │ word by     │     │ memories    │
│             │     │ word (SSE)  │     │ (background)│
└─────────────┘     └─────────────┘     └─────────────┘
       │                                       │
       │            ┌─────────────┐            │
       └───────────→│ Repeat      │←───────────┘
                    │ until user  │
                    │ ends session│
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ End session │
                    │ Mood check  │
                    │ Session     │
                    │ saved       │
                    └─────────────┘
```

---

## 9. UI Wireframes

### 9.1 Login Page

```
┌─────────────────────────────────────────────────┐
│                                                  │
│                                                  │
│              ╔══════════════════╗                │
│              ║   MentailPeace   ║                │
│              ║                  ║                │
│              ║  Your AI Therapy ║                │
│              ║    Companion     ║                │
│              ╚══════════════════╝                │
│                                                  │
│           ┌──────────────────────┐              │
│           │ Email                │              │
│           └──────────────────────┘              │
│           ┌──────────────────────┐              │
│           │ Password             │              │
│           └──────────────────────┘              │
│                                                  │
│           ┌──────────────────────┐              │
│           │       Login          │              │
│           └──────────────────────┘              │
│                                                  │
│           Don't have an account? Sign up         │
│                                                  │
└─────────────────────────────────────────────────┘
```

### 9.2 Main Chat Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  MentailPeace                                        [Profile] │
├────────────┬────────────────────────────────────────────────────┤
│            │                                                    │
│  Sessions  │     Thursday, March 27                             │
│            │                                                    │
│ [+ New]    │     ┌────────────────────────────────────┐        │
│            │     │ I've been feeling really anxious    │   You  │
│ ┌────────┐ │     │ about my presentation tomorrow.    │        │
│ │ Today  │ │     └────────────────────────────────────┘        │
│ │ Active │ │                                                    │
│ └────────┘ │  ┌──────────────────────────────────────────┐     │
│            │  │ I remember you mentioned a similar        │     │
│ ┌────────┐ │  │ situation at work last month. You said   │     │
│ │ Mar 25 │ │  │ the box breathing technique helped you   │ AI  │
│ │        │ │  │ calm down before that meeting. Would     │     │
│ └────────┘ │  │ you like to try that again, or shall we  │     │
│            │  │ explore what's making this one feel      │     │
│ ┌────────┐ │  │ different?                               │     │
│ │ Mar 20 │ │  └──────────────────────────────────────────┘     │
│ │        │ │                                                    │
│ └────────┘ │                                                    │
│            │                                                    │
│            │                                                    │
│            │                                                    │
│            ├────────────────────────────────────────────────────┤
│            │  ┌──────────────────────────────────┐   ┌──────┐ │
│            │  │ Type your message...              │   │ Send │ │
│            │  └──────────────────────────────────┘   └──────┘ │
└────────────┴────────────────────────────────────────────────────┘
```

### 9.3 Mobile Layout

```
┌───────────────────────┐
│ MentailPeace    [☰]   │
├───────────────────────┤
│                       │
│  Thu, March 27        │
│                       │
│  ┌─────────────────┐  │
│  │ I've been       │  │
│  │ feeling really  │  │
│  │ anxious about   │  │
│  │ my presentation │  │
│  └─────────────────┘  │
│                       │
│ ┌───────────────────┐ │
│ │ I remember you    │ │
│ │ mentioned a       │ │
│ │ similar situation │ │
│ │ at work last      │ │
│ │ month...          │ │
│ └───────────────────┘ │
│                       │
│                       │
│                       │
├───────────────────────┤
│ ┌─────────────┐ ┌──┐ │
│ │ Message...  │ │→ │ │
│ └─────────────┘ └──┘ │
└───────────────────────┘
```

---

## 10. Non-Functional Requirements

| Requirement | Target |
|---|---|
| **Response start time** | < 1 second (first token via SSE) |
| **Memory retrieval** | < 500ms |
| **Concurrent users** | 50+ (MVP) |
| **Data privacy** | All data self-hosted, user owns everything |
| **Uptime** | 99% (self-hosted) |
| **Mobile responsive** | Full mobile support |
| **Browser support** | Chrome, Firefox, Safari (latest) |

---

## 11. Safety & Ethics

### 11.1 Disclaimers
- MentailPeace is NOT a replacement for professional therapy
- Clear disclaimer shown on signup and in app footer
- Emergency resources displayed when crisis language detected

### 11.2 Crisis Detection
```
User message contains crisis keywords?
         │
         ├── YES → Show emergency resources immediately
         │         (suicide hotline, crisis text line)
         │         AI acknowledges and provides resources
         │
         └── NO  → Continue normal conversation
```

### 11.3 Data Privacy
- All data stored on user's own PostgreSQL (self-hosted)
- No data sent to third parties (except LLM calls to OpenRouter)
- Users can delete their account and all associated data
- Passwords hashed with bcrypt

---

## 12. Implementation Phases

```
Phase 1: Foundation              Phase 2: Chat + Memory
(Backend skeleton)               (Core experience)
┌─────────────────┐             ┌─────────────────┐
│ - Project setup  │             │ - Memori setup   │
│ - PostgreSQL     │────────────→│ - OpenRouter LLM │
│ - Auth (JWT)     │             │ - SSE streaming  │
│ - Session CRUD   │             │ - Chat endpoint  │
│ - DB migrations  │             │ - System prompt  │
└─────────────────┘             └────────┬────────┘
                                         │
Phase 4: Polish                 Phase 3: Frontend
(Production ready)               (User interface)
┌─────────────────┐             ┌─────────────────┐
│ - Mood tracking  │             │ - React + Vite   │
│ - Error handling │←────────────│ - Chat UI        │
│ - Loading states │             │ - Session list   │
│ - Responsive     │             │ - Auth pages     │
│ - Rate limiting  │             │ - SSE hook       │
└─────────────────┘             └─────────────────┘
```

---

## 13. Success Metrics (Post-Launch)

| Metric | How to Measure |
|---|---|
| **Session completion rate** | % of sessions that reach natural end vs abandoned |
| **Return rate** | % of users who come back for 2+ sessions |
| **Avg session length** | Number of messages per session |
| **Memory accuracy** | Does the AI correctly recall past information? |
| **Mood improvement** | Average mood_end - mood_start across sessions |

---

## 14. Future Roadmap (Post-MVP)

| Version | Features |
|---|---|
| **v1.1** | Guided exercises (breathing, grounding, journaling prompts) |
| **v1.2** | Progress dashboard (mood trends, session frequency charts) |
| **v1.3** | Multiple therapy modes (CBT, DBT, mindfulness, psychodynamic) |
| **v2.0** | Voice input/output (speech-to-text, text-to-speech) |
| **v2.1** | Therapist handoff (export session notes for real therapist) |
| **v2.2** | Group support (shared sessions with facilitator AI) |
