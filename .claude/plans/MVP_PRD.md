# MentailPeace MVP PRD

**Version**: 2.0 (MVP - Focused Scope)
**Date**: 2026-03-27
**Author**: Tanishq Bhosale
**Status**: Ready for Development

**MVP Scope**: Chat + Memory + Prompts + Onboarding + Auth ONLY
**Deferred**: Notifications, Monetization/Paywalls, Analytics, Mobile App

---

## 1. Product Overview

### What MentailPeace Is

MentailPeace is an AI therapy companion delivered as a single, continuous chat experience. It helps users explore their patterns, beliefs, and blind spots through ongoing conversation with an AI that remembers everything about them.

### Core Value Proposition

- **Persistent Memory**: Remembers everything across all conversations via Memori
- **Pattern Recognition**: Connects dots across weeks of conversation
- **Continuous Experience**: One infinite chat, like texting a therapist
- **Tappable Options**: User recognizes what resonates instead of generating thoughts
- **Action-Oriented**: Every conversation ends with a concrete micro-action

### What MentailPeace Is NOT

- Not a replacement for professional therapy
- Not a journal or content platform
- Not a generic chatbot that forgets everything

---

## 2. Tech Stack

```
+--------------------+------------------+--------------------------------------------+
| Layer              | Technology       | Why                                        |
+--------------------+------------------+--------------------------------------------+
| Frontend           | React + Vite +   | Fast dev, type safety, modern styling      |
|                    | TypeScript +     |                                            |
|                    | Tailwind         |                                            |
+--------------------+------------------+--------------------------------------------+
| Backend            | FastAPI (Python) | Async, fast, great for AI/streaming apps   |
+--------------------+------------------+--------------------------------------------+
| Database           | PostgreSQL       | Reliable, Memori BYODB compatible          |
+--------------------+------------------+--------------------------------------------+
| Memory             | Memori           | 8 memory categories, auto extract/retrieve |
|                    | (Apache 2.0)     | SQL-native, replaces 2 custom prompts      |
+--------------------+------------------+--------------------------------------------+
| AI                 | OpenRouter       | Multi-LLM access (Claude, GPT, Gemini)    |
+--------------------+------------------+--------------------------------------------+
| Streaming          | SSE              | Simplest streaming, like ChatGPT           |
+--------------------+------------------+--------------------------------------------+
| Auth               | JWT + OAuth      | Google, Email OTP, Guest mode              |
+--------------------+------------------+--------------------------------------------+
```

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
+---------------------------------------------------------------------+
|                          FRONTEND (React)                            |
|                                                                      |
|  +----------+  +--------------+  +-----------+  +----------------+  |
|  |  Auth     |  |  Chat Window |  | Onboarding|  | Tappable       |  |
|  |  Screen   |  |  + SSE       |  | Flow      |  | Options UI     |  |
|  +----------+  +------+-------+  +-----------+  +----------------+  |
|                        |                                             |
+------------------------+---------------------------------------------+
                         | HTTP + SSE (streaming)
                         v
+---------------------------------------------------------------------+
|                         BACKEND (FastAPI)                             |
|                                                                      |
|  +----------+  +--------------+  +-----------+  +----------------+  |
|  |  Auth     |  |  Chat        |  |  Memory   |  |  Onboarding    |  |
|  |  Router   |  |  Router      |  |  Ops      |  |  Router        |  |
|  +----+-----+  +------+-------+  +-----+-----+  +-------+--------+  |
|       |               |                |                  |          |
|       v               v                v                  v          |
|  +----------------------------------------------------------+       |
|  |                    SERVICE LAYER                           |       |
|  |                                                            |       |
|  |  +--------------+  +------------------------+             |       |
|  |  | LLM Service  |  | Memory Service (Memori)|             |       |
|  |  | (OpenRouter)  |  |                        |             |       |
|  |  +------+-------+  +-----------+------------+             |       |
|  |         |                      |                           |       |
|  +---------+----------------------+---------------------------+       |
|            |                      |                                   |
+------------+----------------------+-----------------------------------+
             |                      |
             v                      v
    +----------------+   +------------------+
    |   OpenRouter    |   |   PostgreSQL      |
    |   (Multi-LLM)   |   |                   |
    |                  |   |  +-----------+   |
    |  Claude, GPT,    |   |  | App Tables|   |
    |  Gemini, etc.    |   |  | (users,   |   |
    |                  |   |  |  messages) |   |
    |                  |   |  +-----------+   |
    |                  |   |  | Memori    |   |
    |                  |   |  | Tables    |   |
    |                  |   |  +-----------+   |
    +----------------+   +------------------+
