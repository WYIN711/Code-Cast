---
name: cast
description: Publish, manage, and share CodeCast sessions
user_invocable: true
argument-hint: "[login | logout | publish | delete <id> | history | list]"
---

Manage CodeCast sessions — publish, login, delete, and view history. All from within your coding session.

## Default (no arguments or `publish`)

Publish the current session as a shareable link.

1. Run: `codecast publish`
   - This auto-detects the current session file, parses it, redacts sensitive info, and uploads.
2. Show the returned share link prominently to the user.
3. If the result includes a manage link, show that too.

## `login`

Authenticate with GitHub to link sessions to a profile.

1. Run: `codecast login`
2. A browser window will open for GitHub OAuth.
3. After login completes, confirm with: `codecast whoami`

## `logout`

Remove stored authentication.

1. Run: `codecast logout`
2. Confirm to the user that they have been logged out.

## `delete <id>`

Delete a previously published session.

1. Run: `codecast delete <id>`
2. Confirm the result to the user.

## `history`

Show previously published sessions from this machine.

1. Run: `codecast history`
2. Display the results to the user.

## `list`

Show locally available session files.

1. Run: `codecast list`
2. Display the results to the user.

## Options for publish

- `--visibility public` — make the session publicly listed
- `--visibility unlisted` — default, accessible by link only
- `--expire 30` — auto-delete after N days
- `--no-redact` — skip redaction (not recommended)
- `--dry-run` — parse and redact but don't upload

## Notes

- No account needed for basic sharing (unlisted by default)
- Sessions are automatically redacted before upload (API keys, tokens, file paths, emails stripped)
- If codecast is not installed, run: `npm install -g codecast-cli`
