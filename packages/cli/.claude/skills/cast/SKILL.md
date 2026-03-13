---
name: cast
description: Publish this session as a shareable CodeCast link
user_invocable: true
---

Publish the current Claude Code session to CodeCast.

Steps:
1. Run: `npx codecast publish --server https://code-cast.dev`
2. Show the returned URL to the user
3. If the command fails because codecast is not installed, suggest: `npm install -g codecast-cli`
