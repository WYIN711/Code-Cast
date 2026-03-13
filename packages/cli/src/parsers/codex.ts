import { readFileSync } from 'fs';
import type { ParsedSession, SessionEntry, SessionMetadata } from './types.js';

interface CodexLine {
  timestamp: string;
  type: 'session_meta' | 'response_item' | 'event_msg' | 'turn_context';
  payload: Record<string, unknown>;
}

/**
 * Parse a Codex CLI session JSONL file into the unified transcript format.
 *
 * Codex sessions use these record types:
 * - session_meta: session info (id, cwd, model, cli_version)
 * - response_item: messages, tool calls, tool results, reasoning
 * - event_msg: events like task_started, user_message, agent_message
 * - turn_context: context for each turn (cwd, date, policies)
 */
export function parseCodexSession(filePath: string): ParsedSession {
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n').filter(l => l.trim());

  const entries: SessionEntry[] = [];
  let sessionId = '';
  let project = '';
  let model = '';
  let version = '';
  let startedAt = '';
  let endedAt = '';
  let firstUserMessage = '';

  const pendingToolCalls = new Map<string, string>();

  for (const line of lines) {
    let obj: CodexLine;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }

    const ts = obj.timestamp || '';
    if (ts) {
      if (!startedAt) startedAt = ts;
      endedAt = ts;
    }

    const payload = obj.payload || {};

    if (obj.type === 'session_meta') {
      sessionId = (payload.id as string) || '';
      project = (payload.cwd as string) || '';
      model = (payload.model as string) || '';
      version = (payload.cli_version as string) || '';
      continue;
    }

    if (obj.type === 'event_msg') {
      const eventType = payload.type as string;
      if (eventType === 'user_message') {
        const message = (payload.message as string) || '';
        if (!firstUserMessage) firstUserMessage = message;
        entries.push({
          type: 'user',
          timestamp: ts,
          content: message,
        });
      } else if (eventType === 'agent_message') {
        entries.push({
          type: 'assistant',
          timestamp: ts,
          content: (payload.message as string) || '',
        });
      }
      continue;
    }

    if (obj.type === 'response_item') {
      const itemType = payload.type as string;
      const role = payload.role as string;
      const content = payload.content as Array<{ type: string; text?: string }> | null;

      // Skip developer/system messages (permissions, instructions, etc.)
      if (role === 'developer') continue;

      if (itemType === 'message' && role === 'user' && content) {
        for (const block of content) {
          if (block.type === 'input_text' && block.text) {
            // Skip if it looks like an instruction file path
            if (block.text.startsWith('/') && !block.text.includes(' ')) continue;
            if (!firstUserMessage) firstUserMessage = block.text;
          }
        }
        continue;
      }

      if (itemType === 'message' && role === 'assistant' && content) {
        for (const block of content) {
          if (block.type === 'output_text' && block.text) {
            entries.push({
              type: 'assistant',
              timestamp: ts,
              content: block.text,
            });
          }
        }
        continue;
      }

      if (itemType === 'reasoning') {
        // Codex encrypts reasoning content, just note it exists
        const summary = payload.summary as Array<{ text?: string }> | undefined;
        if (summary?.length) {
          entries.push({
            type: 'thinking',
            timestamp: ts,
            content: summary.map(s => s.text || '').join('\n'),
          });
        }
        continue;
      }

      if (itemType === 'function_call') {
        const name = (payload.name as string) || 'unknown';
        const callId = (payload.call_id as string) || '';
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse((payload.arguments as string) || '{}');
        } catch {
          // noop
        }
        pendingToolCalls.set(callId, name);
        entries.push({
          type: 'tool_call',
          timestamp: ts,
          content: formatCodexToolCall(name, args),
          toolName: name,
          toolCallId: callId,
          toolInput: args,
        });
        continue;
      }

      if (itemType === 'function_call_output') {
        const callId = (payload.call_id as string) || '';
        const output = (payload.output as string) || '';
        const toolName = pendingToolCalls.get(callId) || 'unknown';
        pendingToolCalls.delete(callId);
        entries.push({
          type: 'tool_result',
          timestamp: ts,
          content: output,
          toolCallId: callId,
          toolName,
          status: output.includes('error') || output.includes('Error') ? 'error' : 'success',
        });
        continue;
      }
    }
  }

  const title = generateTitle(firstUserMessage);

  const metadata: SessionMetadata = {
    agent: 'codex',
    sessionId,
    title,
    project: extractProjectName(project),
    cwd: project, // full working directory for redaction
    model,
    startedAt,
    endedAt,
    version,
    entryCount: entries.length,
  };

  return { metadata, entries };
}

function formatCodexToolCall(name: string, args: Record<string, unknown>): string {
  if (name === 'exec_command') {
    return (args.cmd as string) || '';
  }
  return JSON.stringify(args, null, 2);
}

function generateTitle(firstMessage: string): string {
  if (!firstMessage) return 'Untitled Session';
  const firstLine = firstMessage.split('\n')[0].replace(/^#+\s*/, '').trim();
  if (firstLine.length <= 80) return firstLine;
  return firstLine.substring(0, 77) + '...';
}

function extractProjectName(cwd: string): string {
  if (!cwd) return '';
  const parts = cwd.split('/');
  return parts[parts.length - 1] || '';
}