```

### 3.2 Chat Flow (Per Exchange)

```
+------+         +----------+        +--------+       +-----------+      +------+
| User |         | Frontend |        | Backend|       |  Memori   |      |  LLM |
+--+---+         +----+-----+        +---+----+       +-----+-----+      +--+---+
   |                  |                  |                   |               |
   |  Types message   |                  |                   |               |
   |  OR taps option  |                  |                   |               |
   |----------------->|                  |                   |               |
   |                  |                  |                   |               |
   |                  |  POST /chat      |                   |               |
   |                  |----------------->|                   |               |
   |                  |                  |                   |               |
   |                  |                  |  Save user msg    |               |
   |                  |                  |--> DB             |               |
   |                  |                  |                   |               |
   |                  |                  |  Retrieve memories|               |
   |                  |                  |------------------>|               |
   |                  |                  |                   |               |
   |                  |                  |  Relevant context |               |
   |                  |                  |<------------------|               |
   |                  |                  |                   |               |
   |                  |                  |  Build payload:   |               |
   |                  |                  |  system prompt    |               |
   |                  |                  |  + coach's read   |               |
   |                  |                  |  + event log      |               |
   |                  |                  |  + profile        |               |
   |                  |                  |  + memories       |               |
   |                  |                  |  + last 20 msgs   |               |
   |                  |                  |  + user message   |               |
   |                  |                  |---------------------------------->|
   |                  |                  |                   |               |
   |                  |   SSE stream     |  Stream tokens    |               |
   |                  |<-----------------|<----------------------------------|
   |  Words appear    |                  |                   |               |
   |  one by one      |                  |                   |               |
   |<-----------------|                  |                   |               |
   |                  |                  |                   |               |
   |                  |   SSE: [DONE]    |                   |               |
   |                  |<-----------------|                   |               |
   |                  |                  |                   |               |
   |  Options appear  |                  |  Save AI msg      |               |
   |  as pill buttons |                  |--> DB             |               |
   |<-----------------|                  |                   |               |
   |                  |                  |  Extract memories |               |
   |                  |                  |  (BACKGROUND)     |               |
   |                  |                  |------------------>|               |
   |                  |                  |                   |               |
   |                  |                  |   Memori stores:  |               |
   |                  |                  |   facts, people,  |               |
   |                  |                  |   events, etc.    |               |
```

---

## 4. Feature Specifications

---

### F1: Authentication

#### 4.1.1 Auth Screen (Only Non-Chat Screen)

```
+-------------------------------------------+
|                                            |
|                                            |
|         +------------------+               |
|         |   MentailPeace   |               |
|         |                  |               |
|         |  "A companion    |               |
|         |   that helps you |               |
|         |   see yourself   |               |
|         |   clearly"       |               |
|         +------------------+               |
|                                            |
|         [  Sign in with Google  ]          |
|                                            |
|         [  Continue with Email  ]          |
|                                            |
|         +-- Skip for now ------+           |
|                                            |
+-------------------------------------------+
```

#### 4.1.2 Auth Methods

| Method | Flow |
|---|---|
| **Google OAuth** | Google sign-in -> profile created with email + name |
| **Email OTP** | Enter email -> receive 6-digit code -> verify -> profile created |
| **Guest (Skip)** | Temporary guest profile created locally, no auth required |

#### 4.1.3 Guest Mode Rules

- Guest can use the app fully (same chat, same memory, same AI)
- After `GUEST_EXCHANGE_LIMIT` (default: 5) AI exchanges, a **hard signup wall** appears
- Wall is an app-level overlay, NOT a chat message
- On signup: guest profile merged into authenticated user, all messages transferred
- Conversation continues seamlessly, no repeated messages

#### 4.1.4 Guest-to-Authenticated Transition

```
Guest chatting
      |
      v
