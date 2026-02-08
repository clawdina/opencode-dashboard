# OpenCode Dashboard

Real-time Kanban board and encrypted message feed for tracking oh-my-opencode agent work.

## Features

- **Kanban Board**: Drag-and-drop task management with status columns (Pending, In Progress, Completed)
- **Encrypted Messages**: All notifications are encrypted at rest using NaCl secretbox
- **Real-time Updates**: Automatic polling every 3 seconds
- **Dark Mode**: Full dark mode support on web and mobile
- **Cross-platform**: Next.js web app + React Native mobile app
- **oh-my-opencode Integration**: Hook to send agent updates to the dashboard

## Quick Start

### 1. Configure environment

```bash
cp .env.example .env.local
# Then edit .env.local — at minimum, set DASHBOARD_API_KEY:
#   openssl rand -hex 32
```

### 2. Web Dashboard

```bash
bun install
bun run dev
```

Visit http://localhost:3000

### 3. Mobile App

```bash
cd mobile
bun install
bun run ios    # or bun run android
```

### 4. oh-my-opencode Integration

Copy the hook to your oh-my-opencode hooks directory:

```bash
cp opencode-hook/dashboard-hook.ts ~/.opencode/hooks/
```

Set the dashboard URL and API key on the agent machine:

```bash
export DASHBOARD_URL=http://127.0.0.1:3000
export DASHBOARD_API_KEY=<same-key-from-env.local>
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events` | POST | Receive events from oh-my-opencode |
| `/api/todos` | GET | Get all todos (filterable by session_id, status) |
| `/api/todos` | POST | Create or update a todo |
| `/api/messages` | GET | Get all messages (filterable by unread_only) |
| `/api/messages` | POST | Mark messages as read |
| `/api/sessions` | GET/POST | Manage sessions |

## Data Storage

- **Database**: SQLite at `~/.opencode-dashboard/data.db`
- **Encryption Key**: NaCl key at `~/.opencode-dashboard/key` (chmod 600)

## Tech Stack

**Web**: Next.js 16, TypeScript, Tailwind CSS, @dnd-kit, Zustand, better-sqlite3, tweetnacl

**Mobile**: Expo, React Native, TypeScript, Zustand, expo-notifications

---

## Security Hardening Checklist

> **Status**: This is an MVP. The items below must be addressed before any non-localhost deployment.

### Critical (must fix before use)

- [ ] **Add API authentication** — All write endpoints (`POST /api/events`, `/api/todos`, `/api/sessions`) accept unauthenticated requests. Add `Authorization: Bearer <DASHBOARD_API_KEY>` validation middleware. The key is defined in `.env.local`.
- [ ] **Fix CORS** — Every route currently returns `Access-Control-Allow-Origin: *`. Replace with the `ALLOWED_ORIGINS` allowlist from `.env.local`. The events route also has an invalid header value (`localhost:*`).
- [ ] **Bind to loopback only** — Run the server with `HOST=127.0.0.1` so it never listens on LAN/public interfaces. Access remotely only through SSH tunnel or Tailscale.

### High (should fix before daily use)

- [ ] **Add rate limiting** — No rate limiting exists on any endpoint. Use `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS` from `.env.local`. Protect POST endpoints at minimum.
- [ ] **Validate the opencode-hook contract** — The hook in `opencode-hook/dashboard-hook.ts` was written speculatively. Verify its interface against the actual oh-my-opencode hook API before relying on it.
- [ ] **Add the API key to the hook** — The hook currently POSTs without any auth header. Once API auth middleware is added, update the hook to send `Authorization: Bearer ${process.env.DASHBOARD_API_KEY}`.

### Medium (recommended)

- [ ] **Replace polling with WebSockets/SSE** — The dashboard polls every 3 seconds. Server-Sent Events or WebSockets would reduce latency and server load.
- [ ] **Encryption key management** — The NaCl key is stored as plaintext base64 at `~/.opencode-dashboard/key`. On macOS, consider storing it in Keychain. At minimum, verify the file is `chmod 600` and the directory is `chmod 700`.
- [ ] **Implement push notifications** — `expo-notifications` is imported in the mobile app but never wired up. Add Firebase Cloud Messaging or APNs for real alerts.
- [ ] **Batch todo sync** — `syncTodos()` in the hook sends sequential HTTP requests per todo. Batch into a single POST.

### Low (nice to have)

- [ ] **Migrate to PostgreSQL** — SQLite works for single-instance, but PostgreSQL is needed for multi-device or multi-agent setups.
- [ ] **Add offline caching** — Mobile app has no offline support. Add local storage with sync-on-reconnect.
- [ ] **Audit logging** — Log auth failures, rate limit hits, and unusual patterns to a separate file/table.

---

## Secure Remote Access (Mac Mini Deployment)

If running the dashboard on a headless Mac Mini, **never expose port 3000 publicly**. Use one of:

### Option A: SSH Tunnel (simplest)

```bash
# From your laptop — forwards laptop:3000 to mini's loopback:3000
ssh -N -L 3000:127.0.0.1:3000 user@mac-mini-ip
# Then open http://localhost:3000 in your browser
```

### Option B: Tailscale (recommended for always-on)

```bash
# On Mac Mini
brew install tailscale
# Authenticate, then access via Tailscale IP only
# Dashboard stays bound to 127.0.0.1 — use Tailscale SSH:
ssh -N -L 3000:127.0.0.1:3000 user@mac-mini.tailnet-name
```

### What NOT to do

- Do not set `HOST=0.0.0.0` — this exposes the dashboard on all interfaces
- Do not forward port 3000 on your router
- Do not set `ALLOWED_ORIGINS=*` in production
- Do not run without `DASHBOARD_API_KEY` set

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HOST` | No | `127.0.0.1` | Interface to bind to. Keep as loopback. |
| `PORT` | No | `3000` | Server port |
| `DASHBOARD_API_KEY` | **Yes** | — | Shared secret for API auth. `openssl rand -hex 32` |
| `ALLOWED_ORIGINS` | No | `http://127.0.0.1:3000,http://localhost:3000` | Comma-separated CORS allowlist |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window in ms |
| `RATE_LIMIT_MAX_REQUESTS` | No | `60` | Max requests per window per IP |
| `DASHBOARD_URL` | No | `http://127.0.0.1:3000` | Used by the opencode-hook (agent side) |
| `DATA_DIR` | No | `~/.opencode-dashboard` | SQLite DB and encryption key location |
