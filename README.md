# ⚡ DevFlow AI — AI-Powered Developer Productivity Platform

A portfolio-grade full-stack MERN application combining developer task/project management (Trello/Jira-style Kanban board) with backend-mediated AI developer assistance (Task Breakdown, Code Explainer, AI Debugger, and Documentation Generator).

---

## 📌 Problem Statement

Solo developers and engineers working on personal/side projects often struggle with context switching between project management tools and external AI assistants. Existing tools are either bloated enterprise systems (Jira) or disconnected chat bots that require copy-pasting back and forth.

**DevFlow AI** bridges this gap: a lightweight, responsive project workspace that embeds AI-assisted task breakdown, automated debugging analysis, code explanations, and documentation generators directly into your project workflow.

---

## ✨ Features

### 1. 🗂️ Project & Task Management
- **Project Workspaces**: Full CRUD operations for projects with status tags (`ACTIVE`, `ON_HOLD`, `COMPLETED`, `ARCHIVED`).
- **Granular Task Tracking**: Tasks linked directly to projects with status (`TODO`, `IN_PROGRESS`, `DONE`), priority levels (`LOW`, `MEDIUM`, `HIGH`), and optional due dates with a visible overdue indicator.
- **Interactive Kanban Board**:
  - 3-column workflow (`TODO`, `IN_PROGRESS`, `DONE`).
  - Fluid drag-and-drop powered by `@hello-pangea/dnd` with optimistic UI updates.
  - Built-in status dropdown fallback on every card for accessibility and device flexibility.
  - Automatic persistence to MongoDB immediately on drag/drop or status change.

### 2. 📊 Developer Dashboard
- Dashboard totals and project completion percentages calculated from the current API data loaded by the page.
- Visual completion percentage bar for each project.
- A high-priority task count, along with completed, pending, in-progress, and total task counts, plus priority distribution cards.

### 3. 🧠 Backend-Mediated AI Developer Assistance
All AI requests are strictly backend-mediated. **Frontend clients never see or touch the LLM API key**.
1. **Task Breakdown**: Enter a high-level feature or user story (e.g. *"Build a JWT authentication system"*). DevFlow generates an ordered checklist of subtasks with one-click addition into your project's Kanban board.
2. **Code Explainer**: Input language + code snippet. Generates structured output with three clean sections: *Explanation*, *Key Logic*, and *Potential Issues/Edge Cases*.
3. **AI Debugger**: Input language + buggy code + stack trace/error. Returns *Possible Cause*, *Why It Happened*, *Suggested Fix*, and *Corrected Code* along with an engineer disclaimer.
4. **Documentation Generator**: Turns snippets or project specs into structured documentation (*Description, Usage, Parameters, Setup, API Notes, Example*) with a one-click **Copy All** button.

---

## 🏗️ Architecture & AI Request Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 React Client (Vite + CSS)                   │
│   • Global AuthContext & ProjectContext (useReducer)        │
│   • Axios API Client with JWT Bearer Interceptor            │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST API (/api/...)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Express Backend (Node.js)                   │
│   • Middleware: JWT Auth, Input Validation, Error Handler   │
│   • Controllers: Auth, Project, Task, AI                    │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      MongoDB Database        │ │       aiService.js         │
│   • Users (bcrypt hashing)   │ │  (Provider Abstraction)    │
│   • Projects                 │ └──────────────┬─────────────┘
│   • Tasks (foreign ref)      │                │
└──────────────────────────────┘                ├────────────────────────┐
                                                ▼                        ▼
                                     Google Gemini API (Default)    OpenAI API
                                     (model: gemini-3.5-flash-lite) (model: gpt-6-luna)