Hits 5 exchanges
      |
      v
+-----------------------------------+
|  Signup Overlay (Hard Wall)       |
|                                    |
|  "You're just getting started.    |
|   Sign up to keep going.          |
|   Everything you've shared        |
|   will be saved."                 |
|                                    |
|  [Google] [Email]                 |
+-----------------------------------+
      |
      v (on signup)
+-----------------------------------+
| Guest data merged:                |
| - Profile -> authenticated user   |
| - Messages -> re-assigned user_id |
| - Conversation continues          |
| - No "welcome back" message       |
+-----------------------------------+
```

#### 4.1.5 Auth API Endpoints

```
POST   /api/auth/google       Body: { google_token }
                               Returns: { user, access_token, refresh_token }

POST   /api/auth/email/send    Body: { email }
                               Returns: { message: "OTP sent" }

POST   /api/auth/email/verify  Body: { email, otp_code }
                               Returns: { user, access_token, refresh_token }

POST   /api/auth/guest         Body: {}
                               Returns: { user (guest), access_token }

POST   /api/auth/guest/merge   Body: { guest_token }
                               Returns: { user (merged), access_token, refresh_token }

POST   /api/auth/refresh       Body: { refresh_token }
                               Returns: { access_token }
```

---

### F2: Chat-Based Onboarding

Onboarding happens INSIDE the chat. No separate screens. Hardcoded messages (not AI-generated) for consistency and speed.

#### 4.2.1 Onboarding Sequence

```
+------------------------------------------------------------------+
|                    ONBOARDING FLOW (In Chat)                      |
|                                                                    |
|  Step 1: Introduction                                             |
|  +--------------------------------------------------------------+ |
|  | "Hey. I'm your companion at MentailPeace.                    | |
|  |                                                                | |
|  |  I help you see the stuff about yourself that's hard to       | |
|  |  see on your own. The beliefs running in the background.      | |
|  |  The patterns you keep repeating.                             | |
|  |                                                                | |
|  |  Everything you share stays between us.                       | |
|  |  What should I call you?"                                     | |
|  +--------------------------------------------------------------+ |
|  --> Free text input for name                                     |
|                                                                    |
|  Step 2: Age                                                      |
|  +--------------------------------------------------------------+ |
|  | "Got it, {name}. How old are you?                             | |
|  |  Helps me calibrate how I talk to you."                       | |
|  +--------------------------------------------------------------+ |
|  --> Tappable: [18-24] [25-30] [31-40] [41+]                     |
|                                                                    |
|  Step 3: Gender                                                   |
|  +--------------------------------------------------------------+ |
|  | "And how do you identify?"                                    | |
|  +--------------------------------------------------------------+ |
|  --> Tappable: [Male] [Female] [Non-binary] [Prefer not to say]  |
|                                                                    |
|  Step 4: What Brings You Here                                     |
|  +--------------------------------------------------------------+ |
|  | "So what's on your mind? What brought you here today?"        | |
|  +--------------------------------------------------------------+ |
|  --> Tappable:                                                    |
|      [I keep overthinking everything]                             |
|      [Stuck in a pattern I can't break]                           |
|      [Going through something, need clarity]                      |
|      [Just curious, honestly]                                     |
|      [Something else...]                                          |
|                                                                    |
|  Step 5: Follow-Up (Branching Logic)                              |
|  +--------------------------------------------------------------+ |
|  | Based on Step 4 answer, one scripted follow-up question       | |
|  | with its own tappable options.                                | |
|  | (See branching map below)                                     | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  Step 6: Transition to AI                                         |
|  +--------------------------------------------------------------+ |
|  | Scripted onboarding ends.                                     | |
|  | First AI-generated message begins.                            | |
|  | AI receives all onboarding answers as context.                | |
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

#### 4.2.2 Step 5 Branching Map

```
Step 4 Answer                    Step 5 Follow-Up Question                   Options
------------------------------   ------------------------------------------  -----------------------------------
"I keep overthinking everything" "When does it hit the hardest?"             [Big life stuff]
                                                                              [Everyday things, even small ones]
                                                                              [After I've already decided]
                                                                              [Hard to pin down...]

"Stuck in a pattern I can't      "What kind of pattern?"                     [Relationships, same story every time]
 break"                                                                       [Work or career decisions]
                                                                              [How I treat myself]
                                                                              [A mix of everything...]

"Going through something,        "Is this something that just happened,      [Just happened, still fresh]
 need clarity"                    or something that's been building?"         [Been brewing for months]
                                                                              [Honestly, maybe years]
                                                                              [Not sure...]

"Just curious, honestly"         "Curious about what? What made you          [Saw something that called me out]
                                  try this today?"                            [Someone recommended it]
                                                                              [Just in a figuring-things-out phase]
                                                                              [No real reason...]

Free text input                  "Got it. Is this something you've been      [Been on my mind for a while]
                                  thinking about for a while, or more         [Pretty recent]
                                  recent?"                                    [Keeps coming back]
                                                                              [Hard to say...]
```

#### 4.2.3 Onboarding Rules

- Onboarding exchanges do NOT count toward guest exchange limit
- All onboarding data is stored in user profile immediately
- Step 6 (first AI message) receives: name, age, gender, Step 4 answer, Step 5 answer
- Identical flow for guest and authenticated users

---

### F3: Chat System

#### 4.3.1 Single Continuous Chat

The entire experience is ONE infinite chat per user. Like a WhatsApp conversation. No "new chat" button. No sessions list. Topics flow naturally.

```
+-----------------------------------------------------------+
| MentailPeace                                    [Profile]  |
|-----------------------------------------------------------|
|                                                            |
|   Thu, March 27                                            |
|                                                            |
|   +--------------------------------------------------+    |
|   | I've been feeling really overwhelmed at work      | You|
|   | lately. My manager keeps piling on tasks.         |    |
|   +--------------------------------------------------+    |
|                                                            |
|   +--------------------------------------------------+    |
|   |AI| I remember you mentioned a similar situation    |    |
|   |  | last month. You said setting a boundary with    |    |
|   |  | your manager felt impossible. Has anything      |    |
|   |  | shifted since then, or is it the same wall?     |    |
|   +--------------------------------------------------+    |
|                                                            |
|   +----------------------------------------------+         |
|   | [Same wall, nothing changed]                 |         |
|   | [Actually tried something different]          |         |
|   | [It got worse]                               |         |
|   | [Hard to explain...]                         |         |
|   +----------------------------------------------+         |
|                                                            |
|   +--------------------------------------------------+    |
|   | Type your message...                       [Send] |    |
|   +--------------------------------------------------+    |
+-----------------------------------------------------------+
```

#### 4.3.2 Mobile Layout

```
+-------------------------+
| MentailPeace      [=]   |
|-------------------------|
|                          |
|  Thu, March 27           |
|                          |
|  +-------------------+   |
|  | I've been feeling |   |
|  | overwhelmed at    | U |
|  | work lately...    |   |
|  +-------------------+   |
|                          |
| +---------------------+  |
| | I remember you      |  |
| | mentioned this      | AI
| | last month...       |  |
| +---------------------+  |
|                          |
| [Same wall]              |
| [Tried something new]    |
| [It got worse]           |
| [Hard to explain...]     |
|                          |
|-------------------------|
| +---------------+ +--+  |
| | Message...    | |->|  |
| +---------------+ +--+  |
+-------------------------+
```

#### 4.3.3 AI Response Format

Every AI response is JSON:

```json
{
  "message": "Your message. Markdown allowed (**bold**, *italic*, - bullets).",
  "options": ["Option A", "Option B", "Option C", "Something else..."]
}
```

#### 4.3.4 Tappable Options Rules

| Rule | Detail |
|---|---|
| **Count** | 0-5 options per message. Typically 2-4. |
| **Length** | 5-10 words each. Conversational tone. |
| **Diversity** | Must represent genuinely different stances/beliefs |
| **Uncomfortable Truth** | At least one option should be hard to admit |
| **Common Deflection** | At least one should be the safe/avoidant answer |
| **Escape Hatch** | Last option is always a free-text invitation (varies) |
| **Display** | Only on most recent AI message. Older messages = plain text |
| **On Tap** | Option text becomes user's message bubble |
| **On Type** | If user types instead, options disappear |

#### 4.3.5 Message Display Rules

- AI messages: Markdown rendering (bold, italic, bullets)
- User messages: Plain text
- Only the MOST RECENT AI message has tappable options
- All older messages display as plain text (no greyed-out options)
- Text input always visible at bottom
- Auto-scroll to latest message
- Typing indicator while AI responds

#### 4.3.6 Undo Last Message

```
User sends message
      |
      v
Kael responds
      |
      v
User sees [undo] on their last message
      |
      +-- User taps undo:
      |     - User's message DELETED
      |     - Kael's response DELETED
      |     - Previous Kael message restored with live options
      |     - Exchange count decremented by 1
      |
      +-- User sends new message:
            - Undo button disappears
            - Normal flow continues
```

**Undo Constraints:**
- Only most recent exchange can be undone
- Not available during AI generation
- Deleted messages are HARD deleted (not soft-deleted)
- If undone exchange triggered memory ops, ops are NOT reversed

#### 4.3.7 User Return Behavior

```
User opens app
      |
      +-- Has unanswered AI message < 48h old?
      |     YES -> Show chat. Message has live options.
      |
      +-- Has unanswered AI message > 48h old?
      |     YES -> Old message stays as plain text.
      |            Generate fresh welcome-back message (Prompt 3).
      |            Fresh message has live options.
      |
      +-- No unanswered message at all?
            Generate fresh welcome-back message (Prompt 3).
```

#### 4.3.8 Chat API Endpoints

```
POST   /api/chat                Body: { content }
                                Returns: SSE stream

                                SSE event format:
                                data: {"token": "I"}
                                data: {"token": " hear"}
                                data: {"token": " you"}
                                data: {"options": ["Option A", "Option B"]}
                                data: {"done": true}

DELETE /api/chat/undo            Returns: { previous_message_id, restored_options }

GET    /api/chat/history         Query: ?before={message_id}&limit=50
                                Returns: { messages[] }

GET    /api/chat/state           Returns: { has_unanswered, is_stale, last_message }
```

---

### F4: Memory System

#### 4.4.1 Dual Memory Architecture

MentailPeace uses TWO memory systems working together:

```
+---------------------------------------------------------------------+
|                    MEMORY ARCHITECTURE                                |
|                                                                      |
|  +-------------------------------+  +-----------------------------+  |
|  |     MEMORI (Auto Memory)      |  |  CUSTOM (Cycle-Based)      |  |
|  |                               |  |                             |  |
|  |  Handles automatically:       |  |  We build ourselves:       |  |
|  |                               |  |                             |  |
|  |  - People extraction          |  |  - Coach's Read            |  |
|  |  - Relationship tracking      |  |    (narrative summary of    |  |
|  |  - Event logging              |  |     user's journey)        |  |
|  |  - Fact extraction            |  |                             |  |
|  |  - Attribute detection        |  |  - Event/Fact Log          |  |
|  |  - Preference tracking        |  |    (psychologically         |  |
|  |  - Skill tracking             |  |     weighted items from     |  |
|  |  - Rule tracking              |  |     Kael PRD)              |  |
|  |  - Memory retrieval           |  |                             |  |
|  |                               |  |  Triggered every 20        |  |
|  |  Triggered: EVERY exchange    |  |  exchanges (cycle)         |  |
|  |  (background, non-blocking)   |  |  (background, non-blocking)|  |
|  +-------------------------------+  +-----------------------------+  |
|                                                                      |
+---------------------------------------------------------------------+
```

#### 4.4.2 Memori Auto-Memory (Per Exchange)

```
User says: "My sister Maya and I had a fight about
            our dad's retirement party. I've been
            doing box breathing to cope."

Memori automatically extracts:

  +---------------+ +----------------+ +----------------------+
  |  PEOPLE       | | RELATIONSHIPS  | | EVENTS               |
  |               | |                | |                       |
  |  Sister: Maya | | Conflict with  | | Fight about dad's    |
  |  Father:      | | sister Maya    | | retirement party     |
  |  retiring     | |                | |                       |
  +---------------+ +----------------+ +----------------------+

  +---------------+ +----------------+
  |  SKILLS       | | ATTRIBUTES     |
  |               | |                |
  |  Box breathing| | (already       |
  |  (practicing) | |  stored)       |
  +---------------+ +----------------+
```

**Memori retrieves relevant memories automatically on each new message:**

```
User says: "I'm stressed about a family event"

Memori recalls:
  - "User has a sister named Maya"
  - "Had conflict with sister about father's retirement"
  - "Father is retiring"
  - "User practices box breathing"

AI can now connect the dots naturally.
```

#### 4.4.3 Custom Memory Ops (Every 20 Exchanges)

```
Exchange count hits multiple of 20 (CYCLE_LENGTH)
      |
      v  (All run in background, non-blocking)
      |
      +-- Generate Coach's Read (Prompt 2)
      |     Input: last 20 exchanges + previous Coach's Read
      |     Output: 300-500 word narrative summary
      |     Replaces previous Read as "current"
      |     Old Reads archived (not sent to LLM)
      |
      +-- Update Event/Fact Log (LLM call)
      |     Input: last 20 exchanges + last 100 event items
      |     Output: 0-5 new items (max 15 words each)
      |     Append-only (never deleted)
      |
      +-- Update User Profile (LLM call)
            Input: last 20 exchanges + current profile
            Output: updated profile (only changed fields)
            Rarely changes (only new disclosures)
```

**Why both systems?**

| What | Memori Does | Custom Ops Do |
|---|---|---|
| **People & relationships** | Auto-extracted every message | -- |
| **Facts & events** | Auto-extracted every message | Curates psychologically weighted items |
| **User attributes** | Auto-extracted every message | Profile update for structured fields |
| **Coach's Read** | -- | 300-500 word narrative summary |
| **Pattern recognition** | Retrieves related memories | Coach's Read captures active patterns |
| **Preferences** | Auto-extracted every message | -- |

#### 4.4.4 LLM Context Payload (Per Exchange)

Every message to the LLM includes:

```
+---+-----------------------------+----------------------------------+
| # | Component                   | Source                           |
+---+-----------------------------+----------------------------------+
| 1 | System Prompt (Prompt 1)    | Static (with dynamic injections) |
| 2 | User Profile                | Database                         |
| 3 | Coach's Latest Read         | Database (latest only)           |
| 4 | Event Log (last 100 items)  | Database (most recent first)     |
| 5 | Memori Memories             | Memori retrieval (auto)          |
| 6 | Recent Exchanges (last 20)  | Database                         |
| 7 | User's Current Message      | Client                           |
| 8 | Timestamps                  | System                           |
+---+-----------------------------+----------------------------------+
```

Assembly order in prompt:

```
[System Prompt]

<user_profile>
{profile JSON}
</user_profile>

<coach_read>
{latest coach read text}
</coach_read>

<event_log>
{last 100 event items, most recent first}
</event_log>

<memori_context>
{relevant memories retrieved by Memori}
</memori_context>

<conversation_history>
{last 20 exchanges in chronological order}
</conversation_history>

<current_message>
{user's message}
</current_message>

<metadata>
{current_timestamp, last_message_timestamp}
</metadata>
```

#### 4.4.5 Memory Edge Cases

| Scenario | Handling |
|---|---|
| User chats during memory ops | Use previous cycle's artifacts. No blocking. |
| Memory ops fail | Log error. Retry next cycle. Use stale artifacts. |
| Two cycles trigger rapidly | Queue them. Second uses first's output. |

---

### F5: Prompts

#### 4.5.1 Prompt 1 -- System Prompt (Chat)

Sent with every LLM request. Defines the AI's personality and behavior.

**Key personality traits:**
- Warm, direct, slightly edgy coaching style
- Dry sense of humor, not jokes
- Uses topics as a lens to surface user's patterns
- Asks one good question at a time
- Impatient with surface-level answers (gently steers deeper)
- Never diagnoses, never replaces professional therapy

**Core coaching approach:**
- Find the belief underneath the question
- Use analogies and metaphors
- Match the person's depth
- Connect patterns from past conversations
- Every topic ends with: insight + micro-action

**Response format rules:**
- Valid JSON: `{"message": "...", "options": [...]}`
- 2-4 short paragraphs, 15-20 words max each
- Markdown allowed (bold, italic, bullets)
- End with forward momentum (question, pattern, or micro-action)
- No em dashes. Write like a real person.

**Option writing rules:**
- 0-5 options, typically 2-4
- 5-10 words each, conversational
- Genuinely different stances (not rewordings)
- At least one uncomfortable truth
- At least one common deflection
- Last option = free-text escape hatch (varies contextually)

**Crisis detection:**
- If suicidal ideation, self-harm, or severe distress detected
- Respond with genuine concern
- Provide crisis resources (988 Lifeline, Crisis Text Line)
- Explicitly state: "I'm a companion tool, not a therapist"
- Do NOT attempt to coach through a crisis

#### 4.5.2 Prompt 2 -- Coach's Read Generation

Run every 20 exchanges (cycle boundary). Background, non-blocking.

**Input:** Previous Coach's Read + last 20 exchanges
**Output:** 300-500 word narrative in flowing prose

**What to capture:**
- Active psychological themes and patterns
- Where user is in the process (awareness / resistance / action)
- Growth edges (what to push on next)
- Assigned micro-actions and whether user followed through
- Emotional undertones
- Key shifts since last read

**What to drop:**
- Surface chit-chat
- Info already in User Profile
- Unchanged info from previous read

#### 4.5.3 Prompt 3 -- Welcome-Back Message

Used when user opens app and last AI message is stale (>48h) or no unanswered message exists.

**Input:** Profile + Coach's Read + Event Log + Last 20 exchanges + timestamps
**Output:** JSON `{"message": "...", "options": [...]}`

**Rules:**
- Reference pending micro-actions, interrupted conversations, or patterns
- Always include a "start fresh" option
- Don't acknowledge the gap awkwardly (no "Welcome back!")
- Same voice and format as regular chat messages

---

## 5. Data Models

### 5.1 User

```json
{
  "id": "uuid",
  "auth_provider": "google | email | guest",
  "email": "string | null",
  "created_at": "timestamp",
  "exchange_count": 0,
  "last_active_at": "timestamp",
  "onboarding_completed": false,
  "profile": { "see Profile schema" }
}
```

### 5.2 Profile

```json
{
  "name": "string",
  "age": "string",
  "gender": "string",
  "location": "string | null",
  "timezone": "string | null",
  "profession": "string | null",
  "relationship_status": "string | null",
  "key_relationships": [
    { "name": "string", "relationship": "string" }
  ],
  "interests": ["string"],
  "important_dates": [
    { "label": "string", "date": "string" }
  ],
  "other_permanent_facts": ["string"]
}
```

### 5.3 Message

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "role": "user | assistant",
  "content": "string",
  "options": ["string"] ,
  "created_at": "timestamp",
  "exchange_number": 0,
  "cycle_id": 0,
  "is_onboarding": false,
  "source": "chat | onboarding | welcome_back"
}
```

### 5.4 Coach's Read

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "cycle_id": 0,
  "content": "string (300-500 word narrative)",
  "created_at": "timestamp",
  "is_current": true
}
```

