# OpenCode Dashboard — TODOs

Master task list for building the v2 web dashboard with Linear integration and agent monitoring.

Reference docs:
- `ARCHITECTURE.md` — system architecture, data flows, DB schema
- `Compound_eng.md` — original session log with known issues
- `.env.example` — all environment variables

---

## Phase 0: Fix Security Gaps (from Compound_eng.md audit)

> These are blocking. Nothing else ships until auth works.

- [ ] **0.1** Add `Authorization: Bearer <DASHBOARD_API_KEY>` middleware to all API routes
  - Create `src/lib/auth/middleware.ts`
  - Validate against `process.env.DASHBOARD_API_KEY`
  - Return 401 on missing/invalid token
  - Apply to: `/api/events` POST, `/api/todos` POST, `/api/messages` POST, `/api/sessions` POST
  - Read endpoints (GET) also require auth — dashboard is private
- [ ] **0.2** Fix CORS — replace `Access-Control-Allow-Origin: *` with allowlist
  - Read `ALLOWED_ORIGINS` from env, parse comma-separated
  - Check `Origin` header against allowlist, reflect matching origin
  - Fix invalid `localhost:*` header in `/api/events/route.ts` line 69
  - Apply to all 4 route files + all OPTIONS handlers
- [ ] **0.3** Add rate limiting to write endpoints
  - In-memory sliding window (no new deps needed for MVP)
  - Config from env: `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_REQUESTS`
  - Apply to POST endpoints only
- [ ] **0.4** Update `opencode-hook/dashboard-hook.ts` to send API key
  - Add `Authorization: Bearer ${process.env.DASHBOARD_API_KEY}` header to all fetch calls
  - Update hook README

---

## Phase 1: Auth System

- [ ] **1.1** Create `users` and `auth_sessions` tables in SQLite (see ARCHITECTURE.md schema)
- [ ] **1.2** Build `POST /api/auth/github` endpoint
   - Accept `{ code }` from OAuth flow
   - Exchange code for GitHub access token (server-side, keeps client_secret safe)
   - Upsert `users` row (github_id, username, avatar_url)
   - Create `auth_sessions` row with SHA-256 hashed bearer token
   - Return `{ token, user }` to client
- [ ] **1.3** Build `GET /api/auth/verify` endpoint
   - Accept bearer token, look up `auth_sessions`, check expiry
   - Return `{ valid: boolean, user }` — used by clients on app open
- [ ] **1.4** Replace API key middleware (from 0.1) with session token middleware
   - API key still valid for hook-to-backend (machine auth)
   - Session token valid for client-to-backend (user auth)
   - Middleware checks for either

---

## Phase 2: Real-Time (Replace Polling)

- [ ] **2.1** Add SSE endpoint: `GET /api/stream`
  - Server-Sent Events via Next.js route handler (`ReadableStream`)
  - Events: `todo:updated`, `message:created`, `agent:status`, `linear:synced`
  - Require auth (bearer token in query param for SSE, since no custom headers)
- [ ] **2.2** Create event bus in backend
  - In-memory EventEmitter (single-process; SQLite is single-process anyway)
  - API routes emit events on writes: `eventBus.emit('todo:updated', todo)`
  - SSE handler subscribes and pushes to connected clients
- [ ] **2.3** Web: SSE migration for `src/hooks/usePolling.ts`
- [ ] **2.4** Remove 3-second polling interval as default

---

## Phase 3: Agent Monitoring

> oh-my-opencode's `BackgroundManager` is the source of truth for sub-agents.
> OpenClaw is a single agent — it doesn't spawn sub-agents itself.
> The multi-agent spawning (explore, oracle, librarian, etc.) happens in oh-my-opencode.

- [ ] **3.1** Create `agents` and `agent_tasks` tables (see ARCHITECTURE.md schema)
- [ ] **3.2** Build agent registration hook for oh-my-opencode
  - Hook into `BackgroundManager.onSubagentSessionCreated` callback
  - On spawn: `POST /api/agents` with name, type, parent, skills, soul_md
  - On task start: `POST /api/agents/:id/tasks` with task details
  - On heartbeat: `PATCH /api/agents/:id` with `last_heartbeat`, progress
  - On complete/error: `PATCH /api/agents/:id/tasks/:taskId` with final status
- [ ] **3.3** Build `GET /api/agents` endpoint
  - Return all agents with current status, task, and unread message count
  - Filter by: `status`, `type` (primary/sub-agent), `parent_agent_id`
- [ ] **3.4** Build `GET /api/agents/:id` endpoint
  - Full agent profile: status, skills, soul_md, task history, sub-agents
- [ ] **3.5** Build agent action endpoints
   - `POST /api/agents/:id/sleep` — pause agent (Temporal sleep signal or BackgroundManager cancel)
   - `POST /api/agents/:id/stop` — cancel agent workflow
   - `POST /api/agents/:id/unblock` — send unblock signal
   - `POST /api/agents/:id/restart` — re-launch with same config