```

### AI Flow Breakdown:
1. **User interaction**: React frontend dispatches an action to `api.js`.
2. **Express Endpoint**: Express validates user JWT via `authMiddleware` and input payload via `express-validator`.
3. **AI Service Abstraction (`server/services/aiService.js`)**:
   - Single central gateway for LLM calls.
   - Zero LLM logic inside controllers or routes.
   - Provider-agnostic: Reads `AI_PROVIDER` from the server environment. Defaults to **Google Gemini** (`gemini-3.5-flash-lite`) and can use **OpenAI** (`gpt-6-luna`).
   - Requests structured JSON and applies feature-specific response shape checks before returning model output.
4. **Response Parsing**: Handles a JSON object inside markdown fences or surrounding text, then rejects missing fields and malformed values.
5. **Client Presentation**: React renders parsed responses into styled sections (never raw text dumps).

---

## 💻 Tech Stack

- **Frontend**: React 18, Vite, React Router v7, React Context + `useReducer`, `@hello-pangea/dnd`, Vanilla CSS Design System.
- **Backend**: Node.js, Express.js, Mongoose 8, JWT (`jsonwebtoken`), `bcryptjs`, `express-validator`, CORS.
- **AI Providers**: `@google/genai` (Gemini API) and `openai` SDK.
- **Database**: MongoDB (Local or MongoDB Atlas).

---

## 📁 Project Structure

```
DevFlow-AI/
├── .env.example               # Template for environment configuration
├── .gitignore                 # Standard Node/React/IDE ignore rules
├── package.json               # Root scripts (concurrent dev runner)
├── README.md                  # Detailed documentation
├── docs/
│   └── INTERVIEW_GUIDE.md     # Architecture, security, failure modes, interview Q&A
│
├── client/                    # React Frontend
│   ├── index.html             # HTML5 template with Inter font
│   ├── package.json           # Frontend dependencies
│   ├── vite.config.js         # Vite configuration with /api proxy
│   └── src/
│       ├── main.jsx           # App entry
│       ├── App.jsx            # Router and Provider tree
│       ├── index.css          # Design system & CSS custom properties
│       ├── services/
│       │   └── api.js         # Axios instance with auth interceptor
│       ├── context/
│       │   ├── AuthContext.jsx       # User state & JWT persistence
│       │   └── ProjectContext.jsx    # Projects CRUD state
│       ├── components/
│       │   ├── Navbar.jsx            # Top navigation bar
│       │   ├── Sidebar.jsx           # Workspace sidebar navigation
│       │   ├── ProjectCard.jsx       # Project display with progress bar
│       │   ├── TaskCard.jsx          # Draggable Kanban card
│       │   ├── KanbanBoard.jsx       # 3-column Drag-and-drop board
│       │   ├── TaskModal.jsx         # Create & Edit task dialog
│       │   ├── DashboardCard.jsx     # Statistic metric card
│       │   ├── AIInput.jsx           # Dynamic input form for AI tools
│       │   ├── AIResponse.jsx        # Structured response formatter
│       │   ├── LoadingSpinner.jsx    # Accessible loading indicator
│       │   └── ProtectedRoute.jsx    # Auth route guard
│       └── pages/
│           ├── Login.jsx             # User sign-in
│           ├── Register.jsx          # User registration
│           ├── Dashboard.jsx         # High-level overview & stats
│           ├── Projects.jsx          # Project catalog & creation
│           ├── ProjectDetails.jsx    # Project board & task manager
│           ├── KanbanBoard.jsx       # Full-screen Kanban workspace
│           ├── AITools.jsx           # 4 AI productivity tools
│           └── Settings.jsx          # Profile & integration info
│
└── server/                    # Node.js + Express Backend
    ├── package.json           # Backend dependencies
    ├── server.js              # Express app initialization & error handling
    ├── .env                   # Server environment secrets
    ├── config/
    │   └── db.js              # Mongoose database connection
    ├── models/
    │   ├── User.js            # User schema with bcrypt pre-save & toJSON sanitization
    │   ├── Project.js         # Project schema with timestamps & user ref
    │   └── Task.js            # Task schema with status, priority, order, and project ref
    ├── middleware/
    │   ├── authMiddleware.js  # JWT Bearer validation
    │   ├── validation.js      # express-validator result handler
    │   └── errorHandler.js    # Global centralized error handler
    ├── controllers/
    │   ├── authController.js  # Register, Login, Me
    │   ├── projectController.js # Projects CRUD with cascade task deletion
    │   ├── taskController.js  # Tasks CRUD with status patch
    │   └── aiController.js    # Mediation and error sanitization for AI
    ├── routes/
    │   ├── auth.js            # /api/auth
    │   ├── projects.js        # /api/projects
    │   ├── tasks.js           # /api/tasks
    │   └── ai.js              # /api/ai
    └── services/
        └── aiService.js       # Central AI abstraction layer (Gemini/OpenAI)
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20.19+ or v22.12+ (required by the current Vite toolchain)
- **MongoDB**: Either a local MongoDB instance running on `localhost:27017` or a free MongoDB Atlas connection string.
- **AI API Key**: Free Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey) (or OpenAI API Key).

