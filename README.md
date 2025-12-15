# AgentRAG

AgentRAG is a full‑stack prototype for an **agentic RAG (Retrieval‑Augmented Generation)** notes assistant. It lets users upload or manage notes, then chat with an AI that can answer questions based on those documents, optionally falling back to web‑based retrieval when local knowledge is insufficient.

The project is split into a **TypeScript/Express + MongoDB backend** and a **React + Vite frontend**, with an experimental **Python RAG/agent pipeline** using LangChain, FAISS, HuggingFace embeddings, Groq, Gemini, and CrewAI.

---

## High‑Level Architecture

- **Frontend (`frontend/`)**: React (Vite + TypeScript) single‑page app.
  - Provides pages for:
    - Choosing between uploading notes and chatting (`Option` page).
    - Listing notes and viewing file metadata (`NotesPage`).
    - Viewing/editing a specific note (`EditNote`).
    - Chatting with a specific note (`Chat`).
  - Uses **Zustand** for small UI state (edit mode), **Radix UI + custom CSS** for styling, and **React Router** for navigation.

- **Backend (`backend/`)**: Node.js + Express + MongoDB (Mongoose).
  - Exposes REST APIs to manage **users** and **notes**.
  - Stores note metadata (pages, size, type, uploadedOn, text length).
  - Provides a health check endpoint and an `/api` router.
  - Includes a **Pinecone helper module** to manage vector indices for note embeddings (index creation, upsert, query, delete).

- **Python RAG/Agent Layer (`backend/RAG/`)**:
  - `main.py` demonstrates an **agentic RAG pipeline**:
    - Loads a local document (`document.txt`), chunks it, and builds a **FAISS** vector store with **HuggingFaceEmbeddings**.
    - Uses a **ChatGroq** LLM and a separate **CrewAI** LLM (Gemini) for:
      - Deciding whether a query can be answered from local documents.
      - If yes, retrieving local context from the vector store.
      - If no, invoking a **SerperDevTool + ScrapeWebsiteTool** crew to retrieve and scrape web pages.
    - Generates a final answer by combining the chosen context with the user query.

The current frontend chat is wired to a **simulated response**, but the architecture is ready to be hooked to the TypeScript/Pinecone or Python RAG backend for full end‑to‑end behavior.

---

## Backend Details (`backend/`)

### Tech Stack

- **Runtime**: Node.js (ESM), TypeScript
- **Framework**: Express
- **Database**: MongoDB via Mongoose
- **Vector Store**: Pinecone (via `@pinecone-database/pinecone`)
- **Config**: `dotenv`

### Entry Point: `index.ts`

- Loads environment variables with `dotenv.config()`.
- Creates an Express app and configures JSON parsing.
- Registers:
  - `GET /` – health check endpoint.
  - `app.use('/api', router)` – main API routes.
- Connects to MongoDB with `mongoose.connect(MONGODB_URI)`:
  - `MONGODB_URI` from env or defaults to `mongodb://localhost:27017/agentrag`.
  - On success, starts the server on `PORT` (default `3000`).

### Data Models (`model/`)

- **User (`model/user.ts`)**
  - Fields:
    - `emailId` (string, required, unique)
    - `password` (string, required) – stored as plain text in this prototype; in production, this must be hashed.
    - `notes` – array of ObjectIds referencing `Notes` documents.
  - Timestamps enabled.

- **Notes (`model/notes.ts`)**
  - Fields:
    - `title` (string, required)
    - `content` (string, required)
    - `metaData` (embedded object, required):
      - `filePages` (number)
      - `fileSize` (string)
      - `fileType` (`pdf | docx | doc | txt`)
      - `uploadedOn` (Date)
      - `textLength` (number)

### API Routes (`routes/routes.ts`)

All routes are mounted under `/api`.

- **GET `/api/notes/:userId`**
  - Fetches a user by `userId` and populates the `notes` array.
  - **Success (200)**: `{ success: true, notes: [...] }`
  - **404** if user not found.

- **GET `/api/note/:noteId`**
  - Fetches a single note by `noteId`.
  - **Success (200)**: `{ success: true, note }`
  - **404** if note not found.

- **POST `/api/note`**
  - Creates a new note and associates it to a user.
  - **Body**:
    ```json
    {
      "userId": "<user-id>",
      "title": "My note",
      "content": "Note content",
      "metaData": {   // optional; default is auto‑generated
        "filePages": 1,
        "fileSize": "1234 chars",
        "fileType": "txt",
        "uploadedOn": "2024-01-01T00:00:00.000Z",
        "textLength": 1234
      }
    }
    ```
  - If `metaData` is not provided, a simple default is constructed from the content length.
  - **Success (201)**: `{ success: true, message: 'Note created successfully', note }`.

