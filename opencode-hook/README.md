# OpenCode Dashboard Hook

This hook integrates oh-my-opencode with the OpenCode Dashboard app.

## Installation

### Option 1: Copy to your hooks directory

```bash
cp dashboard-hook.ts ~/.opencode/hooks/
```

### Option 2: Add to your opencode configuration

In your `~/.opencode/config.json` or project's `.opencode/config.json`:

```json
{
  "hooks": {
    "external": [
      {
        "path": "/path/to/dashboard-hook.ts",
        "events": ["onTodoUpdate", "onTaskComplete", "onError", "onStateChange", "onSessionStart"]
      }
    ]
  }
}
```

## Configuration

Set the `DASHBOARD_URL` environment variable to point to your dashboard:

```bash
export DASHBOARD_URL=http://localhost:3000
```

## Events Sent

| Event | Trigger | Payload |
|-------|---------|---------|
| `todo_update` | When todos list changes | Todo count and status breakdown |
| `state_change` | Task completion, state transitions | Message describing the change |
| `error` | When an error occurs | Error message and stack trace |

## API Endpoints Used

- `POST /api/events` - Send events to the dashboard
- `POST /api/todos` - Sync todo items
- `POST /api/sessions` - Create new sessions