### 1. Installation

Install all dependencies (root, server, and client) with a single command:
```bash
# In the repository root
npm run install:all
```
Or install each individually:
```bash
cd server && npm install
cd ../client && npm install
```

### 2. Environment Configuration

Copy the root template to `server/.env`, then replace the JWT and provider key placeholders:
```powershell
# In PowerShell from the repository root:
Copy-Item .env.example server/.env
```

```bash
# In bash from the repository root:
# cp .env.example server/.env
```

Edit `server/.env` after copying it. Its settings should look like:

```env
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/devflow

# Authentication Secret
JWT_SECRET=replace-with-at-least-32-random-bytes
JWT_EXPIRES_IN=7d

# AI Configuration
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite

# Client URL (for CORS)
CLIENT_ORIGIN=http://localhost:5173
```

The server exits before listening if `JWT_SECRET` is missing, a placeholder, shorter than 32 bytes, or has fewer than 12 distinct bytes, or if `MONGO_URI` is missing or invalid. This catches common weak values but cannot prove that a secret was generated randomly. It does not silently switch to an in-memory database. Generate a JWT secret with `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`.

The browser API defaults to the Vite development proxy at `/api`. For deployment on a separate API origin, set `VITE_API_BASE_URL=https://api.example.com/api` in the client build environment. Set `CLIENT_ORIGIN` on the backend to the exact deployed browser origin. See [client/.env.example](client/.env.example) for client settings.

The API trusts no reverse proxies by default. If the backend is behind a fixed number of trusted proxies, set `TRUST_PROXY_HOPS` to that count (for example, `1` for one proxy). Configure this from the hosting provider's network topology; forwarded client IP headers are used for registration and login rate limits.

### 3. Running the Application

From the root directory, start both the backend and frontend concurrently:
```bash
npm run dev
```

Alternatively, run them in separate terminals:
```bash
# Terminal 1: Backend Server (Port 5000)
cd server
npm run dev

# Terminal 2: Frontend Client (Port 5173)
cd client
npm run dev
```

Open your browser and navigate to: **`http://localhost:5173`**

## 🚀 Deployment

The application can be deployed as a Node.js API service plus a static frontend. No hosting provider or auto-deploy workflow is configured in this repository.

- **API service**: use `server/` as the service root, install with `npm ci --omit=dev`, and start with `npm start`. Configure `NODE_ENV=production`, `MONGO_URI`, a generated `JWT_SECRET`, `CLIENT_ORIGIN` set to the frontend's HTTPS origin, and `TRUST_PROXY_HOPS` set to the provider's verified proxy count. Add the key for the selected AI provider if AI tools should be available.
- **Frontend static site**: use `client/` as the service root, install with `npm ci`, build with `npm run build`, and publish `dist/`. Set `VITE_API_BASE_URL=https://<api-host>/api` at build time. Configure the host to serve `index.html` for client routes such as `/dashboard` on refresh. The API URL is public in the browser bundle; never place provider keys in `VITE_` variables.
- Configure HTTPS and persistent MongoDB storage at the hosting provider. A successful client build does not verify either service or live AI behavior.

---

## 🔒 Security Best Practices Implemented

