import { readFileSync } from 'fs';
import type { ParsedSession, SessionEntry, SessionMetadata } from './types.js';

/**
 * Gemini CLI stores sessions as JSON files in ~/.gemini/tmp/<project_hash>/chats/
 * Each file is a ConversationRecord with a messages array.
 *
 * Message types: user, gemini, info, error, warning
 * Tool calls are embedded in gemini-type messages as toolCalls array.
 */

interface ConversationRecord {
  sessionId: string;
  projectHash?: string;
  startTime: string;
  lastUpdated: string;
  messages: MessageRecord[];
  summary?: string;
  kind?: 'main' | 'subagent';
}

interface MessageRecord {
  id: string;
  timestamp: string;
  type: 'user' | 'gemini' | 'info' | 'error' | 'warning';
  content: PartListUnion;
  toolCalls?: ToolCallRecord[];
  thoughts?: Array<{ subject: string; description: string; timestamp: string }>;
  model?: string;
}

interface ToolCallRecord {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: PartListUnion | null;
  status: string;
  timestamp: string;
}

interface Part {
  text?: string;
  thought?: boolean;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { id: string; name: string; response: Record<string, unknown> };
}

type PartListUnion = string | Part | (string | Part)[];

/**
 * Parse a Gemini CLI session JSON file into the unified transcript format.
 */
export function parseGeminiCliSession(filePath: string): ParsedSession {
  const raw = readFileSync(filePath, 'utf-8');
  const record: ConversationRecord = JSON.parse(raw);

  const entries: SessionEntry[] = [];
  let model = '';
  let firstUserMessage = '';

  for (const msg of record.messages) {
    const timestamp = msg.timestamp || '';

    if (msg.model && !model) model = msg.model;

    switch (msg.type) {
      case 'user': {
        const text = extractText(msg.content);
        if (text) {
          if (!firstUserMessage) firstUserMessage = text;
          entries.push({
            type: 'user',
            timestamp,
            content: text,
          });
        }
        break;
      }

      case 'gemini': {
        // Thinking/thoughts
        if (msg.thoughts) {
          for (const thought of msg.thoughts) {
            entries.push({
              type: 'thinking',
              timestamp: thought.timestamp || timestamp,
              content: thought.description
                ? `**${thought.subject}**: ${thought.description}`
                : thought.subject,
            });
          }
        }

        // Main text content
        const text = extractText(msg.content);
        if (text) {
          entries.push({
            type: 'assistant',
            timestamp,
            content: text,
          });
        }

        // Tool calls
        if (msg.toolCalls) {
          for (const tc of msg.toolCalls) {
            entries.push({
              type: 'tool_call',
              timestamp: tc.timestamp || timestamp,
              content: formatToolCallContent(tc.name, tc.args),
              toolName: tc.name,
              toolCallId: tc.id,
              toolInput: tc.args,
            });

            // Tool result
            if (tc.result !== undefined && tc.result !== null) {
              const resultText = extractText(tc.result);
              entries.push({
                type: 'tool_result',
                timestamp: tc.timestamp || timestamp,
                content: resultText || '',
                toolCallId: tc.id,
                toolName: tc.name,
                status: tc.status === 'error' ? 'error' : 'success',
              });
            }
          }
        }
        break;
      }

      case 'error': {
        const text = extractText(msg.content);
        if (text) {
          entries.push({
            type: 'system',
            timestamp,
            content: text,
          });
        }
        break;
      }

      // Skip info and warning messages — typically internal/UI
      default:
        break;
    }
  }

  const title = record.summary || generateTitle(firstUserMessage);

  const metadata: SessionMetadata = {
    agent: 'gemini-cli',
    sessionId: record.sessionId || '',
    title,
    model,
    startedAt: record.startTime || '',
    endedAt: record.lastUpdated || '',
    entryCount: entries.length,
  };

  return { metadata, entries };
}

/**
 * Extract plain text from Gemini CLI's polymorphic content field.
 * Content can be: string, Part object, or array of strings/Parts.
 */
function extractText(content: PartListUnion): string {
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    const texts: string[] = [];
    for (const item of content) {
      if (typeof item === 'string') {
        texts.push(item);
      } else if (item.text && !item.thought) {
        texts.push(item.text);
      }
    }
    return texts.join('\n');
  }

  // Single Part object
  if (content && typeof content === 'object' && 'text' in content) {
    return content.text || '';
  }

  return '';
}

function formatToolCallContent(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case 'run_command':
    case 'shell':
      return (args.command as string) || (args.cmd as string) || '';
    case 'read_file':
      return `Read ${args.path || args.file_path || ''}`;
    case 'write_file':
      return `Write to ${args.path || args.file_path || ''}`;
    case 'edit_file':
      return `Edit ${args.path || args.file_path || ''}`;
    case 'search_files':
      return `Search for "${args.pattern || args.query || ''}"`;
    case 'list_directory':
      return `List ${args.path || '.'}`;
    default:
      return JSON.stringify(args, null, 2);
  }
}

function generateTitle(firstMessage: string): string {
  if (!firstMessage) return 'Untitled Session';
  const firstLine = firstMessage.split('\n')[0].replace(/^#+\s*/, '').trim();
  if (firstLine.length <= 80) return firstLine;
  return firstLine.substring(0, 77) + '...';
}
