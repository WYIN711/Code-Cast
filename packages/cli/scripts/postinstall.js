#!/usr/bin/env node

import { mkdirSync, copyFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const commandsDir = join(homedir(), '.claude', 'commands');
const src = join(__dirname, '..', 'skills', 'cast', 'SKILL.md');
const dest = join(commandsDir, 'cast.md');

try {
  if (!existsSync(src)) process.exit(0);
  mkdirSync(commandsDir, { recursive: true });
  copyFileSync(src, dest);
} catch {
  // Silent fail — don't break npm install
}
