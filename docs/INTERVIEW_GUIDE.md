# DevFlow AI Interview Guide

## 1. Sixty-second explanation

DevFlow AI is a full-stack workspace for managing projects and tasks with a Kanban board and four optional AI developer tools. The React client talks to an Express API; MongoDB stores users, projects, and tasks. The API authenticates requests with expiring JWTs, hashes passwords with bcrypt, and scopes project and task queries to the signed-in user. AI calls stay on the server behind a provider adapter for Gemini and OpenAI. AI inputs are bounded, requests are rate-limited per user, and responses are checked against feature-specific JSON shapes before the client renders them. The automated tests cover the HTTP routes with isolated model fakes, so database behavior and live AI availability still need separate integration verification.

## 2. Architecture and request flow

1. The React app loads the saved bearer token and calls `GET /api/auth/me` before opening protected routes.
2. Axios sends the token in the `Authorization` header. In development, Vite forwards `/api` to Express; deployments can set `VITE_API_BASE_URL` at build time.
3. Express parses bounded request bodies, checks the JWT and user record, validates request fields, and calls a controller.
4. Controllers scope project and task reads and writes to the authenticated user. Mongoose models validate stored fields and hold references between users, projects, and tasks.
5. AI controllers call the backend-only `aiService`. The service dispatches to the configured provider and checks the returned structure before sending it to React.

## 3. Authentication and password hashing

- Registration normalizes email and accepts passwords with at least 8 characters and no more than 72 UTF-8 bytes, matching bcrypt's effective input limit.
- The User model hashes `passwordHash` with bcryptjs and a salt factor of 12 before saving. Login compares the submitted password to the hash.
- JWTs contain the user ID and use `JWT_EXPIRES_IN` (default `7d`). Startup rejects a missing, placeholder, shorter-than-32-byte, or highly repetitive `JWT_SECRET`; generate a random secret as shown in the README. The checks catch common weak values but cannot prove randomness.
- Protected API middleware verifies the token and reloads the user. Deleted or invalid accounts cannot continue using a token.
- The browser stores the bearer token in `localStorage`. An XSS vulnerability could read it; JWT does not prevent XSS. The app renders model text as React text rather than inserting raw HTML.
- A temporary network or server failure during session verification keeps the token and shows a retry state. Invalid or expired tokens clear it.

## 4. MongoDB schema and ownership

- `User` stores a unique normalized email, name, and hidden password hash.
- `Project` has a `userId` reference. Project list and mutation queries include that owner ID.
- `Task` has both `projectId` and `userId`, plus status, priority, due date, and per-column order. Task queries include the owner ID, and task creation first verifies project ownership.
- MongoDB references are not foreign-key constraints. Task mutations and project deletion share a per-project lock within one process, which prevents same-process orphan creation during the cascade. The two database writes are not a transaction, and the lock is not shared by multiple server instances, so database failures or multi-instance races still need a transactional or shared-lock solution.

## 5. REST routes and status codes

