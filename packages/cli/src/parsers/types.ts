/**
 * Unified transcript schema for all AI coding session sources.
 * Designed to be extensible to future agent tools beyond Claude Code / Codex.
 */

export interface SessionEntry {
  type: 'user' | 'assistant' | 'tool_call' | 'tool_result' | 'thinking' | 'system';
  timestamp: string;
  content: string;
  /** Tool name for tool_call / tool_result entries */
  toolName?: string;
  /** Links tool_result back to its tool_call */
  toolCallId?: string;
  /** Execution status for tool_result */
  status?: 'success' | 'error';
  /** Tool input for tool_call entries */
  toolInput?: Record<string, unknown>;
}

export interface SessionMetadata {
  agent: 'claude-code' | 'codex' | 'openclaw' | 'unknown';
  sessionId: string;
  title: string;
  project?: string;
  /** Full working directory path — used for redaction, stripped before publish */
  cwd?: string;
  model?: string;
  startedAt: string;
  endedAt: string;
  version?: string;
  entryCount: number;
}

export interface ParsedSession {
  metadata: SessionMetadata;
  entries: SessionEntry[];
}

export interface SharedSession {
  id: string;
  metadata: SessionMetadata;
  entries: SessionEntry[];
  visibility: 'public' | 'unlisted' | 'private';
  createdAt: string;
  expiresAt?: string;
}

export interface RedactionSummary {
  totalRedactions: number;
  categories: Record<string, number>;
}
