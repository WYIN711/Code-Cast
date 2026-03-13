#!/usr/bin/env node

import { mkdirSync, copyFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '..', 'skills', 'cast', 'SKILL.md');

if (!existsSync(src)) process.exit(0);

// Claude Code: ~/.claude/commands/cast.md
try {
  const dir = join(homedir(), '.claude', 'commands');
  mkdirSync(dir, { recursive: true });
  copyFileSync(src, join(dir, 'cast.md'));
} catch {}

// Codex: ~/.codex/skills/cast/SKILL.md
try {
  const dir = join(homedir(), '.codex', 'skills', 'cast');
  mkdirSync(dir, { recursive: true });
  copyFileSync(src, join(dir, 'SKILL.md'));
} catch {}
