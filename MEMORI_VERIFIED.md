# Memori Library — Verified Technical Reference

**Date Verified**: 2026-03-31
**Source**: PyPI, GitHub (MemoriLabs/Memori), Official Docs (memorilabs.ai), arXiv Paper

---

## Installation

```bash
pip install memori
```
Requires: Python 3.10+

---

## Initialization (PostgreSQL BYODB)

```python
from memori import Memori
from openai import OpenAI

# Initialize with PostgreSQL connection string
mem = Memori(
    database_connect="postgresql+psycopg2://user:password@localhost:5432/mentailpeace",
    conscious_ingest=True,    # inject essentials at session start
    auto_ingest=True          # inject relevant memories per message
)

# Register LLM client (OpenRouter via OpenAI-compatible)
client = OpenAI(
    api_key="your-openrouter-key",
    base_url="https://openrouter.ai/api/v1"
)
mem.llm.register(client)

# Attribution — REQUIRED for memories to work
mem.attribution(entity_id="user_123", process_id="kael")
```

**IMPORTANT:** `database_connect=` with connection string is the documented way. NOT `conn=SessionLocal`.

---

## Dual Memory Modes

### Conscious Ingest (session start)
- Runs ONCE at initialization (NOT continuously)
- Scans long-term memories labeled "conscious-info"
- Copies essential ones into session working memory
- Token cost: ~100-300 tokens

### Auto Ingest (per message)
- Runs on EVERY LLM call
- Searches all memories for relevance to current message
- Injects up to 5 most relevant memories
- Token cost: ~200-500 tokens

### Combined (recommended for Kael)
- Both modes active: ~300-800 tokens per request
- Stays constant whether user has 50 or 5000 memories

---

## What Was WRONG in Our Earlier Assumptions

| Claim | Reality |
|-------|---------|
| Conscious Agent runs every ~6 hours | WRONG — runs ONCE at startup only |
| Short-term and long-term merge during search | WRONG — separate pipelines |
| Memori(conn=SessionLocal) | WRONG — use database_connect= with string |
| Always 8 categories | WRONG — basic has 5, Advanced Augmentation has 8 |
| OpenRouter officially supported | WRONG — not documented, but should work via base_url |

---

## Memory Categories

### Basic (5 categories)
facts, preferences, skills, context, rules

### Advanced Augmentation (8 categories) — WE USE THIS
attributes, events, facts, people, preferences, relationships, rules, skills

---

## Available API Methods

```python
# Memory stats
stats = mem.get_memory_stats()
# Returns: {chat_history_count, short_term_count, long_term_count}

# Search by category
skills = mem.search_memories_by_category("skill", limit=5)
facts = mem.search_memories_by_category("fact", limit=5)

# Manual recall
results = mem.recall("user's coping strategies", limit=5)

# Manual analysis trigger
mem.trigger_conscious_analysis()

# Session management
mem.new_session()
mem.set_session(session_id="custom-session-123")

# Wait for memory processing
mem.augmentation.wait()
```

---

## Benchmarks (Verified — Published in arXiv Paper)

| Metric | Value |
|--------|-------|
| LoCoMo Accuracy | 81.95% |
| Tokens per query | 1,294 average |
| vs Full context | 4.98% of full context cost |
| vs Zep | 67% fewer tokens, +3% accuracy |
| vs Mem0 | +19.48% accuracy |
| vs LangMem | +3.9% accuracy |

Source: arxiv.org/html/2603.19935

---

## What Memori Handles Automatically (No Custom Code Needed)
- Extract memories from every conversation
- Retrieve relevant memories per query
- Deduplicate semantic triples
- Relevance ranking
- Token-efficient context injection
- 8-category classification (Advanced Augmentation)

---

## What We Build Custom (On Top of Memori)
- Knowledge routing (topic classification + strategy selection)
- Crisis detection (background LLM classifier)
- Onboarding flow (scripted steps 1-3, AI steps 4+)
- Welcome-back detection (timestamp check + Memori context)
- Notification scheduling (background worker + Memori context)
- Prompt assembly (base prompt + strategies + Memori + history)

---

## OpenRouter Compatibility — NEEDS TESTING

OpenRouter is NOT officially listed by MemoriLabs. But:
- Custom base_url is supported (Nebius AI Studio example in docs)
- OpenRouter provides OpenAI-compatible API
- Should work in practice

**Action item: Test OpenRouter + Memori compatibility in Phase 1 before building further.**

Fallback if OpenRouter doesn't work with Memori:
- Use OpenAI directly for Memori's internal memory processing
- Use OpenRouter separately for chat responses
- Or use Anthropic/Gemini directly (both officially supported)
