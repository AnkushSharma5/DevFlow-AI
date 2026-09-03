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
- **Granular Task Tracking**: Tasks linked directly to projects with status (`TODO`, `IN_PROGRESS`, `DONE`), priority levels (`LOW`, `MEDIUM`, `HIGH`), and optional due dates with overdue notifications.
- **Interactive Kanban Board**:
  - 3-column workflow (`TODO`, `IN_PROGRESS`, `DONE`).
  - Fluid drag-and-drop powered by `@hello-pangea/dnd` with optimistic UI updates.
  - Built-in status dropdown fallback on every card for accessibility and device flexibility.
  - Automatic persistence to MongoDB immediately on drag/drop or status change.

### 2. 📊 Developer Dashboard
- Real-time productivity metrics: Total Projects, Total Tasks, Completed vs Pending, In Progress, and High Priority counts.
- Visual completion percentage bar for each project.
- Priority distribution cards.

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
                                     (model: gemini-1.5-flash)     (model: gpt-4o)
```

### AI Flow Breakdown:
1. **User interaction**: React frontend dispatches an action to `api.js`.
2. **Express Endpoint**: Express validates user JWT via `authMiddleware` and input payload via `express-validator`.
3. **AI Service Abstraction (`server/services/aiService.js`)**:
   - Single central gateway for LLM calls.
   - Zero LLM logic inside controllers or routes.
   - Provider-agnostic: Reads `AI_PROVIDER` from environment. Defaults to **Google Gemini** (`gemini-1.5-flash`), seamlessly switchable to **OpenAI** (`gpt-4o`) with one `.env` change.
   - Formats strict prompt schemas requesting typed JSON responses.
4. **Resilient Parsing**: Validates and extracts JSON output, handling markdown fences and unexpected tokens.
5. **Client Presentation**: React renders parsed responses into styled sections (never raw text dumps).

---

## 💻 Tech Stack

- **Frontend**: React 18, Vite, React Router v6, React Context + `useReducer`, `@hello-pangea/dnd`, Vanilla CSS Design System.
- **Backend**: Node.js, Express.js, Mongoose 8, JWT (`jsonwebtoken`), `bcryptjs`, `express-validator`, CORS.
- **AI Providers**: `@google/generative-ai` (Gemini API) and `openai` SDK.
- **Database**: MongoDB (Local or MongoDB Atlas).

---

## 📁 Project Structure

```
DevFlow-AI/
├── .env.example               # Template for environment configuration
├── .gitignore                 # Standard Node/React/IDE ignore rules
├── package.json               # Root scripts (concurrent dev runner)
├── README.md                  # Detailed documentation
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
- **Node.js**: v18 or higher (v20+ recommended)
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

Create a `.env` file in the `server/` directory (you can copy `.env.example`):
```env
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/devflow

# Authentication Secret
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# AI Configuration
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here

# Client URL (for CORS)
CLIENT_ORIGIN=http://localhost:5173
```

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

---

## 🔒 Security Best Practices Implemented

- **Password Hashing**: Bcrypt with salt factor 12 via Mongoose pre-save hooks.
- **Data Sanitization**: Overridden `toJSON()` on User model ensures `passwordHash` is never serialized in any API response.
- **Protected Endpoints**: All project, task, and AI routes are guarded with JWT Bearer validation.
- **Leak-Proof Error Handling**: AI provider error handler strips sensitive environment variables, internal trace logs, and API key references before responding to clients.
- **CORS Configuration**: Restricted to explicit client origins.

---

## 🔮 Future Improvements

- Automated GitHub/GitLab repository sync for commit-linked tasks.
- WebSocket support for real-time multi-window updates.
- Exporting documentation directly to Markdown / PDF files.
