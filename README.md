# DocPal

**DocPal** is a full-stack AI document assistant that allows users to upload notes or documents and interact with them using conversational AI.

The system combines Retrieval Augmented Generation (RAG), vector search, and agent-based web retrieval to answer questions from uploaded documents. If the document context is insufficient, the system automatically falls back to live web search using CrewAI agents.

Users can also configure their own LLM provider keys, allowing DocPal to dynamically switch between multiple model providers.
---

## Architecture

```
Browser (React + Vite)
    ↕ REST (JWT auth)
Node/Express + MongoDB
    ↕ HTTP
Python FastAPI (RAG service)
    ↕
Pinecone (vector store)   LLM provider (Groq / Gemini / Anthropic)
                          Serper + CrewAI (web search fallback)
```

| Layer | Stack |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind v4, React Router, Zustand |
| Backend | Node.js, Express, TypeScript, MongoDB/Mongoose, JWT, bcrypt |
| RAG service | Python, FastAPI, LangChain, CrewAI, Pinecone |

---

## Features

- **Auth** — register / login with JWT-secured routes
- **Notes** — upload PDF/DOCX/TXT files; view, edit, and delete notes
- **Chat** — per-note AI chat sessions with full history, rename, delete
- **Multi-LLM** — per-user choice of Groq (Llama 3.3 70B), Google Gemini 2.0 Flash, or Anthropic Claude 3.5 Haiku
- **Web search** — if the document doesn't contain the answer, the agent falls back to a live Serper + CrewAI web-scraping crew
- **Encrypted key storage** — all API keys stored AES-256 encrypted, decrypted server-side only at request time
- **Settings** — users store their own LLM, Serper, and Pinecone keys; the system adapts automatically

---

## Project Structure

```
AgentRAG/
├── backend/
│   ├── index.ts              # Express app, MongoDB connection
│   ├── routes/routes.ts      # All REST endpoints
│   ├── middleware/
│   │   ├── auth.ts           # JWT authentication
│   │   └── upload.ts         # Multer file upload
│   ├── model/
│   │   ├── user.ts           # User schema (email, password, encrypted keys, llmProvider)
│   │   ├── notes.ts          # Note schema (title, content, metadata)
│   │   └── chat.ts           # ChatSession + ChatMessage schemas
│   ├── services/
│   │   ├── embeddingService.ts  # HuggingFace / Pinecone embedding helpers
│   │   └── vectorService.ts     # Pinecone upsert / query / delete
│   ├── utils/
│   │   ├── encryption.ts     # AES-256 encrypt/decrypt/mask
│   │   └── fileProcessor.ts  # Extract text from uploaded files
│   ├── RAG/
│   │   ├── api.py            # FastAPI service — per-request LLM + RAG + CrewAI
│   │   ├── main.py           # Standalone demo (FAISS + HuggingFace)
│   │   └── requirements.txt
│   └── pinecone.ts           # Low-level Pinecone client helpers
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── landing.tsx   # Public marketing page
│       │   ├── login.tsx / register.tsx
│       │   ├── option.tsx    # Dashboard (upload or chat)
│       │   ├── notesPage.tsx # Note list
│       │   ├── editNote.tsx  # View / edit a note
│       │   ├── chat.tsx      # Chat with a note
│       │   └── settings.tsx  # API key management
│       ├── services/api.ts   # Axios client + all API helpers
│       ├── store/store.tsx   # Zustand (edit-mode flag)
│       ├── components/ui/    # Button, Input, Card, Toast, ConfirmModal
│       └── styles/           # Per-page CSS + global color tokens
│
└── setup.sh                  # One-shot setup script
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Python 3.10+
- A Pinecone account (free tier works)
- At least one LLM API key (Groq free tier recommended to start)

### 1 — Run setup script

```bash
chmod +x setup.sh && ./setup.sh
```

This installs all Node and Python dependencies and creates `.env` templates in `backend/` and `backend/RAG/`.

### 2 — Configure environment

**`backend/.env`**
```env
MONGODB_URI=mongodb://localhost:27017/docpal
PORT=3000
JWT_SECRET=change-me-in-production
RAG_SERVICE_URL=http://localhost:8000
CORS_ORIGIN=http://localhost:5173
```

**`backend/RAG/.env`** *(optional — users can also supply keys through the Settings UI)*
```env
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
SERPER_API_KEY=...
```

**`frontend/.env`**
```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 3 — Start services

Open three terminals:

```bash
# Terminal 1 — Node backend
cd backend && npm run dev

# Terminal 2 — Python RAG service
cd backend/RAG && source venv/bin/activate && uvicorn api:app --reload --port 8000

# Terminal 3 — Frontend
cd frontend && npm run dev
```

App is available at **http://localhost:5173**.

---

## API Reference

All routes (except auth and public) require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/user` | Register |
| POST | `/api/auth/login` | Login → returns JWT |

### Notes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notes/:userId` | List user's notes |
| GET | `/api/note/:noteId` | Get single note |
| POST | `/api/note/upload` | Upload file → create note |
| PUT | `/api/note/:noteId` | Update title / content |
| DELETE | `/api/note/:noteId` | Delete note + embeddings |

### Chat
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/chat/sessions/:noteId` | List sessions for a note |
| POST | `/api/chat/sessions/:noteId` | Create new session |
| PUT | `/api/chat/sessions/:sessionId` | Rename session |
| DELETE | `/api/chat/sessions/:sessionId` | Delete session |
| GET | `/api/chat/messages/:sessionId` | Get messages |
| POST | `/api/chat/messages/:sessionId` | Save a message |
| POST | `/api/chat/:noteId` | Send message → AI response |

### Settings
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/user/api-keys` | Save encrypted API keys |
| GET | `/api/user/api-keys/:userId` | Get masked key status |
| DELETE | `/api/user/api-keys/:userId` | Delete all keys |

---

## RAG Service (`backend/RAG/api.py`)

The Python service receives per-request LLM credentials so each user's keys are used independently.

**Flow for each `/chat` request:**

1. Receives `query`, `context` (from Pinecone), `noteTitle`, `llm_provider`, and relevant API keys.
2. Builds an LLM instance (`ChatGroq`, `ChatGoogleGenerativeAI`, or `ChatAnthropic`) from the supplied keys.
3. Asks the LLM whether the provided context is sufficient.
4. If **yes** → generates an answer from the Pinecone context.
5. If **no** → runs a two-agent CrewAI crew (web search → scrape) using Serper, then answers from the scraped content.

**Supported providers:**

| Provider | Model | Key env var |
|----------|-------|-------------|
| Groq | `llama-3.3-70b-versatile` | `GROQ_API_KEY` |
| Google Gemini | `gemini-2.0-flash` | `GEMINI_API_KEY` |
| Anthropic | `claude-3-5-haiku-20241022` | `ANTHROPIC_API_KEY` |

---

## Security Notes

- Passwords hashed with **bcrypt** before storage.
- All API keys encrypted with **AES-256-CBC** before being written to MongoDB.
- Keys are decrypted in memory only when a request is being processed and are never returned to the client in plaintext.
- JWT tokens expire and are validated on every protected route.

---

## License

ISC

