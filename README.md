# DocPal

**DocPal** is a full-stack AI document assistant. Upload documents, then chat with them using your choice of LLM provider. A Python RAG/agent service handles retrieval and generation, with an optional live web-search fallback powered by CrewAI + Serper when the document doesn't contain enough information.

---

## Architecture

```
Browser (React 19 + Vite)
        ↕  REST  (JWT auth)
  Node/Express + MongoDB
        ↕  HTTP (internal)
  Python FastAPI  (RAG service v2)
        ↕
Pinecone (vector store)       LLM: Groq (Llama 3.3 70B) / Gemini 2.0 Flash
                              Serper + CrewAI  (web-search fallback)
```

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS v4, React Router v7, Zustand v5 |
| Backend | Node.js, Express 5, TypeScript, MongoDB/Mongoose, JWT (7 d expiry), bcrypt |
| Embeddings | Google Gemini `gemini-embedding-001` (primary) · HuggingFace `all-mpnet-base-v2` (fallback) |
| RAG service | Python, FastAPI, LangChain, CrewAI, Pinecone |

---

## Features

- **Auth** — register / login with JWT-secured routes; tokens expire after 7 days
- **Notes** — upload PDF / DOCX / DOC / TXT files (up to 10 MB); view, edit, and delete notes
- **Chat** — per-note AI chat sessions with full history; rename and delete sessions
- **Multi-LLM** — Groq `llama-3.3-70b-versatile` or Google Gemini `gemini-2.0-flash`; LLM is chosen automatically based on which key is available (Groq takes priority)
- **Web-search fallback** — if the document context is insufficient, a two-agent CrewAI crew (search → scrape) answers from live web results via Serper
- **Encrypted key storage** — all API keys stored AES-256-CBC encrypted; decrypted in memory only at request time, never returned to the client in plaintext
- **Settings** — each user stores their own Groq, Gemini, Serper, and Pinecone keys; the app adapts automatically. Server-level `.env` keys act as shared defaults
- **Rate limiting** — 100 requests per IP per 15-minute window on all `/api` routes
- **Security headers** — Helmet applied to every response
- **Graceful fallback** — if the Python RAG service is unreachable, the Node backend serves a direct Pinecone context snippet

---

## Project Structure

```
DocPal/
├── backend/
│   ├── index.ts                 # Express app, MongoDB connection, Helmet, rate limiter
│   ├── pinecone.ts              # Low-level Pinecone client (get-or-create index)
│   ├── routes/
│   │   └── routes.ts            # All REST endpoints
│   ├── middleware/
│   │   ├── auth.ts              # JWT authentication middleware
│   │   └── upload.ts            # Multer file upload (10 MB limit, pdf/doc/docx/txt)
│   ├── model/
│   │   ├── user.ts              # User schema (email, password, encrypted API keys)
│   │   ├── notes.ts             # Note schema (title, content, file metadata)
│   │   └── chat.ts              # ChatSession + ChatMessage schemas
│   ├── services/
│   │   ├── embeddingService.ts  # Gemini / HuggingFace embedding generation + text chunking
│   │   └── vectorService.ts     # Pinecone upsert / query / delete helpers
│   ├── utils/
│   │   ├── encryption.ts        # AES-256-CBC encrypt / decrypt / mask
│   │   └── fileProcessor.ts     # Extract text from PDF, DOCX/DOC, TXT
│   └── RAG/
│       ├── api.py               # FastAPI RAG service v2 — agentic RAG + CrewAI web search
│       ├── main.py              # Standalone FAISS demo (not used in production)
│       └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── App.tsx              # Router + protected/public route guards
│       ├── pages/
│       │   ├── landing.tsx      # Public marketing page
│       │   ├── login.tsx        # Login form
│       │   ├── register.tsx     # Registration form
│       │   ├── option.tsx       # Dashboard — upload a file or go to notes
│       │   ├── notesPage.tsx    # Note list with expand/collapse details
│       │   ├── editNote.tsx     # View / edit a note's content
│       │   ├── chat.tsx         # Chat with a note (sessions, history)
│       │   └── settings.tsx     # API key management (save / view masked / delete)
│       ├── services/api.ts      # Axios client + typed API helpers
│       ├── store/store.tsx      # Zustand store (edit-mode flag)
│       ├── components/
│       │   ├── layout/Navbar.tsx
│       │   └── ui/              # Button, Input, Card, Toast, ConfirmModal
│       └── styles/              # Per-page CSS + global color tokens (colors.css)
│
└── setup.sh                     # One-shot setup script
```

---

## Quick Start

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| MongoDB | local or Atlas |
| Python | 3.10+ |
| Pinecone | free-tier account |

At minimum you need **one LLM key** (Groq free tier is the easiest) and a **Pinecone key** for vector search. Embeddings work with a **Gemini key** (primary) or a **HuggingFace token** (fallback).

### 1 — Run setup script

```bash
chmod +x setup.sh && ./setup.sh
```

This creates `.env` templates in `backend/`, `backend/RAG/`, and `frontend/`, installs all Node and Python dependencies, and sets up the Python virtual environment.

### 2 — Configure environment

