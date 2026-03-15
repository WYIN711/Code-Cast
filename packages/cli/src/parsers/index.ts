import { existsSync, readFileSync } from 'fs';
import { parseClaudeCodeSession } from './claude-code.js';
import { parseCodexSession } from './codex.js';
import { parseOpenClawSession } from './openclaw.js';
import { parseOpenCodeSession } from './opencode.js';
import { parseGeminiCliSession } from './gemini-cli.js';
import type { ParsedSession } from './types.js';

export type { ParsedSession, SessionEntry, SessionMetadata, SharedSession, RedactionSummary } from './types.js';
export { listOpenCodeSessions } from './opencode.js';

type Source = 'claude-code' | 'codex' | 'openclaw' | 'opencode' | 'gemini-cli' | 'unknown';

/**
 * Auto-detect session source and parse accordingly.
 *
 * For OpenCode sessions, pass `openCodeSessionId` to specify which session
 * to extract from the SQLite database.
 */
export async function parseSession(filePath: string, openCodeSessionId?: string): Promise<ParsedSession> {
  if (!existsSync(filePath)) {
    throw new Error(`Session file not found: ${filePath}`);
  }

  const source = detectSource(filePath);

  switch (source) {
    case 'claude-code':
      return parseClaudeCodeSession(filePath);
    case 'codex':
      return parseCodexSession(filePath);
    case 'openclaw':
      return parseOpenClawSession(filePath);
    case 'opencode':
      if (!openCodeSessionId) {
        throw new Error('OpenCode sessions require a session ID. Use `codecast list --source opencode` to find session IDs.');
      }
      return await parseOpenCodeSession(filePath, openCodeSessionId);
    case 'gemini-cli':
      return parseGeminiCliSession(filePath);
    default:
      throw new Error(`Unknown session format. Expected Claude Code, Codex, OpenClaw, OpenCode, or Gemini CLI session file.`);
  }
}

/**
 * Detect session source from file extension and content.
 */
function detectSource(filePath: string): Source {
  const basename = filePath.split('/').pop() || '';

  // OpenCode: SQLite database file
  if (basename.endsWith('.db')) return 'opencode';

  // Gemini CLI: JSON files (not JSONL)
  if (basename.endsWith('.json')) {
    try {
      const raw = readFileSync(filePath, 'utf-8');
      const obj = JSON.parse(raw);
      if (obj.sessionId && obj.messages && Array.isArray(obj.messages)) {
        return 'gemini-cli';
      }
    } catch {
      // Not valid JSON, fall through
    }
  }

  // Filename heuristic for Codex
  if (basename.startsWith('rollout-')) return 'codex';

  // Content heuristic: read first few lines of JSONL
  const head = readFileSync(filePath, 'utf-8').split('\n').slice(0, 5);
  for (const line of head) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'session_meta') return 'codex';
      if (obj.type === 'session' && obj.version !== undefined) return 'openclaw';
      if (obj.type === 'user' && obj.sessionId) return 'claude-code';
      if (obj.type === 'file-history-snapshot') return 'claude-code';
    } catch {
      continue;
    }
  }

  return 'unknown';
}
