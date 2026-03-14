import { readFileSync } from 'fs';
import type { ParsedSession, SessionEntry, SessionMetadata } from './types.js';

interface ClaudeCodeLine {
  type: string;
  message?: {
    role?: string;
    model?: string;
    content?: string | ContentBlock[];
    stop_reason?: string | null;
  };
  sessionId?: string;
  timestamp?: string;
  cwd?: string;
  version?: string;
  gitBranch?: string;
  uuid?: string;
  parentUuid?: string | null;
  isSidechain?: boolean;
  data?: {
    type?: string;
    message?: Record<string, unknown>;
    agentId?: string;
  };
  toolUseID?: string;
}

interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string | ContentBlock[];
  tool_use_id?: string;
}

/**
 * Parse a Claude Code session JSONL file into the unified transcript format.
 */
export function parseClaudeCodeSession(filePath: string): ParsedSession {
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

  // Track tool calls for linking results
  const pendingToolCalls = new Map<string, string>(); // id -> toolName

  for (const line of lines) {
    let obj: ClaudeCodeLine;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }

    // Skip file-history-snapshot, queue-operation, and progress (subagent) entries
    if (obj.type === 'file-history-snapshot' || obj.type === 'queue-operation') continue;

    // Skip subagent progress entries — they're noisy and not the main conversation
    if (obj.type === 'progress') continue;

    // Extract metadata from first user message
    if (obj.type === 'user' && !sessionId) {
      sessionId = obj.sessionId || '';
      project = obj.cwd || '';
      version = obj.version || '';
    }

    if (obj.timestamp) {
      if (!startedAt) startedAt = obj.timestamp;
      endedAt = obj.timestamp;
    }

    if (obj.type === 'user') {
      const msg = obj.message;
      if (!msg) continue;
      const content = msg.content;
      if (typeof content === 'string') {
        if (!firstUserMessage) firstUserMessage = content;
        entries.push({
          type: 'user',
          timestamp: obj.timestamp || '',
          content,
        });
      } else if (Array.isArray(content)) {
        // tool_result comes as user messages in Claude Code
        for (const block of content) {
          if (block.type === 'tool_result') {
            const toolId = block.tool_use_id || '';
            const toolName = pendingToolCalls.get(toolId) || 'unknown';
            const resultContent = typeof block.content === 'string'
              ? block.content
              : Array.isArray(block.content)
                ? block.content.map(b => b.text || '').join('\n')
                : JSON.stringify(block.content);
            const isError = resultContent.includes('tool_use_error') || resultContent.includes('Error');
            entries.push({
              type: 'tool_result',
              timestamp: obj.timestamp || '',
              content: resultContent,
              toolCallId: toolId,
              toolName,
              status: isError ? 'error' : 'success',
            });
            pendingToolCalls.delete(toolId);
          } else if (block.type === 'text') {
            if (!firstUserMessage) firstUserMessage = block.text || '';
            entries.push({
              type: 'user',
              timestamp: obj.timestamp || '',
              content: block.text || '',
            });
          }
        }
      }
    }

    if (obj.type === 'assistant') {
      const msg = obj.message;
      if (!msg) continue;
      if (msg.model && !model) model = msg.model;
      const content = msg.content;
      if (!Array.isArray(content)) continue;

      for (const block of content) {
        if (block.type === 'thinking' && block.thinking) {
          entries.push({
            type: 'thinking',
            timestamp: obj.timestamp || '',
            content: block.thinking,
          });
        } else if (block.type === 'text' && block.text) {
          entries.push({
            type: 'assistant',
            timestamp: obj.timestamp || '',
            content: block.text,
          });
        } else if (block.type === 'tool_use' && block.name) {
          pendingToolCalls.set(block.id || '', block.name);
          entries.push({
            type: 'tool_call',
            timestamp: obj.timestamp || '',
            content: formatToolCallContent(block.name, block.input),
            toolName: block.name,
            toolCallId: block.id || '',
            toolInput: block.input,
          });
        }
      }
    }
  }

  // Generate title from first user message
  const title = generateTitle(firstUserMessage);

  const metadata: SessionMetadata = {
    agent: 'claude-code',
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

function formatToolCallContent(name: string, input?: Record<string, unknown>): string {
  if (!input) return name;
  switch (name) {
    case 'Bash':
      return input.command as string || '';
    case 'Read':
      return `Read ${input.file_path || ''}`;
    case 'Write':
      return `Write to ${input.file_path || ''}`;
    case 'Edit':
      return `Edit ${input.file_path || ''}`;
    case 'Grep':
      return `Search for "${input.pattern || ''}" in ${input.path || 'cwd'}`;
    case 'Glob':
      return `Find files matching "${input.pattern || ''}"`;
    case 'Task':
      return `Spawn ${input.subagent_type || 'agent'}: ${input.description || ''}`;
    case 'WebFetch':
      return `Fetch: ${input.url || ''}`;
    case 'WebSearch':
      return `Search: ${input.query || ''}`;
    case 'AskUserQuestion': {
      const questions = input.questions as Array<{ question?: string }> | undefined;
      return `Ask: ${questions?.[0]?.question || ''}`;
    }
    case 'Skill':
      return `Skill: ${input.skill || ''}`;
    case 'NotebookEdit':
      return `Edit notebook: ${input.notebook_path || ''}`;
    case 'TaskCreate':
      return `Create task: ${input.subject || ''}`;
    case 'TaskUpdate':
      return `Update task: ${input.taskId || ''}${input.status ? ` → ${input.status}` : ''}`;
    case 'TaskList':
      return 'List tasks';
    case 'TaskGet':
      return `Get task: ${input.taskId || ''}`;
    case 'EnterPlanMode':
      return 'Enter plan mode';
    case 'ExitPlanMode':
      return 'Exit plan mode';
    default:
      // Notion MCP tools
      if (name.includes('notion')) {
        if (name.includes('search')) return `Notion search: ${input.query || ''}`;
        if (name.includes('fetch')) return `Notion fetch: ${String(input.id || '').substring(0, 80)}`;
        if (name.includes('create-pages')) return `Notion create page`;
        if (name.includes('update-page')) return `Notion update: ${input.command || ''}`;
        if (name.includes('create-database')) return `Notion create DB: ${input.title || ''}`;
        if (name.includes('get-comments')) return `Notion get comments`;
        if (name.includes('create-comment')) return `Notion add comment`;
        return `${name.split('__').pop() || name}`;
      }
      return JSON.stringify(input, null, 2);
  }
}

function generateTitle(firstMessage: string): string {
  if (!firstMessage) return 'Untitled Session';
  // Take first line, truncate to 80 chars
  const firstLine = firstMessage.split('\n')[0].replace(/^#+\s*/, '').trim();
  if (firstLine.length <= 80) return firstLine;
  return firstLine.substring(0, 77) + '...';
}

function extractProjectName(cwd: string): string {
  if (!cwd) return '';
  const parts = cwd.split('/');
  return parts[parts.length - 1] || '';
}