### 5.5 Event Log Item

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "cycle_id": 0,
  "content": "string (max 15 words)",
  "created_at": "timestamp"
}
```

---

## 6. Configurable Parameters

```
+----------------------------+---------+-------------------------------------------+
| Parameter                  | Default | Description                               |
+----------------------------+---------+-------------------------------------------+
| GUEST_EXCHANGE_LIMIT       | 5       | Exchanges before guest signup wall        |
| CYCLE_LENGTH               | 20      | Exchanges per memory ops cycle            |
| CONTEXT_WINDOW_EXCHANGES   | 20      | Recent exchanges sent to LLM              |
| EVENT_LOG_CONTEXT_LIMIT    | 100     | Max event log items sent to LLM           |
| MESSAGE_STALENESS_WINDOW   | 48h     | When unanswered msg loses options         |
| COACH_READ_MAX_WORDS       | 500     | Max words for Coach's Read                |
| LLM_MODEL                  | TBD     | Model for chat (via OpenRouter)           |
| MEMORY_OPS_MODEL           | TBD     | Model for memory ops (can be cheaper)     |
+----------------------------+---------+-------------------------------------------+
```

All values stored in a config table, changeable without code deploy.

---

## 7. Edge Cases

### 7.1 Crisis Detection

```
User message contains crisis keywords?
      |
      +-- YES -> AI responds with concern + crisis resources
      |          (988 Lifeline, Crisis Text Line)
      |          AI does NOT coach through crisis
      |
      +-- NO  -> Normal conversation continues
