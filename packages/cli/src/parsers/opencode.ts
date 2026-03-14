import Database from 'better-sqlite3';
import type { ParsedSession, SessionEntry, SessionMetadata } from './types.js';

/**
 * OpenCode stores sessions in a SQLite database at ~/.local/share/opencode/opencode.db
 * with three tables: session, message, part.
 *
 * - session: id, title, directory, time_created, time_updated, version
 * - message: id, session_id, data (JSON with role: 'user' | 'assistant'), time_created
 * - part: id, message_id, session_id, data (JSON discriminated by type), time_created
 */

interface SessionRow {
  id: string;
  title: string;
  directory: string;
  version: string;
  time_created: number;
  time_updated: number;
}

interface MessageRow {
  id: string;
  session_id: string;
  time_created: number;
  data: string;
}

interface PartRow {
  id: string;
  message_id: string;
  time_created: number;
  data: string;
}

interface MessageData {
  role: 'user' | 'assistant';
  model?: { providerID?: string; modelID?: string };
  path?: { cwd?: string; root?: string };
}

interface PartData {
  type: string;
  // text / reasoning
  text?: string;
  // tool
  callID?: string;
  tool?: string;
  state?: {
    status: string;
    input?: Record<string, unknown>;
    output?: string;
    error?: string;
    title?: string;
  };
}

export interface OpenCodeSessionInfo {
  id: string;
  title: string;
  directory: string;
  mtime: number;
  version: string;
}

/**
 * List all sessions from an OpenCode SQLite database.
 */
export function listOpenCodeSessions(dbPath: string): OpenCodeSessionInfo[] {
  const db = new Database(dbPath, { readonly: true });
  try {
    const rows = db.prepare(
      `SELECT id, title, directory, version, time_created, time_updated
       FROM session
       WHERE time_archived IS NULL
       ORDER BY time_updated DESC`
    ).all() as SessionRow[];

    return rows.map(row => ({
      id: row.id,
      title: row.title || 'Untitled',
      directory: row.directory || '',
      mtime: row.time_updated,
      version: row.version || '',
    }));
  } finally {
    db.close();
  }
}

/**
 * Parse a specific OpenCode session from its SQLite database.
 */
export function parseOpenCodeSession(dbPath: string, sessionId: string): ParsedSession {
  const db = new Database(dbPath, { readonly: true });
  try {
    // Get session metadata
    const session = db.prepare(
      `SELECT id, title, directory, version, time_created, time_updated
       FROM session WHERE id = ?`
    ).get(sessionId) as SessionRow | undefined;

    if (!session) {
      throw new Error(`OpenCode session not found: ${sessionId}`);
    }

    // Get all messages for this session, ordered by time
    const messages = db.prepare(
      `SELECT id, session_id, time_created, data
       FROM message WHERE session_id = ?
       ORDER BY time_created ASC, id ASC`
    ).all(sessionId) as MessageRow[];

    // Get all parts for this session, ordered by message then time
    const parts = db.prepare(
      `SELECT id, message_id, time_created, data
       FROM part WHERE session_id = ?
       ORDER BY message_id ASC, id ASC`
    ).all(sessionId) as PartRow[];

    // Group parts by message_id
    const partsByMessage = new Map<string, PartRow[]>();
    for (const part of parts) {
      const list = partsByMessage.get(part.message_id) || [];
      list.push(part);
      partsByMessage.set(part.message_id, list);
    }

    const entries: SessionEntry[] = [];
    let model = '';
    let cwd = '';
    let firstUserMessage = '';

    // Process each message and its parts
    for (const msg of messages) {
      let msgData: MessageData;
      try {
        msgData = JSON.parse(msg.data);
      } catch {
        continue;
      }

      const role = msgData.role;
      if (msgData.model?.modelID && !model) {
        model = msgData.model.modelID;
      }
      if (msgData.path?.cwd && !cwd) {
        cwd = msgData.path.cwd;
      }

      const msgParts = partsByMessage.get(msg.id) || [];

      for (const part of msgParts) {
        let partData: PartData;
        try {
          partData = JSON.parse(part.data);
        } catch {
          continue;
        }

        const timestamp = new Date(part.time_created).toISOString();

        switch (partData.type) {
          case 'text': {
            if (!partData.text) break;
            if (role === 'user') {
              if (!firstUserMessage) firstUserMessage = partData.text;
              entries.push({
                type: 'user',
                timestamp,
                content: partData.text,
              });
            } else {
              entries.push({
                type: 'assistant',
                timestamp,
                content: partData.text,
              });
            }
            break;
          }

          case 'reasoning': {
            if (partData.text) {
              entries.push({
                type: 'thinking',
                timestamp,
                content: partData.text,
              });
            }
            break;
          }

          case 'tool': {
            const state = partData.state;
            if (!state) break;

            const toolName = partData.tool || 'unknown';
            const callId = partData.callID || '';

            // Emit tool_call
            entries.push({
              type: 'tool_call',
              timestamp,
              content: formatToolCallContent(toolName, state.input),
              toolName,
              toolCallId: callId,
              toolInput: state.input,
            });

            // Emit tool_result if completed or errored
            if (state.status === 'completed') {
              entries.push({
                type: 'tool_result',
                timestamp,
                content: state.output || '',
                toolCallId: callId,
                toolName,
                status: 'success',
              });
            } else if (state.status === 'error') {
              entries.push({
                type: 'tool_result',
                timestamp,
                content: state.error || 'Error',
                toolCallId: callId,
                toolName,
                status: 'error',
              });
            }
            break;
          }

          // Skip non-content part types: file, step-start, step-finish, snapshot, etc.
          default:
            break;
        }
      }
    }

    const startedAt = new Date(session.time_created).toISOString();
    const endedAt = new Date(session.time_updated).toISOString();
    const title = session.title || generateTitle(firstUserMessage);

    const metadata: SessionMetadata = {
      agent: 'opencode',
      sessionId: session.id,
      title,
      project: extractProjectName(session.directory),
      cwd: session.directory || cwd,
      model,
      startedAt,
      endedAt,
      version: session.version,
      entryCount: entries.length,
    };

    return { metadata, entries };
  } finally {
    db.close();
  }
}

function formatToolCallContent(name: string, input?: Record<string, unknown>): string {
  if (!input) return name;
  switch (name) {
    case 'bash':
      return (input.command as string) || (input.cmd as string) || '';
    case 'read':
      return `Read ${input.filePath || input.file_path || input.path || ''}`;
    case 'write':
      return `Write to ${input.filePath || input.file_path || input.path || ''}`;
    case 'edit':
      return `Edit ${input.filePath || input.file_path || input.path || ''}`;
    case 'glob':
      return `Find files matching "${input.pattern || ''}"`;
    case 'grep':
      return `Search for "${input.pattern || ''}"`;
    case 'list':
      return `List ${input.path || '.'}`;
    default:
      return JSON.stringify(input, null, 2);
  }
}

function generateTitle(firstMessage: string): string {
  if (!firstMessage) return 'Untitled Session';
  const firstLine = firstMessage.split('\n')[0].replace(/^#+\s*/, '').trim();
  if (firstLine.length <= 80) return firstLine;
  return firstLine.substring(0, 77) + '...';
}

function extractProjectName(dir: string): string {
  if (!dir) return '';
  const parts = dir.split('/');
  return parts[parts.length - 1] || '';
}
