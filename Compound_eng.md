# SAA-Day Session Changelog

**Date**: February 4, 2026  
**Session Goal**: Research compound engineering + build OpenCode Dashboard app

---

## 1. Research: Compound Engineering

### What Was Learned

**Compound Engineering** is a software development paradigm pioneered by Dan Shipper and Kieran Klaassen at Every.to (late 2025).

**Core Concept**: Each feature makes the next feature *easier* to build (vs traditional dev where complexity accumulates).

**The 4-Step Loop**:
| Step | Time | Purpose |
|------|------|---------|
| Plan | 40% | AI researches codebase + internet, writes implementation plans |
| Work | 10% | AI executes the plan autonomously |
| Review | 40% | Multi-agent code review (security, performance, etc.) |
| Compound | 10% | Document learnings, feed back into system |

**Claimed Results**:
- 2025 "Vibe Coding": 30-70% faster
- 2026 "Compound Engineering": 300-700% faster (3-7x)

### Verdict: Real or Gimmick?

**Real, but overhyped in marketing.**

Evidence FOR:
- Production systems at Every.to (5 products, single-engineer each)
- 7.2k GitHub stars on compound-engineering-plugin
- Multiple independent implementations
- Sound engineering principles (TDD, CI/CD, feedback loops)

Caveats:
- Requires significant infrastructure investment first
- Learning curve for "agent orchestrator" mindset
- Best for standard patterns, harder for novel algorithms

---

## 2. Built: OpenCode Dashboard

### Architecture

```
Oh-My-OpenCode ──POST──> Next.js API ──> SQLite + NaCl Encryption
                               │
                          Polling (3s)
                               │
                               ▼
                          Web (Next.js)
```

### Components Created

| Component | Path | Description |
|-----------|------|-------------|
| Database Layer | `src/lib/db/` | SQLite + tweetnacl encryption |
| API Routes | `src/app/api/` | events, todos, messages, sessions |
| Kanban Board | `src/components/kanban/` | Drag-and-drop with @dnd-kit |
| Message Feed | `src/components/messages/` | Encrypted notification feed |
| Dashboard Page | `src/app/page.tsx` | Main UI with polling |
| Zustand Store | `src/stores/dashboard.ts` | State management |
| Polling Hook | `src/hooks/usePolling.ts` | 3-second API polling |
| OpenCode Hook | `opencode-hook/` | Integration for oh-my-opencode |

### Tech Stack

**Web**: Next.js 16, TypeScript, Tailwind CSS 4, @dnd-kit, Zustand, better-sqlite3, tweetnacl, Zod

---

## 3. Critical Assessment

### Security Issues (CRITICAL)

| Issue | Severity | Notes |
|-------|----------|-------|
| No Authentication | 🔴 CRITICAL | Anyone can POST to /api/events |
| CORS is `*` | 🔴 HIGH | Any website can make requests |
| Encryption is theater | 🟡 MEDIUM | Key stored plaintext on same machine |
| No rate limiting | 🟡 MEDIUM | DoS vulnerable |

### Architectural Problems

| Issue | Better Alternative |
|-------|-------------------|
| Polling every 3s | WebSockets or Server-Sent Events |
| SQLite | PostgreSQL for multi-instance |
| Speculative hook API | Should verify oh-my-opencode's actual interface |

### Missing Requirements

| Requested | Built | Gap |
|-----------|-------|-----|
| Text message updates | In-app only | No SMS/Twilio integration |
| oh-my-opencode integration | Generic hook | Not verified against actual API |

### Code Quality Issues

- Sequential API calls in `syncTodos()` should be batched
- Invalid CORS header syntax (`localhost:*`)
- Optimistic update + refetch causes redundant work

### What's Actually Good

- NaCl encryption implementation is correct
- Zod validation on API routes
- Clean component structure
- Project builds successfully

---

## 4. Files Created

```
opencode-dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── events/route.ts
│   │   │   ├── todos/route.ts
│   │   │   ├── messages/route.ts
│   │   │   └── sessions/route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── kanban/
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── KanbanColumn.tsx
│   │   │   ├── KanbanCard.tsx
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── messages/
│   │       ├── MessageFeed.tsx
│   │       ├── MessageCard.tsx
│   │       ├── types.ts
│   │       └── index.ts
│   ├── hooks/
│   │   └── usePolling.ts
│   ├── stores/
│   │   └── dashboard.ts
│   └── lib/
│       ├── db/
│       │   ├── index.ts
│       │   ├── encryption.ts
│       │   └── types.ts
│       └── utils.ts
├── opencode-hook/
│   ├── dashboard-hook.ts
│   └── README.md
├── README.md
└── Compound_eng.md (this file)
```

---

## 5. Commands to Run

```bash
# Web dashboard
cd opencode-dashboard
bun install
bun run dev
# Visit http://localhost:3000

# Build check
bun run build
```

---

## 6. Next Steps (If Continuing)

1. **Add authentication** - API keys or JWT tokens
2. **Replace polling with WebSockets** - Use Socket.io or native WS
3. **Verify oh-my-opencode hook API** - Research actual interface
4. **Implement push notifications** - Firebase Cloud Messaging
5. **Add rate limiting** - Express-rate-limit or similar
6. **Fix CORS** - Restrict to specific origins

---

## 7. Session Stats

- **Duration**: ~45 minutes
- **Lines of code**: ~2,500
- **Files created**: 28
- **Build status**: ✅ Passing
- **Production ready**: ❌ No (security gaps)