```

### 7.2 App Crash During Generation

| Scenario | Handling |
|---|---|
| User closes browser during AI generation | Server completes generation, stores message. User sees it on return. |
| Server crashes during generation | On next user message, detect missing response. Re-trigger with same payload. |
| Network drops during streaming | Client retries with exponential backoff. Show retry button after 3 failures. |

### 7.3 JSON Parse Failures

```
LLM returns response
      |
      v
Try JSON.parse()
      |
      +-- Success -> Use response
      |
      +-- Fail -> Strip markdown fences, retry parse
            |
            +-- Success -> Use response
            |
            +-- Fail -> Regex extract JSON, retry parse
                  |
                  +-- Success -> Use response
                  |
                  +-- Fail -> Retry LLM with "respond in valid JSON"
                        |
                        +-- After 3 retries -> Fallback message:
                            {"message": "Give me a second. What were you saying?",
                             "options": ["Let me repeat that", "Something new"]}
```

---

## 8. Implementation Phases

```
Phase 1: Foundation (Week 1)          Phase 2: Memory + Chat (Week 2-3)
+---------------------+               +-------------------------+
| - Project setup      |               | - Memori integration    |
|   (FastAPI + React)  |               | - OpenRouter LLM service|
| - PostgreSQL schema  |------>        | - SSE streaming         |
| - Auth (Google,      |               | - Chat endpoint         |
|   Email OTP, Guest)  |               | - System prompt (P1)    |
| - JWT middleware      |               | - Coach's Read (P2)     |
| - User/Profile CRUD  |               | - Memory ops pipeline   |
+---------------------+               +------------+------------+
                                                    |