- [ ] **3.6** Track agent "age" — computed from `agents.created_at`
- [ ] **3.7** Track agent hierarchy — `parent_agent_id` for sub-agent tree view
- [ ] **3.8** Track OpenClaw <-> oh-my-opencode integration release status
  - Current blocker: upstream oh-my-opencode release for OpenClaw callback integration is not live yet
  - Once released, wire in the new run/integration flags and update hook docs + dashboard event flow

---

## Phase 4: Linear Integration

- [ ] **4.1** Install `@linear/sdk` and `@linear/sdk/webhooks`
- [ ] **4.2** Create `linear_projects`, `linear_issues`, `linear_workflow_states` tables (see ARCHITECTURE.md)
- [ ] **4.3** Build Linear OAuth flow (or use personal API key for MVP)
  - Store `linear_access_token` in `users` table (encrypted)
  - Scopes needed: `read`, `write`, `issues:create`
- [ ] **4.4** Build `POST /api/linear/webhook` endpoint
  - Verify webhook signature with `LinearWebhookClient` + `LINEAR_WEBHOOK_SECRET`
  - Handle: Issue created/updated/removed, Project updated, Cycle updated
  - Upsert into `linear_issues` / `linear_projects` tables
   - Emit SSE event for real-time web update
- [ ] **4.5** Build project sync: `POST /api/linear/sync`
  - Full sync: fetch all projects + issues via `linearClient.projects()`, `project.issues()`
  - Incremental: use `updatedAt` filter for delta sync
  - Run on: app startup, webhook gaps, manual trigger
- [ ] **4.6** Build card drag handler for kanban
   - Web drags card → `POST /api/linear/sync` with `{ issueId, newStateId }`
   - Backend calls `linearClient.updateIssue(id, { stateId })` + updates local cache
   - Optimistic update on web, confirm via SSE
- [ ] **4.7** Register Linear webhook programmatically
   - `webhookCreate` mutation with `resourceTypes: ["Issue", "Project", "Cycle"]`
   - Store webhook ID for cleanup
- [ ] **4.8** Link agents to Linear issues
   - When agent starts work on a Linear issue, set `linear_issues.agent_task_id`
   - Show agent avatar/name on kanban card in web dashboard

---

## Phase 5: Temporal Agent Orchestration

> This is the "agent-as-durable-workflow" layer. Makes agents survive crashes,
> adds retry/timeout, and enables the blocking/alerting/sleep logic.

- [ ] **5.1** Install Temporal TypeScript SDK: `@temporalio/client`, `@temporalio/worker`, `@temporalio/workflow`, `@temporalio/activity`
- [ ] **5.2** Run Temporal server (Docker or Temporal Cloud)
  - Dev: `docker compose up` with Temporal dev server
  - Prod: Temporal Cloud (managed) or self-hosted
- [ ] **5.3** Define `agentTaskWorkflow`
  ```
  Workflow lifecycle:
  1. Register agent in DB
  2. Start agent activity (spawn via BackgroundManager)
  3. Monitor loop:
     a. Poll agent state every 10s (heartbeat)
     b. If blocked → emit BLOCKED signal
     c. If completed → emit DONE signal
     d. If error → retry (up to 3x) or emit ERROR
  4. On BLOCKED: start alerting timer (priority-based)
  5. Wait for unblock signal from human (or timeout)
  6. On DONE/CANCELLED: update DB, notify parent
  ```
- [ ] **5.4** Define activities
   - `startAgentActivity` — launches agent via oh-my-opencode BackgroundManager
   - `monitorAgentActivity` — polls agent progress, heartbeats to Temporal
   - `sendNotificationActivity` — notification via backend
   - `updateDashboardActivity` — writes agent status to SQLite
- [ ] **5.5** Implement sleep/wake signals
  - `sleepSignal` — workflow pauses, agent Worker shuts down
  - `wakeSignal` — workflow resumes, agent Worker re-spawns
  - Exposed via `POST /api/agents/:id/sleep` and `POST /api/agents/:id/wake`

---

## Phase 6: Deterministic Alerting Logic

> When to message the user, how often, and through what channel.

- [ ] **6.1** Create `alert_rules` table (see ARCHITECTURE.md schema)
- [ ] **6.2** Define default alert rules:

  | Trigger | Priority | Delay | Channel | Description |
  |---------|----------|-------|---------|-------------|
  | `blocked` | high | 0ms (immediate) | push + in_app | Agent blocked, needs human input |
  | `blocked` | medium | 10 min | push + in_app | Blocked but not urgent |
  | `blocked` | low | 1 hour | in_app only | Low-priority block, batch later |
  | `error` | all | 0ms | push + in_app | Agent threw error |
  | `completed` | high | 0ms | in_app | High-priority task done |
  | `completed` | medium/low | batch (15 min) | in_app | Batched completion digest |
  | `idle_too_long` | all | 30 min | in_app | Agent idle with pending tasks |
  | `stale_task` | all | 2 hours | push | Task not progressing |

