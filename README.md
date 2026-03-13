# CodeCast

*Code is the outcome. Session is the story.*

**[code-cast.dev](https://code-cast.dev)** — Share AI coding sessions as clean, readable web pages.

GitHub has your code. CodeCast has the conversation that built it. Publish your Claude Code or Codex sessions with one command — auto-redacted, instantly shareable.

## Get Started

```bash
npm install -g codecast-cli
```

Then inside any **Claude Code** or **Codex** session:

```
> /cast
Published!
  Share link: https://code-cast.dev/s/abc123
  ID: abc123
```

That's it. Anyone with the link can view the full session — no login needed.

## Commands

All commands work as `/cast` slash commands inside Claude Code and Codex:

| Command | Description |
|---------|-------------|
| `/cast` | Publish the current session |
| `/cast login` | Log in with GitHub — unlocks your profile page |
| `/cast logout` | Sign out |
| `/cast delete <id>` | Delete a published session |
| `/cast history` | Show upload history |
| `/cast list` | List local session files |

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--visibility <v>` | `public`, `unlisted`, or `private` | `unlisted` |
| `--expire <days>` | Auto-expire after N days (1-365) | — |
| `--no-redact` | Skip redaction (not recommended) | — |
| `--dry-run` | Parse and redact but don't upload | — |

## GitHub Login & Profile

Link your GitHub account to get a public profile page:

```
> /cast login
Logged in as yourname
```

- **Profile page** at `code-cast.dev/@yourname` — avatar, bio, and all your public sessions
- **Cross-device management** — delete or change visibility from any browser
- **Permanent ownership** — sessions are tied to your account, not just a local token

Login is optional. Without it, every upload still returns a manage token for deletion.

## Automatic Redaction

Before anything leaves your machine, sensitive data is stripped locally:

| Category | Examples |
|----------|----------|
| API keys & tokens | `sk-...`, `Bearer ...`, AWS keys |
| File paths | `/Users/you/` → `/Users/[USER]/` |
| Emails | `user@co.com` → `[REDACTED_EMAIL]` |
| JWT tokens | `eyJhbG...` patterns |
| Secrets | Long base64/hex strings, private IPs, Git URLs |

## Session Viewer

Each shared session renders as a clean timeline:

- **Messages** — user prompts and assistant responses with timestamps
- **Tool calls** — grouped with results, click to expand full input/output
- **Thinking blocks** — hidden by default, toggle to reveal
- **Search** — filter entries by keyword
- **Metadata** — agent, model, project, duration, message & tool call counts

Works on desktop and mobile.

## Supported Sources

| Agent | Session Location |
|-------|-----------------|
| Claude Code | `~/.claude/projects/<path>/*.jsonl` |
| Codex | `~/.codex/sessions/<date>/*.jsonl` |

## Development

```bash
git clone https://github.com/WYIN711/Code-Cast.git
cd Code-Cast
npm install

# Web app
cd packages/web
cp .env.example .env.local
npm run dev

# CLI
cd packages/cli
npm run build
```

### Project Structure

```
CodeCast/
├── packages/
│   ├── cli/                  # CLI tool (codecast-cli on npm)
│   │   └── src/
│   │       ├── index.ts      # CLI entry (commander)
│   │       ├── auth.ts       # CLI authentication
│   │       ├── history.ts    # Upload history & manage tokens
│   │       ├── upload.ts     # Upload client
│   │       ├── parsers/      # Session parsers
│   │       └── redact/       # Redaction engine
│   └── web/                  # Next.js web app
│       └── src/
│           ├── app/
│           │   ├── page.tsx        # Landing page
│           │   ├── s/[id]/         # Session viewer
│           │   ├── [username]/     # User profile
│           │   └── api/            # Upload, delete, auth, health
│           └── lib/
│               ├── db.ts           # SQLite storage
│               └── auth.ts         # NextAuth config
└── deploy/                   # Docker + Caddy production setup
```

### Environment Variables

#### Web (`packages/web/.env.local`)

| Variable | Description | Required |
|----------|-------------|----------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID | Yes |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret | Yes |
| `NEXTAUTH_SECRET` | Random secret for session signing | Yes |
| `NEXTAUTH_URL` | Public URL of the web app | Yes |
| `DB_PATH` | SQLite database file path | No (defaults to `./data/sessions.db`) |

#### CLI

| Variable | Description | Required |
|----------|-------------|----------|
| `CODECAST_SERVER` | Server URL for uploads | No (defaults to `https://code-cast.dev`) |

## Tech Stack

- **CLI**: TypeScript, Commander.js, tsup, Nanoid, Chalk, Ora
- **Web**: Next.js 15, React 19, better-sqlite3
- **Auth**: NextAuth v5 (GitHub OAuth)
- **Deploy**: Docker, Caddy, AWS EC2
- **Storage**: SQLite (WAL mode)

## License

MIT