- **PUT `/api/note/:noteId`**
  - Updates `title` and/or `content` of a note.
  - Automatically updates `metaData.textLength` when content changes.
  - **Success (200)**: `{ success: true, message: 'Note updated successfully', note }`.

- **DELETE `/api/note/:noteId`**
  - Deletes a note by `noteId`.
  - Optional `userId` in the body to also pull the note from the user’s `notes` array.
  - **Success (200)**: `{ success: true, message: 'Note deleted successfully' }`.

- **POST `/api/user`**
  - Registers a new user.
  - **Body**: `{ "emailId": "user@example.com", "password": "plain-text" }`.
  - Returns 409 if `emailId` is already registered.
  - **Success (201)**: `{ success: true, message: 'User created successfully', user: { id, emailId } }`.

### Pinecone Utilities (`pinecode.ts`)

This module encapsulates interaction with a Pinecone index for vector‑based retrieval over notes.

- **`initializePinecone()`**
  - Creates a singleton `Pinecone` client using `PINECONE_API_KEY` (required env var).

- **`getOrCreateIndex(indexName = 'agentrag-notes', dimension = 1536)`**
  - Lists existing indexes.
  - Creates an index with cosine similarity and serverless config (AWS `us-east-1`) if it does not exist.
  - Returns an index handle.

- **`upsertVectors(indexName, vectors)`**
  - Upserts an array of `{ id, values, metadata? }` vectors into the given index.

- **`queryVectors(indexName, vector, topK = 5, filter?)`**
  - Queries nearest neighbors for a query vector with optional metadata filter.

- **`deleteVectors(indexName, ids)` / `deleteAllVectors(indexName)`**
  - Deletes specific vectors or clears the entire index.

> **Note:** Currently there is no wiring between these Pinecone helpers and the Express routes; integration would involve generating embeddings for each note and calling `upsertVectors` on create/update, and `queryVectors` for chat queries.

### Backend Scripts

- `npm run dev` – run backend in watch mode with `nodemon` and `tsx`.
- `npm start` – run backend once via `tsx`.

### Required Environment Variables

Create `backend/.env` with at least:

```bash
MONGODB_URI=mongodb://localhost:27017/agentrag
PORT=3000
PINECONE_API_KEY=your-pinecone-api-key
```

(If `MONGODB_URI` and `PORT` are omitted, the defaults above are used.)

---

## Python RAG / Agent Layer (`backend/RAG/main.py`)

This module demonstrates an **agentic RAG flow** that can later be exposed as an API and called from the Node backend or directly from the frontend.

### Components

- **Vector Store**: FAISS in‑memory index built from `document.txt`.
- **Embeddings**: `sentence-transformers/all-mpnet-base-v2` via `HuggingFaceEmbeddings`.
- **LLMs**:
  - `ChatGroq` (model `llama-3.3-70b-versatile`) used for routing and final answer generation.
  - `CrewAI` `LLM` wrapper around Gemini (`gemini-2.5-flash`) used within agents.
- **Tools**:
  - `SerperDevTool` for web search.
  - `ScrapeWebsiteTool` for scraping contents of selected pages.
- **Agents & Tasks** (`Crew`):
  - Web search agent: finds the best page for a topic.
  - Web scraping agent: extracts and summarizes the chosen page.

### Core Functions

- **`check_local_knowledge(query, context)`**
  - Asks the LLM (ChatGroq) whether the provided `context` is sufficient to answer `query`.
  - Returns `True` if the answer is `"Yes"` (strict single‑word answer), else `False`.

- **`setup_web_scraping_agent()` / `get_web_content(query)`**
  - Builds a two‑agent crew (search + scraper) and runs it with the given topic.

- **`setup_vector_db(txt_path)`**
  - Loads a local text file, splits into chunks, and builds a FAISS store using HuggingFace embeddings.

- **`get_local_content(vector_db, query)`**
  - Runs similarity search (`k=5`) and returns concatenated page content as context.

- **`generate_final_answer(context, query)`**
  - Calls ChatGroq with system + human messages to generate the final natural‑language answer.

- **`process_query(query, vector_db, local_context)`**
  - Orchestrates the full routing:
    1. Decide whether to answer from local documents.
    2. Retrieve local or web context accordingly.
    3. Generate final answer from the chosen context.

