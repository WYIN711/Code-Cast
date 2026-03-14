#!/usr/bin/env node

import { mkdirSync, copyFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, '..', 'skills', 'cast', 'SKILL.md');
const srcOpenClaw = join(__dirname, '..', 'skills', 'cast', 'SKILL.openclaw.md');

if (!existsSync(src)) process.exit(0);

// Claude Code: ~/.claude/commands/cast.md
try {
  const dir = join(homedir(), '.claude', 'commands');
  mkdirSync(dir, { recursive: true });
  copyFileSync(src, join(dir, 'cast.md'));
} catch {}

// Codex / Agents: ~/.agents/skills/cast/SKILL.md
try {
  const dir = join(homedir(), '.agents', 'skills', 'cast');
  mkdirSync(dir, { recursive: true });
  copyFileSync(src, join(dir, 'SKILL.md'));
} catch {}

// OpenClaw: ~/.openclaw/skills/cast/SKILL.md (uses OpenClaw-specific frontmatter)
try {
  const dir = join(homedir(), '.openclaw', 'skills', 'cast');
  mkdirSync(dir, { recursive: true });
  const openclawSrc = existsSync(srcOpenClaw) ? srcOpenClaw : src;
  copyFileSync(openclawSrc, join(dir, 'SKILL.md'));
} catch {}

// OpenCode: ~/.opencode/commands/cast.md
try {
  const srcOpenCode = join(__dirname, '..', 'skills', 'cast', 'cast.opencode.md');
  if (existsSync(srcOpenCode)) {
    const dir = join(homedir(), '.opencode', 'commands');
    mkdirSync(dir, { recursive: true });
    copyFileSync(srcOpenCode, join(dir, 'cast.md'));
  }
} catch {}

// Gemini CLI: ~/.gemini/commands/cast.toml
try {
  const srcGemini = join(__dirname, '..', 'skills', 'cast', 'cast.gemini.toml');
  if (existsSync(srcGemini)) {
    const dir = join(homedir(), '.gemini', 'commands');
    mkdirSync(dir, { recursive: true });
    copyFileSync(srcGemini, join(dir, 'cast.toml'));
  }
} catch {}