- **Password Hashing**: Bcrypt with salt factor 12 via Mongoose pre-save hooks.
- **Data Sanitization**: Overridden `toJSON()` on User model ensures `passwordHash` is never serialized in any API response.
- **Protected Endpoints**: Project, task, and AI routes require a verified JWT. Project and task queries include the authenticated owner ID.
- **Input Limits**: Request bodies, task/project fields, AI inputs, password size, and AI request frequency have limits.
- **Safe Errors**: Server errors returned to clients use generic messages. AI prompts and pasted source are not written to application logs.
- **CORS Configuration**: The API allows the configured `CLIENT_ORIGIN` (defaulting to the local Vite origin for development).
- **JWT Storage Trade-off**: The browser stores the bearer token in `localStorage`. This avoids automatic cookie transmission, but an XSS flaw could read and exfiltrate the token. JWT does not prevent XSS; use a restrictive content policy and careful rendering if deploying publicly.

Rate limits are process-local: 10 AI requests per authenticated user per minute, 10 login attempts per IP per 15 minutes, and 20 registrations per IP per hour. They reset on restart and do not coordinate across multiple server instances. Configure trusted proxies deliberately and use shared rate-limit storage for a multi-instance deployment.

## 🧪 Tests and Build

From the repository root:

```bash
npm test
npm run test:api
cd client && npm run build
```

`npm test` runs the complete Node test suite, including the client utility and server service tests. `npm run test:api` runs the HTTP API tests and an opt-in live integration test. The regular API tests start an ephemeral local HTTP server and replace database model methods with isolated in-memory fakes. The live test runs only when `RUN_LIVE_INTEGRATION=1` and `TEST_MONGO_URI` points to a dedicated `devflow_test` database; it uses the selected AI provider key from `server/.env`, exercises the auth/project/task routes and all four AI tools, then removes its test user's data. Without those explicit settings it is skipped. The automated suite does not prove MongoDB transaction behavior, cloud deployment, browser rendering, or live provider availability unless the opt-in test is configured and passes.

See the [interview guide](docs/INTERVIEW_GUIDE.md) for the request flow, security trade-offs, failure scenarios, and interview questions.

To check backend JavaScript syntax in PowerShell:

```powershell
Get-ChildItem server -Recurse -File -Filter *.js |
  Where-Object { $_.FullName -notmatch '\\node_modules\\' } |
  ForEach-Object { node --check $_.FullName }
node --check client/vite.config.js
```

## 🔌 API Routes

All routes except registration, login, and health require `Authorization: Bearer <token>`.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account |
| `POST` | `/api/auth/login` | Return a JWT and public user |
| `GET` | `/api/auth/me` | Verify the current token |
| `GET`, `POST` | `/api/projects` | List or create owned projects |
| `GET`, `PUT`, `DELETE` | `/api/projects/:id` | Read, partially update, or delete an owned project |
| `GET` | `/api/tasks?projectId=:id` | List tasks in an owned project |
| `POST` | `/api/tasks` | Create a task in an owned project |
| `GET`, `PUT`, `DELETE` | `/api/tasks/:id` | Read, partially update, or delete an owned task |
| `PATCH` | `/api/tasks/:id/status` | Change status and optional column position |
| `POST` | `/api/ai/breakdown`, `/explain`, `/debug`, `/docs` | Run the corresponding backend-mediated AI tool |
| `GET` | `/api/health` | Report API and MongoDB connection state |

## ⚠️ Known Limits

- Dashboard values reflect the data fetched when the page loads; they are not live metrics or telemetry.
- The API test suite uses in-memory model fakes, so actual MongoDB queries and failure modes still need verification against a disposable test database.
- Task creation, updates, deletion, Kanban reorder operations, and project deletion are serialized per project within one Node.js process. This prevents same-process task creation from racing a project cascade and avoids same-process order writes interleaving. The lock is not shared across multiple processes or server instances. The cascade is also not a MongoDB transaction: a database failure during the two-step delete can leave a project without some or all of its tasks. Multi-instance deployments need a shared lock or transactional update strategy.
- Live Gemini/OpenAI behavior was not exercised by the automated tests. A valid provider key, network access, provider quota, and deployed model availability are required to verify those integrations.

---

## 🔮 Future Improvements

- Automated GitHub/GitLab repository sync for commit-linked tasks.
- WebSocket support for real-time multi-window updates.
- Exporting documentation directly to Markdown / PDF files.
- Shared rate-limit storage and transactional task/project updates for multi-instance deployments.
