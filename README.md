<p align="center">
  <img src="assets/logo.svg" width="64" height="64" alt="CodeCast logo">
</p>

# CodeCast

> **[code-cast.dev](https://code-cast.dev)**

Share AI coding sessions as beautiful, readable web pages. Supports **Claude Code** and **Codex**.

## Install

```bash
npm install -g codecast-cli
```

## Quick Start

```bash
# Share your most recent Claude Code session
codecast share --last

# Share a specific session file
codecast share path/to/session.jsonl

# Share with options
codecast share --last --visibility public --expire 30

# Preview locally (generates HTML)
codecast preview --last

# List local sessions
codecast list
```

### Authentication (optional)

Link sessions to your GitHub account for management:

```bash
codecast login
codecast whoami
```

### Claude Code Plugin

In Claude Code, use the slash command to publish the current session:

```
/cast
```

This generates a shareable link in one step — no need to leave the conversation.

## What the Share Page Shows

- Session title (auto-generated from first user message)
- Agent badge (Claude Code / Codex)
- Project name, model, duration, message count, tool call count
- Full conversation flow:
  - User messages (blue)
  - Assistant responses (purple)
  - Tool calls with expand/collapse (indigo), grouped with results
  - Tool results with success/error indicators (green/red)
  - Thinking blocks (hidden by default, toggle to show)
- Search across all entries
- Mobile-friendly layout

## CLI Commands

| Command | Description |
|---------|-------------|
| `codecast share <file>` | Upload a session and get a shareable link |
| `codecast share --last` | Share your most recent session |
| `codecast preview <file>` | Generate a local HTML preview |
| `codecast list` | List local session files |
| `codecast login` | Authenticate with GitHub |
| `codecast logout` | Remove stored credentials |
| `codecast whoami` | Show current auth status |

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--server <url>` | Server URL | `https://code-cast.dev` |
| `--visibility <v>` | `public`, `unlisted`, or `private` | `unlisted` |
| `--expire <days>` | Auto-expire after N days (1-365) | — |
| `--count <n>` | Number of entries to include | all |
| `--last` | Use most recent session file | — |
| `--open` | Open result in browser | — |
| `--no-redact` | Skip redaction (not recommended) | — |

## Redaction

All sessions are automatically redacted before publishing:

| Category | Examples |
|----------|----------|
| API keys / tokens | `sk-...`, `Bearer ...`, AWS keys |
| File paths | `/Users/username/` → `/Users/[USER]/` |
| Email addresses | `user@example.com` → `[REDACTED_EMAIL]` |
| Git URLs | Private repo URLs |
| JWT tokens | `eyJ...` patterns |
| Secret strings | Long base64/hex strings |
| Private IPs | `192.168.x.x`, `10.x.x.x` |

## Session Sources

### Claude Code
- **Location**: `~/.claude/projects/<encoded-path>/<session-id>.jsonl`
- **Format**: JSONL with message types: `user`, `assistant`, `file-history-snapshot`, `progress`, `queue-operation`

### Codex
- **Location**: `~/.codex/sessions/<year>/<month>/<day>/rollout-*.jsonl`
- **Format**: JSONL with record types: `session_meta`, `response_item`, `event_msg`, `turn_context`

## Development

### Prerequisites

- Node.js 18+
- npm 10+

### Setup

```bash
git clone https://github.com/WYIN711/Code-Cast.git
cd Code-Cast

# Install all dependencies (monorepo workspaces)
npm install

# Run the web app
cd packages/web
cp .env.example .env.local   # configure env vars
npm run dev

# Build the CLI
cd packages/cli
npm run build
```

### Project Structure

```
CodeCast/
├── assets/
│   ├── logo.svg              # Logo (for light surfaces)
│   └── logo-light.svg        # Logo (for dark surfaces)
├── packages/
│   ├── cli/                  # CLI tool (codecast-cli on npm)
│   │   └── src/
│   │       ├── index.ts      # CLI entry (commander)
│   │       ├── auth.ts       # CLI authentication
│   │       ├── upload.ts     # Upload client
│   │       ├── parsers/      # Session parsers
│   │       │   ├── types.ts  # Unified transcript schema
│   │       │   ├── claude-code.ts
│   │       │   └── codex.ts
│   │       ├── redact/       # Redaction module
│   │       │   ├── index.ts
│   │       │   └── patterns.ts
│   │       └── render/       # HTML preview renderer
│   └── web/                  # Next.js web app
│       └── src/
│           ├── app/
│           │   ├── page.tsx        # Landing page
│           │   ├── s/[id]/         # Session viewer
│           │   ├── [username]/     # User profile
│           │   └── api/
│           │       ├── share/      # Upload & delete
│           │       ├── auth/       # GitHub OAuth + CLI tokens
│           │       └── health/     # Health check
│           └── lib/
│               ├── db.ts           # SQLite storage
│               └── auth.ts         # NextAuth config
├── deploy/                   # Production deployment
│   ├── docker-compose.yml
│   ├── Caddyfile
│   ├── setup.sh
│   └── .env.example
└── scripts/
    └── regenerate-previews.sh
```

## Environment Variables

### Web App (`packages/web/.env.local`)

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID | Yes |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret | Yes |
| `NEXTAUTH_SECRET` | Random secret for session signing | Yes |
| `NEXTAUTH_URL` | Public URL of the web app | Yes |
| `DB_PATH` | SQLite database file path | No (defaults to `./data/sessions.db`) |

### CLI

| Variable | Description | Required |
|----------|-------------|----------|
| `CODECAST_SERVER` | Server URL for uploads | No (defaults to `https://code-cast.dev`) |

## Deployment

CodeCast runs on Docker with Caddy as a reverse proxy (automatic HTTPS via Let's Encrypt).

```bash
# On the server
cd deploy
cp .env.example .env
# Edit .env with production values

docker compose up -d --build
```

See `deploy/setup.sh` for EC2 provisioning steps.

## API

### `POST /api/share`
Upload a session. Body: JSON with `id`, `metadata`, `entries`, and optional `visibility` / `expiresAt`.

### `DELETE /api/share/:id`
Delete a session (requires auth).

### `GET /api/health`
Health check endpoint.

### `GET /s/:id`
View a shared session.

## Tech Stack

- **CLI**: TypeScript, Commander.js, tsup, Nanoid, Chalk, Ora
- **Web**: Next.js 15, React 19, Tailwind CSS, better-sqlite3
- **Auth**: NextAuth v5 (GitHub OAuth)
- **Deploy**: Docker, Caddy, AWS EC2
- **Storage**: SQLite (WAL mode)

## License

MIT
