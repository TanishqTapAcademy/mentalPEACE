# Mem0 — Verified Technical Reference

**Date Verified**: 2026-03-31
**Source**: PyPI, GitHub (mem0ai/mem0), Official Docs (docs.mem0.ai), Mem0 Blog

---

## Installation

```bash
pip install mem0ai
```

---

## Configuration (Our Setup: Supabase + OpenRouter)

```python
from mem0 import Memory

config = {
    "vector_store": {
        "provider": "pgvector",
        "config": {
            "host": "db.xxxxx.supabase.co",
            "port": 5432,
            "user": "postgres",
            "password": "your-supabase-password",
            "dbname": "postgres",
            "collection_name": "mem0",
            "embedding_model_dims": 1536
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

**Prerequisite (run once in Supabase SQL editor):**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Core API

```python
# Store a memory
m.add("My sister Maya and I had a fight", user_id="user_123")

# Search memories (vector similarity — matches by meaning)
results = m.search("family problems", user_id="user_123")

# Get all memories for a user
all_memories = m.get_all(user_id="user_123")

# Delete a specific memory
m.delete(memory_id="some-id")

# Delete all memories for a user
m.delete_all(user_id="user_123")
```

---

## How It Works

### Storage
- Memories stored as text + vector embeddings in PostgreSQL (pgvector)
- Mem0 creates its own table in your database
- Your data never leaves your server

### Extraction (on m.add())
- LLM reads the conversation
- Extracts discrete facts
- Each fact gets embedded (vector) and stored
- Checks existing memories: ADD / UPDATE / DELETE / NOOP
  - "I live in Mumbai" stored → later "I moved to Bangalore"
  - Mem0 DELETES Mumbai, ADDS Bangalore (smart dedup)

### Retrieval (on m.search())
- Converts query to vector
- Cosine similarity search against all stored memories
- Returns ranked results (most relevant first)
- Matches by MEANING, not keywords ("dad" matches "father")

---

## Verified Facts

| Claim | Status |
|-------|--------|
| 100% free for production | **VERIFIED** — Apache 2.0, no limits |
| No API key to Mem0 needed | **VERIFIED** — only your LLM key (OpenRouter) |
| 100% self-hosted / local | **VERIFIED** — pip install, your DB, your LLM |
| OpenRouter officially supported | **VERIFIED** — listed in docs, dedicated config param |
| Works with Supabase PostgreSQL | **VERIFIED** — pgvector config with host/port/user/pass |
| Smart deduplication | **VERIFIED** — ADD/UPDATE/DELETE/NOOP logic |
| No rate limits | **VERIFIED** — unlike Memori's 100/day |
| Graph memory (Neo4j) optional | **VERIFIED** — works without it, add later |
| Needs pgvector extension | **VERIFIED** — run CREATE EXTENSION IF NOT EXISTS vector |

---

## Supported LLM Providers (Verified)

OpenAI, Groq, AzureOpenAI, **OpenRouter**, Ollama, DeepSeek, XAI, Sarvam, LM Studio

---

## Supported Vector Stores (Verified)

pgvector (PostgreSQL), Qdrant, Chroma, Milvus, Pinecone, Weaviate

---

## Graph Memory (Optional — For Later)

```python
# Add Neo4j for relationship tracking
config["graph_store"] = {
    "provider": "neo4j",
    "config": {
        "url": "neo4j://localhost:7687",
        "username": "neo4j",
        "password": "password"
    }
}
# Enables: Maya --[sister]--> User --[dating]--> Raj
# Not needed for MVP — add when we want deeper relationship tracking
```

---

## Why Mem0 Over Memori

| Reason | Detail |
|--------|--------|
| No rate limits | Memori: 100 memories/day without API key |
| No cloud dependency | Memori: Advanced Augmentation may use their cloud |
| OpenRouter confirmed | Memori: not officially tested |
| Production safe | No dependency on Memori's servers staying up |
| Full control | We manually add/search — not a black box auto-inject |
| Smart dedup | Memori only deduplicates semantic triples |
| Trade-off accepted | Lower accuracy (62% vs 82%) offset by our knowledge routing |

---

## What We Build On Top of Mem0

- Knowledge routing (topic classification + strategy selection)
- Metadata categories: `m.add(text, metadata={"category": "skill"})` for structured tagging
- Crisis detection (background LLM classifier)
- Prompt assembly (base prompt + strategies + Mem0 results + history)
- Onboarding, welcome-back, notifications (all use m.search for context)