**`backend/.env`**
```env
MONGODB_URI=mongodb://localhost:27017/agentrag
PORT=3000
NODE_ENV=development
JWT_SECRET=change-me-in-production-min-32-chars
API_KEY_ENCRYPTION_SECRET=change-me-exactly-32-chars!!!!!
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=agentrag-notes
GEMINI_API_KEY=AIza...            # used for embeddings (primary)
# HUGGINGFACE_API_KEY=hf_...      # optional — embedding fallback if no Gemini key
RAG_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:5173
```

> `API_KEY_ENCRYPTION_SECRET` must be **exactly 32 characters**. It protects all user API keys stored in MongoDB.

**`backend/RAG/.env`** *(optional — users can also supply keys via the Settings page)*
```env
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
SERPER_API_KEY=...
RAG_SERVICE_PORT=8000
RAG_SERVICE_HOST=0.0.0.0
```

**`frontend/.env`**
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 3 — Start services

```bash
# Terminal 1 — Node backend + Python RAG service (started together)
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

> `npm run dev` in the backend uses `concurrently` to start the Node server (`nodemon`) **and** the Python RAG service (`uvicorn`) at the same time. You do not need a separate terminal for Python.

App is available at **http://localhost:5173**.

---

## API Reference

All routes except `POST /api/user` and `POST /api/auth/login` require `Authorization: Bearer <token>`.

### Auth

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/user` | Register — `{ emailId, password }` |
| `POST` | `/api/auth/login` | Login → `{ token, user }` |

### Notes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/notes/:userId` | List all notes for a user |
| `GET` | `/api/note/:noteId` | Get a single note |
| `POST` | `/api/note` | Create note from raw text — `{ userId, title, content }` |
| `POST` | `/api/note/upload` | Upload file → extract text → create note (multipart) |
| `PUT` | `/api/note/:noteId` | Update title and/or content (re-embeds on content change) |
| `DELETE` | `/api/note/:noteId` | Delete note + its Pinecone embeddings |

### Chat

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/chat-sessions/:noteId` | List chat sessions for a note |
| `POST` | `/api/chat-sessions` | Create a new session — `{ noteId, userId, title? }` |
| `PUT` | `/api/chat-sessions/:sessionId` | Rename a session |
| `DELETE` | `/api/chat-sessions/:sessionId` | Delete a session |
| `GET` | `/api/chat-messages/:sessionId` | Get all messages in a session |
| `POST` | `/api/chat-messages` | Save a message — `{ sessionId, role, content }` |
| `POST` | `/api/chat/:noteId` | Send a message → AI response (calls RAG service) |

### Settings

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/user/api-keys` | Encrypt and save API keys |
| `GET` | `/api/user/api-keys/:userId` | Get masked key status |
| `DELETE` | `/api/user/api-keys/:userId` | Delete all stored keys |

---

## RAG Service (`backend/RAG/api.py`)

The FastAPI service (v2) receives per-request, pre-decrypted LLM credentials from the Node backend so each user's own keys are used independently. Server `.env` keys act as shared defaults when a user has not configured their own.

**Flow for each `POST /chat` request:**

1. Node queries Pinecone for the top-5 relevant chunks and passes them as `context`.
2. RAG service builds an LLM instance (Groq preferred, Gemini fallback) from the supplied keys.
3. A **router LLM call** determines whether the context is sufficient to answer the query (`Yes` / `No`).
4. **If Yes** → answer is generated directly from the Pinecone context.
5. **If No** → a CrewAI crew (web-search agent + web-scraper agent) fetches live results via Serper, then the LLM answers from the combined context.
6. Response includes `{ response, used_web_search, llm_provider }`.

If the Python service is unreachable, the Node backend automatically returns a plain-text excerpt from the top Pinecone chunk as a fallback.

**Supported LLM providers:**

| Provider | Model | Key |
|----------|-------|-----|
| Groq *(default)* | `llama-3.3-70b-versatile` | `GROQ_API_KEY` |
| Google Gemini | `gemini-2.0-flash` | `GEMINI_API_KEY` |

> The CrewAI web-search crew also uses these same keys (Gemini preferred for CrewAI, Groq as fallback).

**Embedding providers (Node backend):**

| Provider | Model | Dimensions | Key |
|----------|-------|-----------|-----|
| Google Gemini *(primary)* | `gemini-embedding-001` | 768 | `GEMINI_API_KEY` |
| HuggingFace *(fallback)* | `all-mpnet-base-v2` | 768 | `HUGGINGFACE_API_KEY` |

---

## Security Notes

- Passwords hashed with **bcrypt** (12 salt rounds) before storage.
- All user API keys encrypted with **AES-256-CBC** (`API_KEY_ENCRYPTION_SECRET`) before being persisted to MongoDB; the IV is stored alongside the ciphertext.
- Keys are decrypted in memory only at request time and are never returned to the client in plaintext (the API returns only masked values like `••••••••abcd`).
- JWT tokens are signed with `JWT_SECRET` and expire after **7 days**; validated on every protected route.
- `helmet` applies security headers (CSP, HSTS, etc.) to all responses.
- Rate limiter caps each IP at **100 requests / 15 min** on all `/api` routes.
- File uploads are restricted to PDF, DOC, DOCX, TXT and capped at **10 MB**.
- CORS is restricted to the configured `CORS_ORIGIN`.

---

## License

ISC