Phase 4: Polish (Week 5)              Phase 3: Frontend (Week 3-4)
+---------------------+               +-------------------------+
| - Undo last message  |               | - Chat UI (single chat) |
| - User return logic  |<------        | - Tappable options UI   |
| - Welcome-back (P3)  |               | - SSE streaming hook    |
| - Error handling     |               | - Onboarding flow       |
| - Loading states     |               | - Auth screens          |
| - Mobile responsive  |               | - Markdown rendering    |
| - Crisis detection   |               | - Guest wall overlay    |
+---------------------+               +-------------------------+
```

---

## 9. What We're NOT Building (MVP Deferred)

| Feature | Why Deferred |
|---|---|
| **Notification System** | Complex (background worker + push). Add in v1.1. |
| **Paywall / Monetization** | Focus on core experience first. Add in v1.1. |
| **Analytics (PostHog)** | Nice to have but not blocking. Add in v1.1. |
| **Mobile App (React Native)** | Web-first MVP. Mobile in v2.0. |
| **Deep Link Handling** | No ads running yet. Add with mobile. |
| **Meta SDK / Attribution** | No ads running yet. Add with mobile. |
| **Mood Tracking** | Not in Kael spec. Can add later if needed. |
| **Session Management** | Single continuous chat replaces sessions. |

---

## 10. Safety and Ethics

### 10.1 Disclaimers
- MentailPeace is NOT a replacement for professional therapy
- Clear disclaimer shown on auth screen and in app settings
- Emergency resources displayed when crisis language detected

### 10.2 Data Privacy
- All data stored on self-hosted PostgreSQL
- No data sent to third parties except LLM calls (OpenRouter)
- Users can delete their account and all associated data
- Passwords not stored (OAuth + OTP only)

---

## 11. Success Metrics (Post-Launch)

| Metric | How to Measure |
|---|---|
| **Return rate** | % of users who come back for 2+ days |
| **Avg exchanges per session** | Messages per app open |
| **Memory accuracy** | Does AI correctly recall past information? |
| **Onboarding completion** | % who finish all 6 steps |
| **Guest conversion** | % of guests who sign up at wall |
