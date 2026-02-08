# OpenCode Dashboard

Real-time Kanban board and encrypted message feed for tracking oh-my-opencode agent work. Designed to run on a headless Mac Mini, accessed securely over Tailscale from your phone or laptop.

---

## Table of Contents

1. [Features](#features)
2. [Architecture Overview](#architecture-overview)
3. [Prerequisites](#prerequisites)
4. [Step 1 — Mac Mini Setup](#step-1--mac-mini-setup)
5. [Step 2 — Install Tailscale on Mac Mini](#step-2--install-tailscale-on-mac-mini)
6. [Step 3 — Install & Configure OpenClaw](#step-3--install--configure-openclaw)
7. [Step 4 — Deploy the Dashboard](#step-4--deploy-the-dashboard)
8. [Step 5 — Expose the Dashboard via Tailscale Serve](#step-5--expose-the-dashboard-via-tailscale-serve)
9. [Step 6 — Connect Clients](#step-6--connect-clients)
10. [Step 7 — oh-my-opencode Hook](#step-7--oh-my-opencode-hook)
11. [Step 8 — Verify Everything Works](#step-8--verify-everything-works)
12. [API Reference](#api-reference)
13. [Environment Variables](#environment-variables)
14. [Security Hardening Checklist](#security-hardening-checklist)
15. [Tailscale ACL Policy (Optional)](#tailscale-acl-policy-optional)
16. [Troubleshooting](#troubleshooting)
17. [Tech Stack](#tech-stack)
18. [Mobile App](#mobile-app)

---

## Features

- **Kanban Board** — Drag-and-drop task management with status columns (Pending, In Progress, Completed)
- **Encrypted Messages** — All notifications encrypted at rest using NaCl secretbox
- **Real-time Updates** — Automatic polling every 3 seconds (SSE planned)
- **Dark Mode** — Full dark mode support on web and mobile
- **Cross-platform** — Next.js web app + React Native mobile app
- **oh-my-opencode Integration** — Hook sends agent updates to the dashboard
- **Zero-Trust Access** — Tailscale Serve provides auto-HTTPS, identity headers, and tailnet-only access

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Mac Mini (headless)                                    │
│                                                         │
│  ┌──────────────┐   ┌──────────────────────────────┐    │
│  │  OpenClaw     │   │  Next.js Dashboard           │    │
│  │  Gateway      │   │  127.0.0.1:3000              │    │
│  │  127.0.0.1:   │   │                              │    │
│  │  18789        │   │  SQLite + NaCl encryption     │    │
│  └──────┬───────┘   └──────────────┬───────────────┘    │
│         │                          │                    │
│         │  oh-my-opencode hook     │                    │
│         │  POSTs events ──────────►│                    │
│         │                          │                    │
│  ┌──────┴──────────────────────────┴───────────────┐    │
│  │  Tailscale Serve                                │    │
│  │  https://mac-mini.<tailnet>.ts.net  ◄── proxy ──┤    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
         ▲                          ▲
         │  WireGuard tunnel        │  WireGuard tunnel
         │  (encrypted)             │  (encrypted)
    ┌────┴─────┐             ┌──────┴──────┐
    │  iPhone  │             │  Laptop     │
    │  Tailscale             │  Tailscale  │
    │  app     │             │  + browser  │
    └──────────┘             └─────────────┘
```

**Key design principle**: The dashboard and OpenClaw gateway both bind to `127.0.0.1` only. Tailscale Serve proxies HTTPS traffic from your tailnet to localhost — no ports are exposed on the LAN or internet.

---

## Prerequisites

| Requirement | Minimum | Notes |
|-------------|---------|-------|
| macOS | 13 Ventura+ | Mac Mini target OS |
| Node.js | 20+ | LTS recommended |
| Bun | 1.0+ | Package manager & runtime |
| Git | 2.39+ | Ships with Xcode CLI tools |
| Tailscale account | Free tier | [tailscale.com/start](https://tailscale.com/start) |
| Anthropic API key | — | For OpenClaw / Claude |

---

## Step 1 — Mac Mini Setup

If starting from a fresh Mac Mini:

```bash
# Install Xcode command-line tools (includes git, clang, etc.)
xcode-select --install

# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js and Bun
brew install node
brew install oven-sh/bun/bun

# Verify
node --version   # Should be 20+
bun --version    # Should be 1.0+
git --version    # Should be 2.39+
```

### Optional: Create a dedicated user

For better isolation, run the dashboard and OpenClaw under a separate macOS user:

```bash
# Create user (requires admin)
sudo dscl . -create /Users/opagent
sudo dscl . -create /Users/opagent UserShell /bin/zsh
sudo dscl . -create /Users/opagent RealName "OpenCode Agent"
sudo dscl . -create /Users/opagent UniqueID 550
sudo dscl . -create /Users/opagent PrimaryGroupID 20
sudo dscl . -create /Users/opagent NFSHomeDirectory /Users/opagent
sudo mkdir -p /Users/opagent
sudo chown opagent:staff /Users/opagent

# Set password
sudo dscl . -passwd /Users/opagent <password>

# Switch to the user
su - opagent
```

---

## Step 2 — Install Tailscale on Mac Mini

### Install

Download the **standalone** macOS app (recommended over App Store for headless use):

```bash
brew install --cask tailscale
```

Or download directly from [tailscale.com/download/mac](https://tailscale.com/download/mac).

### Authenticate

```bash
# Start Tailscale and authenticate
tailscale up
```

This opens a browser to sign in with your identity provider (Google, GitHub, Microsoft, etc.). On a headless Mac Mini without a display, use `--auth-key`:

```bash
# Generate an auth key at: https://login.tailscale.com/admin/settings/keys
tailscale up --auth-key=tskey-auth-XXXXX
```

### Enable Tailscale SSH (optional but recommended)

```bash
tailscale set --ssh
```

This lets you SSH into the Mac Mini from any device in your tailnet **without SSH keys** — Tailscale handles authentication via your identity provider.

### Verify

```bash
tailscale status
# Should show your Mac Mini's Tailscale IP (100.x.y.z)

tailscale ip -4
# Prints just the IPv4 address
```

### Enable MagicDNS and HTTPS

MagicDNS is enabled by default on tailnets created after October 2022. To verify:

1. Go to [login.tailscale.com/admin/dns](https://login.tailscale.com/admin/dns)
2. Confirm **MagicDNS** is toggled ON
3. Under **HTTPS Certificates**, click **Enable HTTPS**

> **Note**: Enabling HTTPS publishes your machine names on Let's Encrypt's Certificate Transparency logs. This reveals the name `mac-mini.<tailnet>.ts.net` publicly, but the machine itself remains inaccessible outside your tailnet.

---

## Step 3 — Install & Configure OpenClaw

### Install

```bash
# Option A: One-liner (recommended)
curl -fsSL https://openclaw.ai/install.sh | bash

# Option B: npm global
npm install -g openclaw@latest
```

### Run the onboarding wizard

```bash
openclaw onboard --install-daemon
```

This will:
1. Create `~/.openclaw/openclaw.json` (config file, JSON5 format)
2. Generate a gateway auth token
3. Install a launchd service (`ai.openclaw.gateway`) so the gateway runs at boot
4. Prompt for your Anthropic API key

### Configure for localhost-only

Edit `~/.openclaw/openclaw.json`:

```json5
{
  gateway: {
    port: 18789,
    bind: "loopback",       // CRITICAL: only 127.0.0.1
    auth: {
      mode: "token",        // Require token for API access
      // Token was auto-generated during onboarding.
      // To regenerate: openclaw config set gateway.auth.token "$(openssl rand -hex 32)"
    }
  }
}
```

### Manage the gateway service

```bash
openclaw gateway status    # Check if running
openclaw gateway start     # Start the daemon
openclaw gateway stop      # Stop the daemon
openclaw gateway restart   # Restart after config changes
```

### Verify

```bash
# Check the gateway is listening on loopback only
lsof -iTCP:18789 -sTCP:LISTEN
# Should show *:127.0.0.1:18789, NOT *:18789 or 0.0.0.0:18789
```

### State directory layout

```
~/.openclaw/
├── openclaw.json                   # Main config (JSON5)
├── .env                            # Env vars loaded by daemon
├── workspace/                      # Agent workspace
├── agents/<agentId>/agent/
│   ├── auth-profiles.json          # OAuth + API keys
│   └── auth.json                   # Runtime cache
└── credentials/                    # Legacy OAuth imports
```

---

## Step 4 — Deploy the Dashboard

### Clone the repository

```bash
git clone https://github.com/Keeeeeeeks/opencode-dashboard.git
cd opencode-dashboard
```

### Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` — **at minimum set `DASHBOARD_API_KEY`**:

```bash
# Generate a secure key
openssl rand -hex 32
```

Paste it as the value for `DASHBOARD_API_KEY` in `.env.local`:

```env
HOST=127.0.0.1
PORT=3000
DASHBOARD_API_KEY=<your-generated-key>
ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
```

### Install dependencies and start

```bash
bun install
bun run build    # Production build
bun run start    # Starts on 127.0.0.1:3000
```

### Run as a persistent service (recommended)

Use `launchd` to keep the dashboard running across reboots:

```bash
cat > ~/Library/LaunchAgents/com.opencode-dashboard.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.opencode-dashboard</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>WorkingDirectory</key>
  <string>/Users/opagent/opencode-dashboard</string>
  <key>ProgramArguments</key>
  <array>
    <string>/opt/homebrew/bin/bun</string>
    <string>run</string>
    <string>start</string>
  </array>
  <key>StandardOutPath</key>
  <string>/tmp/opencode-dashboard.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/opencode-dashboard.err</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF

# Adjust WorkingDirectory if your clone is elsewhere

# Load the service
launchctl load ~/Library/LaunchAgents/com.opencode-dashboard.plist

# Verify
curl http://127.0.0.1:3000
```

### Verify

```bash
curl -s http://127.0.0.1:3000 | head -20
# Should return HTML

curl -s http://127.0.0.1:3000/api/sessions
# Should return JSON (empty array initially)
```

---

## Step 5 — Expose the Dashboard via Tailscale Serve

This is the key step that makes the dashboard accessible from your phone and laptop **without** opening any ports.

```bash
tailscale serve 3000
```

**What this does:**

| Before | After |
|--------|-------|
| Dashboard only at `http://127.0.0.1:3000` | Also at `https://mac-mini.<tailnet>.ts.net` |
| No HTTPS | Automatic Let's Encrypt HTTPS |
| No identity info | Adds `Tailscale-User-Login`, `Tailscale-User-Name`, `Tailscale-User-Profile-Pic` headers |
| Only accessible locally | Accessible from any device in your tailnet |
| **Not** accessible from internet | Still **not** accessible from internet |

### Run Tailscale Serve persistently

By default `tailscale serve` runs in the foreground. To make it persistent:

```bash
# Background mode (survives terminal close)
tailscale serve --bg 3000
```

### Verify

From the Mac Mini itself:
```bash
tailscale serve status
# Should show: https://mac-mini.<tailnet>.ts.net -> http://127.0.0.1:3000
```

From another device in your tailnet:
```bash
curl https://mac-mini.<tailnet>.ts.net
```

---

## Step 6 — Connect Clients

### iPhone / iPad

1. Install **Tailscale** from the [App Store](https://apps.apple.com/app/tailscale/id1470499037)
2. Open the app and sign in with the **same identity provider** you used on the Mac Mini
3. Enable the VPN when prompted
4. Open Safari and go to:
   ```
   https://mac-mini.<your-tailnet>.ts.net
   ```

**That's it.** The dashboard loads over Tailscale's encrypted WireGuard tunnel with auto-provisioned HTTPS.

> **VPN On Demand**: In Tailscale iOS settings, enable "VPN On Demand" so the tunnel reconnects automatically. Go to iOS Settings → VPN → Tailscale → Connect On Demand → toggle ON.

### Laptop / Desktop (macOS)

```bash
# Install Tailscale
brew install --cask tailscale

# Authenticate (same identity provider)
tailscale up

# Access the dashboard
open https://mac-mini.<your-tailnet>.ts.net

# SSH into Mac Mini (if Tailscale SSH is enabled)
ssh your-username@mac-mini
```

### Laptop / Desktop (Linux)

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Authenticate
sudo tailscale up

# Access the dashboard
xdg-open https://mac-mini.<your-tailnet>.ts.net
```

### Laptop / Desktop (Windows)

1. Download Tailscale from [tailscale.com/download/windows](https://tailscale.com/download/windows)
2. Sign in with the same identity provider
3. Open a browser to `https://mac-mini.<your-tailnet>.ts.net`

### React Native / Expo mobile app

Once Tailscale is connected on the device, the mobile app can reach the dashboard API directly:

```bash
cd mobile
bun install

# Set the API URL to your Tailscale hostname
export EXPO_PUBLIC_API_URL=https://mac-mini.<your-tailnet>.ts.net

bun run ios   # or bun run android
```

The Tailscale VPN operates at the network layer — all apps on the device can reach tailnet addresses with no special configuration.

---

## Step 7 — oh-my-opencode Hook

The hook sends agent events (task progress, session updates, todos) to the dashboard in real time.

### Install the hook

```bash
# On the Mac Mini (where oh-my-opencode runs)
cp opencode-hook/dashboard-hook.ts ~/.opencode/hooks/
```

### Configure the hook

```bash
# Add to your shell profile (~/.zshrc or ~/.bashrc)
export DASHBOARD_URL=http://127.0.0.1:3000
export DASHBOARD_API_KEY=<same-key-from-env.local>
```

Since OpenClaw and the dashboard both run on the Mac Mini, the hook communicates over loopback — no network exposure.

### Verify the hook

```bash
# Send a test event
curl -X POST http://127.0.0.1:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DASHBOARD_API_KEY" \
  -d '{"type": "test", "data": {"message": "Hook test"}}'
```

---

## Step 8 — Verify Everything Works

Run through this checklist after setup:

```bash
# 1. OpenClaw gateway is running on loopback
lsof -iTCP:18789 -sTCP:LISTEN
# ✓ Should show 127.0.0.1:18789

# 2. Dashboard is running on loopback
lsof -iTCP:3000 -sTCP:LISTEN
# ✓ Should show 127.0.0.1:3000

# 3. Tailscale Serve is proxying
tailscale serve status
# ✓ Should show https://mac-mini.<tailnet>.ts.net -> http://127.0.0.1:3000

# 4. No ports exposed on LAN
# From another device on your local network (NOT tailnet):
curl http://<mac-mini-lan-ip>:3000
# ✓ Should fail / connection refused

# 5. Dashboard accessible via Tailscale
# From a device in your tailnet:
curl https://mac-mini.<your-tailnet>.ts.net
# ✓ Should return dashboard HTML

# 6. API auth is working
curl -s https://mac-mini.<your-tailnet>.ts.net/api/events \
  -X POST -H "Content-Type: application/json" \
  -d '{"type":"test"}'
# ✓ Should return 401 (no auth header)

curl -s https://mac-mini.<your-tailnet>.ts.net/api/events \
  -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer $DASHBOARD_API_KEY" \
  -d '{"type":"test","data":{}}'
# ✓ Should return 200
```

---

## API Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/events` | POST | Bearer token | Receive events from oh-my-opencode hook |
| `/api/todos` | GET | — | Get all todos (query: `session_id`, `status`) |
| `/api/todos` | POST | Bearer token | Create or update a todo |
| `/api/messages` | GET | — | Get all messages (query: `unread_only`) |
| `/api/messages` | POST | Bearer token | Mark messages as read |
| `/api/sessions` | GET | — | List sessions |
| `/api/sessions` | POST | Bearer token | Create or update a session |

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `HOST` | No | `127.0.0.1` | Bind address. **Keep as loopback.** |
| `PORT` | No | `3000` | Server port |
| `DASHBOARD_API_KEY` | **Yes** | — | Shared secret for API auth (`openssl rand -hex 32`) |
| `ALLOWED_ORIGINS` | No | `http://127.0.0.1:3000,http://localhost:3000` | Comma-separated CORS allowlist |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Rate limit window in ms |
| `RATE_LIMIT_MAX_REQUESTS` | No | `60` | Max requests per window per IP |
| `DASHBOARD_URL` | No | `http://127.0.0.1:3000` | Used by opencode-hook (agent side) |
| `DATA_DIR` | No | `~/.opencode-dashboard` | SQLite DB and encryption key location |

---

## Security Hardening Checklist

> **Status**: MVP. Address these items before daily use.

### Critical (before use)

- [ ] **API authentication** — All POST endpoints must validate `Authorization: Bearer <DASHBOARD_API_KEY>`. Without this, anyone on your tailnet can write to the dashboard.
- [ ] **Fix CORS** — Replace `Access-Control-Allow-Origin: *` with the `ALLOWED_ORIGINS` allowlist. The events route also has an invalid header value (`localhost:*`).
- [ ] **Bind to loopback** — Confirm `HOST=127.0.0.1` in `.env.local`. Never set `HOST=0.0.0.0`.

### High (before daily use)

- [ ] **Rate limiting** — Protect POST endpoints with `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX_REQUESTS`.
- [ ] **Validate the hook contract** — The hook in `opencode-hook/dashboard-hook.ts` was written speculatively. Verify against the actual oh-my-opencode hook API.
- [ ] **Add auth to the hook** — The hook currently POSTs without auth headers. Update to send `Authorization: Bearer ${DASHBOARD_API_KEY}`.

### Medium (recommended)

- [ ] **Replace polling with SSE** — Reduce latency and server load.
- [ ] **Encryption key management** — The NaCl key at `~/.opencode-dashboard/key` is plaintext. On macOS, consider Keychain. At minimum verify `chmod 600`.
- [ ] **Push notifications** — `expo-notifications` is imported but not wired up. Add FCM or APNs.
- [ ] **Batch todo sync** — Hook sends sequential HTTP requests per todo; batch into one POST.

### Low (nice to have)

- [ ] **Migrate to PostgreSQL** — Needed for multi-device or multi-agent setups.
- [ ] **Offline caching** — Mobile app has no offline support.
- [ ] **Audit logging** — Log auth failures, rate limit hits, unusual patterns.

---

## Tailscale ACL Policy (Optional)

If you want to restrict which tailnet devices can access the Mac Mini, edit your ACL policy at [login.tailscale.com/admin/acls](https://login.tailscale.com/admin/acls):

```json
{
  "groups": {
    "group:dashboard-users": ["your-email@example.com"]
  },
  "acls": [
    {
      "action": "accept",
      "src": ["group:dashboard-users"],
      "dst": ["mac-mini:443"]
    }
  ],
  "ssh": [
    {
      "action": "accept",
      "src": ["group:dashboard-users"],
      "dst": ["mac-mini"],
      "users": ["autogroup:nonroot"]
    }
  ]
}
```

This ensures only devices belonging to `group:dashboard-users` can reach the dashboard (port 443 via Tailscale Serve) or SSH into the Mac Mini.

---

## Troubleshooting

### Dashboard not loading

```bash
# Is Next.js running?
curl http://127.0.0.1:3000
# If not: check launchd logs
cat /tmp/opencode-dashboard.log
cat /tmp/opencode-dashboard.err

# Is Tailscale Serve active?
tailscale serve status

# Is Tailscale connected?
tailscale status
```

### "Connection refused" from phone/laptop

1. Confirm Tailscale is **connected** on the client device (green icon, not grey)
2. Confirm the Mac Mini shows as online in [login.tailscale.com/admin/machines](https://login.tailscale.com/admin/machines)
3. Try the Tailscale IP directly: `curl http://100.x.y.z:3000`
4. If that works but the hostname doesn't, MagicDNS may be off → enable at [DNS settings](https://login.tailscale.com/admin/dns)

### iOS app can't reach API

1. Ensure Tailscale VPN is connected (check iOS Settings → VPN)
2. Enable "VPN On Demand" to prevent disconnects
3. The React Native app uses `EXPO_PUBLIC_API_URL` — make sure it's set to the `https://mac-mini.<tailnet>.ts.net` URL

### SSH not working

```bash
# Is Tailscale SSH enabled on Mac Mini?
tailscale status   # Look for "ssh" in the features column

# Re-enable if needed
tailscale set --ssh

# Connect with verbose output
ssh -v your-username@mac-mini
```

### OpenClaw gateway not reachable

```bash
# Is the daemon running?
openclaw gateway status

# Check what port/interface it's listening on
lsof -iTCP:18789 -sTCP:LISTEN

# Check logs
cat /tmp/openclaw/openclaw-gateway.log

# Restart if needed
openclaw gateway restart
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Web app** | Next.js 16, TypeScript, Tailwind CSS, @dnd-kit, Zustand |
| **Database** | SQLite (better-sqlite3) |
| **Encryption** | tweetnacl (NaCl secretbox) |
| **Mobile app** | Expo, React Native, TypeScript, Zustand |
| **Agent runtime** | OpenClaw (gateway on port 18789) |
| **Coding agents** | oh-my-opencode (Sisyphus, Atlas, Hephaestus, etc.) |
| **Secure access** | Tailscale (WireGuard, MagicDNS, auto-HTTPS) |

---

## Mobile App

```bash
cd mobile
bun install
bun run ios    # or bun run android
```

Set `EXPO_PUBLIC_API_URL` to your Tailscale hostname for remote access, or `http://localhost:3000` for local development.

---

## Data Storage

| Item | Location | Notes |
|------|----------|-------|
| SQLite database | `~/.opencode-dashboard/data.db` | All todos, sessions, messages |
| Encryption key | `~/.opencode-dashboard/key` | NaCl key, `chmod 600` |
| OpenClaw config | `~/.openclaw/openclaw.json` | Gateway settings |
| OpenClaw state | `~/.openclaw/agents/` | Per-agent auth and state |
| Dashboard logs | `/tmp/opencode-dashboard.log` | stdout from launchd |
| OpenClaw logs | `/tmp/openclaw/openclaw-gateway.log` | Gateway daemon logs |