- **`main()`**
  - Example CLI entrypoint that:
    - Builds a vector DB from `document.txt`.
    - Initializes `local_context`.
    - Runs a demo query: `"What is Agentic RAG?"` and prints the result.

### Python Environment Variables

Create `backend/RAG/.env` (or reuse root `.env` if you prefer) with:

```bash
GROQ_API_KEY=your-groq-api-key
SERPER_API_KEY=your-serper-api-key
GEMINI_API_KEY=your-gemini-api-key
```

### Running the Python Demo

From `backend/RAG/` (after installing the appropriate Python dependencies):

```bash
python main.py
```

This will build the local vector store from `document.txt` and run the sample query printed in the script.

> **Note:** The Python file as committed appears to contain a minor syntax/line‑break issue in the Gemini model string; you may need to correct that before running.

---

## Frontend Details (`frontend/`)

### Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler/Dev Server**: Vite
- **Routing**: `react-router` / `react-router-dom`
- **State Management**: Zustand
- **UI & Styling**:
  - Custom UI primitives (`button`, `card`, `input`, `label`) built with Radix + Tailwind‑inspired utilities.
  - Global and page‑specific CSS (`App.css`, `index.css`, `styles/*.css`).
  - Centralized color system documented in `src/styles/README.md`.

### Application Routing (`src/App.tsx`)

- Routes defined with `BrowserRouter`:
  - `/` → redirects to `/option`.
  - `/option` → `Option` page (entry to upload or chat).
  - `/notes` → `NotesPage` (list of all notes).
  - `/notes/:noteId` → `EditNote` (view/edit selected note).
  - `/notes/chat/:noteId` → `Chat` (chat with selected note).

### Global Entry (`src/main.tsx`)

- Standard Vite/React entry that renders `<App />` into `#root` with `StrictMode`.

### State Store (`src/store/store.tsx`)

- Lightweight Zustand store with a single slice:
  - `isEditEnabled` (boolean).
  - Actions: `setIsEditEnabled`, `enableEdit`, `disableEdit`.
- Used to control whether `EditNote` opens in editing mode when navigated from `NotesPage`.

### Pages

- **`Option` (`src/pages/option.tsx`)**
  - Landing page with two primary cards:
    - **Upload Notes** – form UI for note title and document upload (currently no API call wired yet).
    - **Chat with Notes** – explanation and CTA.
  - On clicking **Start Chatting**, navigates to `/notes`.

- **`NotesPage` (`src/pages/notesPage.tsx`)**
  - Displays a list of notes (currently **hardcoded sample data** with realistic metadata fields matching the backend schema).
  - Each note card supports:
    - Expand/collapse to show metadata (pages, size, file type, uploaded date, text length).
    - View note: navigates to `/notes/:noteId` in view mode.
    - Edit note: toggles edit mode in the Zustand store and navigates to `/notes/:noteId`.
    - Delete: UI button only (no backend call yet).
    - Chat: navigates to `/notes/chat/:noteId`.

- **`EditNote` (`src/pages/editNote.tsx`)**
  - Reads `noteId` from route params.
  - On mount:
    - Calls `fetchData()` which currently simulates note data (`"Note {noteId}"`, placeholder content).
    - If `isEditEnabled` is true, enters editing mode immediately.
  - Supports:
    - Toggling between **view** and **edit** states.
    - Tracking unsaved changes and displaying an "Unsaved changes" badge.
    - Simulated save operation (with a `setTimeout`); in a real app this would call the backend `PUT /api/note/:noteId`.
    - Cancel: discards in‑memory edits and reloads simulated data.

- **`Chat` (`src/pages/chat.tsx`)**
  - Chat UI bound to a **specific note** (`noteId` route param).
  - Maintains a message list, input field, and typing indicator.
  - Currently uses a **simulated assistant reply** after a delay with a note about integrating a real RAG backend.
  - Ready to connect to an API endpoint (e.g., `/api/chat/:noteId`) that would:
    - Retrieve the relevant note.
    - Perform RAG over the note (via Python or Pinecone/Node).

### Styling & Design System

- **`src/styles/colors.css` and `src/styles/README.md`**:
  - Define an **industry‑level color system** using CSS custom properties.
  - Offer semantic tokens for backgrounds, text, borders, shadows, and component‑specific colors.
  - Includes guidance for dark mode, semantics (success, warning, error, info), and best practices.
- Page‑specific CSS (`option.css`, `notes.css`, `editNote.css`, `chat.css`) build on top of those variables to create a modern, visually rich UI.

### Frontend Scripts

From `frontend/`:

```bash
npm install
npm run dev      # start Vite dev server
npm run build    # type‑check and build
npm run preview  # serve built app
```

