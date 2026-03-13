---
name: cast
description: Publish, manage, and share CodeCast sessions
user_invocable: true
argument-hint: "[login | logout | delete <id> | history | list]"
---

Run the matching `codecast` command immediately. Do not explain what you are about to do — just execute it and show the output.

- No args → `codecast publish`
- `login` → `codecast login`
- `logout` → `codecast logout`
- `delete <id>` → `codecast delete <id>`
- `history` → `codecast history`
- `list` → `codecast list`

Pass any extra flags through (e.g. `--visibility public`, `--expire 30`, `--no-redact`, `--dry-run`).

If `codecast` is not found, run `npm install -g codecast-cli` first, then retry.
