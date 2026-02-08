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

### Web Dashboard

```bash
bun install
bun run dev
```

Visit http://localhost:3000

### Mobile App

```bash
cd mobile
bun install
bun run ios    # or bun run android
```

### oh-my-opencode Integration

Copy the hook to your oh-my-opencode hooks directory:

```bash
cp opencode-hook/dashboard-hook.ts ~/.opencode/hooks/
```

Set the dashboard URL:

```bash
export DASHBOARD_URL=http://localhost:3000
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
- **Encryption Key**: NaCl key at `~/.opencode-dashboard/key`

## Tech Stack

**Web**: Next.js 16, TypeScript, Tailwind CSS, @dnd-kit, Zustand, better-sqlite3, tweetnacl

**Mobile**: Expo, React Native, TypeScript, Zustand, expo-notifications
