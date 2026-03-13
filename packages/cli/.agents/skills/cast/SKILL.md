---
name: cast
description: Publish this session as a shareable CodeCast link
user_invocable: true
argument-hint: "[--public] [--title 'My Session']"
---

Publish the current coding session to CodeCast as a shareable link.

## Steps

1. Check if codecast CLI is available:
   - Run: `which codecast || npx codecast-cli --version`
   - If not installed, run: `npm install -g codecast-cli`

2. Publish the session:
   - Run: `npx codecast-cli publish --server https://code-cast.dev $ARGUMENTS`
   - This auto-detects the current session file and uploads it

3. Show the returned URL to the user in a clear, prominent way

4. If the user wants to make it public, suggest: `npx codecast-cli publish --visibility public --server https://code-cast.dev`

## Notes
- No account needed for basic link sharing (unlisted by default)
- For public profile listings, the user should first run `npx codecast-cli login`
- Sessions are automatically redacted (API keys, tokens, paths stripped)
