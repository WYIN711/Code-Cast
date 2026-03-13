import { existsSync, readFileSync } from 'fs';
import { parseClaudeCodeSession } from './claude-code.js';
import { parseCodexSession } from './codex.js';
import type { ParsedSession } from './types.js';

export type { ParsedSession, SessionEntry, SessionMetadata, SharedSession, RedactionSummary } from './types.js';

/**
 * Auto-detect session source and parse accordingly.
 */
export function parseSession(filePath: string): ParsedSession {
  if (!existsSync(filePath)) {
    throw new Error(`Session file not found: ${filePath}`);
  }

  const source = detectSource(filePath);

  switch (source) {
    case 'claude-code':
      return parseClaudeCodeSession(filePath);
    case 'codex':
      return parseCodexSession(filePath);
    default:
      throw new Error(`Unknown session format. Expected Claude Code or Codex JSONL file.`);
  }
}

/**
 * Detect whether a JSONL file is from Claude Code or Codex.
 */
function detectSource(filePath: string): 'claude-code' | 'codex' | 'unknown' {
  const basename = filePath.split('/').pop() || '';

  // Filename heuristic
  if (basename.startsWith('rollout-')) return 'codex';

  // Content heuristic: read first few lines
  const head = readFileSync(filePath, 'utf-8').split('\n').slice(0, 5);
  for (const line of head) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'session_meta') return 'codex';
      if (obj.type === 'user' && obj.sessionId) return 'claude-code';
      if (obj.type === 'file-history-snapshot') return 'claude-code';
    } catch {
      continue;
    }
  }

  return 'unknown';
}