| Route | Purpose |
| --- | --- |
| `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | Account creation, login, and token verification |
| `/api/projects` | List and create owned projects; `/:id` reads, partially updates, or deletes one |
| `/api/tasks?projectId=:id` | List tasks in an owned project; task routes create, read, update, or delete tasks |
| `PATCH /api/tasks/:id/status` | Change task status and optionally its order in a column |
| `POST /api/ai/breakdown`, `/explain`, `/debug`, `/docs` | Run one of the four AI tools |
| `GET /api/health` | Report API and MongoDB connection state |

The API uses `201` for creation, `400` for invalid input or IDs, `401` for invalid authentication, `404` when an owned resource is unavailable, `429` for an AI request limit, and `502` for an invalid provider response. AI provider outages and a disconnected database health check return `503`.

## 6. Kanban persistence and optimistic UI

The board groups tasks by status and orders each column by `order`. A drag sends the destination status and index to the status endpoint. The server loads the source and destination tasks, recalculates dense positions, and writes changed positions in a bulk operation. The client updates the displayed order immediately and restores its previous task list if the request fails. A status dropdown moves a task to the end of its new column.

Concurrent reorder requests within one process are serialized by the project lock, and MongoDB bulk writes are not wrapped in a transaction. The lock does not coordinate multiple server instances; a multi-instance deployment needs shared synchronization or an atomic ordering strategy.

## 7. AI provider abstraction and response validation

`server/services/aiService.js` owns provider selection. Gemini is the default (`gemini-3.5-flash-lite`); OpenAI uses `gpt-6-luna` unless `OPENAI_MODEL` is set. Provider keys are read only on the backend. Both clients use request timeouts. The API bounds each prompt field and limits each authenticated user to 10 AI requests per minute per server process.

The service parses JSON returned directly, in a markdown fence, or with surrounding text. It then validates the required fields and types for that feature. Task breakdowns require 4–10 non-empty subtasks. Invalid provider output returns a safe `502` response. The normal tests mock AI results. An opt-in live integration test exercises all four provider routes when explicitly configured; it does not verify provider behavior unless that test runs successfully.

## 8. Errors, rate limits, and secret management

- Startup requires `MONGO_URI` and a non-placeholder `JWT_SECRET` of at least 32 bytes and 12 distinct bytes; generate it with the random-secret command in the README. The server waits for MongoDB before it listens and does not switch to an in-memory database.
- `CLIENT_ORIGIN` controls the allowed browser origin. The Vite client uses `/api` locally and can be built with an absolute `VITE_API_BASE_URL` for a separate API origin.
- Request bodies are capped at 1 MB; project, task, authentication, and AI fields have individual bounds.
- Client-facing server errors are generic. AI prompts, pasted source code, and stack traces are not logged.
- The process-local limits are 10 AI requests per user per minute, 10 login attempts per IP per 15 minutes, and 20 registrations per IP per hour. They reset on restart and do not share state between servers. Set `TRUST_PROXY_HOPS` to the verified number of hosting proxies so login and registration limits use the client IP; multi-instance deployments also need shared rate-limit storage.
- Keep `server/.env` untracked. Never place provider keys in `VITE_` variables because those values are bundled into browser code.

## 9. Failure scenarios

1. **Expired or tampered JWT:** Protected routes return `401`; the client clears the token and returns to login.
2. **Temporary API outage during page refresh:** The client keeps the saved token and displays a retry action rather than treating the session as invalid.
3. **MongoDB is unavailable at startup:** The server logs a sanitized message and exits without opening an API listener. Health reports `503` while no database connection is active.
4. **AI key missing or provider throttled:** The API returns a safe `503` or `429`; no fake successful response is substituted.
5. **AI returns malformed or incomplete JSON:** Schema parsing rejects the response and returns `502` without exposing provider details.

Same-process task reorder and project deletion races are serialized. Multi-instance races and partial failures during the non-transactional project cascade remain limitations.

## 10. Interview questions and answers

1. **Why keep both `projectId` and `userId` on a task?** `projectId` locates its parent; `userId` makes ownership filtering direct. Creation still checks that the user owns the project.
2. **What prevents a user from changing an ID to access another account's data?** Each sensitive query includes the authenticated user ID, and task creation verifies parent project ownership.
3. **Why hash passwords in a Mongoose hook?** It centralizes hashing for document saves, so controllers do not need to handle salts or store plaintext.
4. **Why cap passwords at 72 UTF-8 bytes?** bcrypt only incorporates up to that many input bytes; accepting longer values could make distinct passwords compare as the same prefix.
5. **What does the JWT contain, and how is it invalidated?** It contains a user ID and expiry. Each request reloads the user, so deleted accounts stop working; there is no server-side token revocation list.
6. **What is the trade-off of localStorage token storage?** It avoids automatic cookie transmission, but XSS can read the token. A secure cookie architecture would need CSRF defenses and different client handling.
7. **Why return `404` for a resource owned by somebody else?** It avoids confirming that another user's project or task ID exists.
8. **Why use `PATCH` for task status?** The Kanban action changes a small part of a task and can optionally update its column position.
9. **How does task ordering work?** The server computes new consecutive indices for the affected source and destination columns and writes only changed values.
10. **Are concurrent reorder operations safe?** Requests handled by one Node.js process are serialized by project. Multiple server instances do not share that lock, so a distributed lock, transaction, or atomic fractional-order scheme is needed when scaling horizontally.
11. **What happens if project deletion fails halfway through?** Same-process task writes are serialized with the cascade, but the task deletion and project deletion are not transactional. A database failure can leave the project without some or all of its tasks.
12. **How does the AI provider abstraction help?** Controllers call one service API, while provider selection, model configuration, timeouts, and response parsing stay in one backend module.
13. **How are AI outputs made safe for the client?** The server validates required fields and types, and React renders the resulting text as text nodes rather than HTML.
14. **What happens if an AI provider returns a rate limit or malformed output?** Provider `429` errors return `429`; schema failures return `502`; other provider outages return `503` with safe messages.
15. **What do the current tests prove, and what do they not prove?** They verify HTTP routes with in-process model fakes, ownership checks, validation, ordering, and parser behavior. They do not verify real MongoDB persistence, transaction semantics, browser interaction, or live AI calls.