---

## Running the Project Locally

### Prerequisites

- Node.js (LTS recommended)
- npm (or compatible package manager)
- MongoDB instance (local or remote)
- Python 3.10+ (if you want to run the Python RAG demo)

### 1. Backend Setup

```bash
cd backend
npm install

# create .env
cat > .env << 'EOF'
MONGODB_URI=mongodb://localhost:27017/agentrag
PORT=3000
PINECONE_API_KEY=your-pinecone-api-key
EOF

# start backend
npm run dev
```

Backend will be available at:

- Health check: `GET http://localhost:3000/`
- API base: `http://localhost:3000/api`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Vite dev server will typically run at `http://localhost:5173/` (or the next available port). The frontend is currently configured to work with simulated data; to integrate the backend, you would add Axios calls to the appropriate endpoints.

### 3. Python RAG Demo (Optional)

- Create and activate a Python virtual environment.
- Install dependencies similar to:

```bash
pip install langchain langchain-community langchain-text-splitters langchain-huggingface langchain-groq crewai crewai-tools faiss-cpu python-dotenv
```

- Add a `.env` file with your `GROQ_API_KEY`, `SERPER_API_KEY`, and `GEMINI_API_KEY`.
- Run:

```bash
cd backend/RAG
python main.py
```

---

## How to Extend / Integrate End‑to‑End

This repo is intentionally structured as a **prototype**. To make it fully production‑ready, you can extend it along these lines:

- **Wire Frontend to Backend**
  - Replace simulated data in `NotesPage`, `EditNote`, and `Chat` with Axios calls to:
    - `GET /api/notes/:userId`, `GET /api/note/:noteId`, `POST /api/note`, `PUT /api/note/:noteId`, `DELETE /api/note/:noteId`.
  - Add basic authentication and token storage to associate notes with real users.

- **Expose RAG/Chat Endpoint in Backend**
  - Create an endpoint such as `POST /api/chat/:noteId` that:
    - Loads the note content from MongoDB.
    - Either:
      - Calls the Python RAG service (via HTTP or a local process), or
      - Uses Pinecone helpers + an LLM SDK in Node to perform retrieval + generation.

- **Synchronize Notes with Pinecone / Vector DB**
  - When a note is created or updated:
    - Generate embeddings for its content.
    - Call `upsertVectors` to store/update vectors in Pinecone with metadata like `noteId`, `userId`.
  - When a note is deleted:
    - Call `deleteVectors` to remove its vectors.

- **Security & Production Hardening**
  - Hash user passwords (e.g., `bcrypt`) and add proper auth (JWT or session‑based).
  - Validate and sanitize inputs, add rate limiting and CORS configuration.
  - Add error reporting, logging, and observability as needed.

---

## Project Structure Overview

```text
AgentRAG/
├─ backend/
│  ├─ index.ts              # Express app + MongoDB connection + route mount
│  ├─ routes/
│  │  └─ routes.ts          # User and Notes REST APIs
│  ├─ model/
│  │  ├─ user.ts            # User schema (email, password, notes refs)
│  │  └─ notes.ts           # Notes schema (title, content, metadata)
│  ├─ pinecode.ts           # Pinecone client + index helpers
│  ├─ RAG/
│  │  ├─ main.py            # Python agentic RAG pipeline
│  │  └─ document.txt       # Sample document for vector DB
│  ├─ package.json          # Backend dependencies and scripts
│  └─ tsconfig.json         # TypeScript config for backend
│
├─ frontend/
│  ├─ index.html
│  ├─ src/
│  │  ├─ main.tsx           # React entrypoint
│  │  ├─ App.tsx            # Router configuration
│  │  ├─ pages/
│  │  │  ├─ option.tsx      # Landing: upload vs chat
│  │  │  ├─ notesPage.tsx   # Notes listing and actions
│  │  │  ├─ editNote.tsx    # Note view/edit UI
│  │  │  └─ chat.tsx        # Chat UI for RAG
│  │  ├─ store/
│  │  │  └─ store.tsx       # Zustand store for edit mode
│  │  ├─ components/ui/     # Button, card, input, label primitives
│  │  └─ styles/            # Page styles + color system README
│  ├─ package.json          # Frontend dependencies and scripts
│  └─ vite.config.ts        # Vite configuration
│
└─ README.md                # Project documentation (this file)
```

---

## License

This repository currently declares the **ISC** license in `backend/package.json`. If you plan to open‑source or distribute the entire project, you may want to add a top‑level `LICENSE` file and clarify licensing for frontend and Python components as well.