- [ ] **6.3** Implement Temporal timer-based alerting in `agentTaskWorkflow`
  ```
  On block detected:
    1. Write blocked_reason + blocked_at to agent_tasks
    2. Look up alert_rules for (trigger="blocked", priority=task.priority)
    3. Start Temporal condition timer: `await condition(() => !isBlocked, delay_ms)`
    4. If timer expires (still blocked) → fire notification
    5. If unblocked before timer → cancel notification, resume work
  ```
- [ ] **6.4** Implement notification batching for low-priority completions
  - Accumulate events in workflow state
  - Every 15 min, flush batch as single push notification
  - "3 tasks completed in the last 15 minutes"
- [ ] **6.5** Build `GET /api/settings/alerts` and `PUT /api/settings/alerts` endpoints
   - Web Settings reads and updates these

---

## Phase 7: Agent Lifecycle Logic

> When to spin up agents, when to mark blocked, when to sleep.

- [ ] **7.1** Spinning up temporal agents per-task
  ```
  When a new Linear issue is assigned to an agent (via webhook or manual):
    1. Create agent_task row (status: pending)
    2. Start Temporal agentTaskWorkflow with { taskId, issueId, agentConfig }
    3. Workflow spawns agent via BackgroundManager
    4. Agent picks up task, starts working
    5. Dashboard shows agent as "working" on that issue
  ```

- [ ] **7.2** When to mark task as "blocked" and assign to human
  ```
  Auto-detect blocked state when:
    a. Agent explicitly reports blocked (via hook event)
    b. Agent asks a question and waits (detected via message pattern)
    c. Agent hits 3 consecutive errors on same file/action
    d. Agent has been idle >5 min with in_progress task
    e. Agent requests a tool/resource it doesn't have access to

  On blocked:
    1. Set agent_tasks.status = "blocked"
    2. Set agent_tasks.blocked_reason = <detected reason>
    3. Set agent_tasks.blocked_at = now
    4. Fire Temporal blockDetectedSignal
    5. Alert rule timer starts (see Phase 6)
     6. Dashboard shows blocker card with [Unblock] button
  ```

- [ ] **7.3** How often to send messages (frequency control)
  ```
  Message frequency rules:
    - Urgent/high + blocked: immediate push + in-app
    - Medium + blocked: wait 10 min, then push
    - Low + blocked: wait 1 hour, then in-app only
    - Task completed: batch completions every 15 min
    - Errors: immediate push (always)
    - Progress updates: never push, in-app only, max 1 per task per 5 min
    - Idle warnings: in-app only, max 1 per agent per 30 min

  Anti-spam:
    - Max 10 push notifications per hour (across all agents)
    - Max 3 pushes per agent per hour
    - Batch mode: if >5 events in 1 min, switch to digest
  ```

- [ ] **7.4** When to "sleep" (stop working on new tasks)
  ```
  Sleep triggers:
    a. User taps "Sleep" on agent profile (manual)
    b. All assigned tasks completed and no new tasks queued
    c. Repeated failures (>5 errors in 10 min) — auto-sleep + alert user
    d. Resource limit hit (API rate limit, token budget exceeded)
    e. Scheduled sleep window (e.g., 2am-6am to save power on Mac Mini)
     f. User sends "Do Not Disturb" signal from dashboard

   Sleep behavior:
     1. Agent finishes current atomic operation (don't interrupt mid-commit)
     2. Sets agent.status = "sleeping"
     3. Temporal workflow pauses via condition(() => !isSleeping)
     4. Worker optionally shuts down (saves compute)
     5. Dashboard shows sleeping indicator

  Wake triggers:
    a. User taps "Wake" on agent profile
    b. New high-priority task assigned
    c. Scheduled wake time reached
    d. Unblock signal received for a blocked task
  ```

---

## Phase 9: Web Dashboard Updates

- [ ] **9.1** Add agent monitoring panel to web dashboard
- [ ] **9.2** Add Linear kanban view (project selector + board)
- [ ] **9.3** Replace polling with SSE on web
- [ ] **9.4** Add login page (GitHub OAuth)

---

## Phase 10: Testing and Hardening

- [ ] **10.1** API tests: auth middleware, CORS, rate limiting
- [ ] **10.2** Integration tests: hook → API → DB → SSE → web flow
- [ ] **10.3** Linear webhook signature verification test
- [ ] **10.4** Temporal workflow tests: block → alert → unblock cycle
- [ ] **10.5** Load test: 100 concurrent agents posting updates

---

## Dependency Map

```
Phase 0 (Security)
  └──> Phase 1 (Auth) ──> Phase 2 (SSE)  ──> Phase 3 (Agents) ──> Phase 5 (Temporal)
                                                                      └──> Phase 6 (Alerting)
                                                                      └──> Phase 7 (Lifecycle)
                          ──> Phase 4 (Linear) ──> Phase 9 (Web)
All ──> Phase 10 (Testing)
```

Critical path: **0 → 1 → 2 → 3 → 4 → 9** (gets a working web dashboard with agents + Linear)

Temporal (5/6/7) can be added incrementally — agents work without it, they just lack durable retry and smart alerting.
