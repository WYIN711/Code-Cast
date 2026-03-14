import { readFileSync } from 'fs';
import type { ParsedSession, SessionEntry, SessionMetadata } from './types.js';

interface OpenClawLine {
  type: string;
  id?: string;
  version?: number;
  cwd?: string;
  timestamp?: string;
  parentId?: string;
  message?: {
    role?: string;
    model?: string;
    content?: string | ContentBlock[];
    usage?: {
      input?: number;
      output?: number;
      totalTokens?: number;
      cost?: { total?: number };
    };
  };
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
  // toolCall uses 'toolName' instead of 'name'
  toolName?: string;
  // toolResult fields
  toolCallId?: string;
  result?: string;
  output?: string;
  isError?: boolean;
  // bashExecution fields
  command?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
}

/**
 * Parse an OpenClaw session JSONL file into the unified transcript format.
 */
export function parseOpenClawSession(filePath: string): ParsedSession {
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
    let obj: OpenClawLine;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }

    // Session header line
    if (obj.type === 'session') {
      sessionId = obj.id || '';
      project = obj.cwd || '';
      version = obj.version ? String(obj.version) : '';
      if (obj.timestamp) {
        startedAt = obj.timestamp;
        endedAt = obj.timestamp;
      }
      continue;
    }

    // Skip non-message entries
    if (obj.type !== 'message') continue;

    const msg = obj.message;
    if (!msg) continue;

    if (obj.timestamp) {
      if (!startedAt) startedAt = obj.timestamp;
      endedAt = obj.timestamp;
    }

    if (msg.model && !model) model = msg.model;

    const role = msg.role;

    if (role === 'user') {
      const content = msg.content;
      if (typeof content === 'string') {
        const cleaned = stripBotMetadata(content);
        if (cleaned) {
          if (!firstUserMessage) firstUserMessage = cleaned;
          entries.push({
            type: 'user',
            timestamp: obj.timestamp || '',
            content: cleaned,
          });
        }
      } else if (Array.isArray(content)) {
        for (const block of content) {
          if (block.type === 'text' && block.text) {
            const cleaned = stripBotMetadata(block.text);
            if (cleaned) {
              if (!firstUserMessage) firstUserMessage = cleaned;
              entries.push({
                type: 'user',
                timestamp: obj.timestamp || '',
                content: cleaned,
              });
            }
          }
        }
      }
    }

    if (role === 'assistant') {
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
        } else if (block.type === 'toolCall' && (block.toolName || block.name)) {
          const toolName = block.toolName || block.name || '';
          const toolId = block.id || '';
          pendingToolCalls.set(toolId, toolName);
          entries.push({
            type: 'tool_call',
            timestamp: obj.timestamp || '',
            content: formatToolCallContent(toolName, block.input),
            toolName,
            toolCallId: toolId,
            toolInput: block.input,
          });
        } else if (block.type === 'tool_use' && block.name) {
          // Fallback for tool_use format
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

    if (role === 'toolResult') {
      const content = msg.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          const toolId = block.toolCallId || block.tool_use_id || '';
          const toolName = pendingToolCalls.get(toolId) || 'unknown';
          const resultContent = block.result || block.output || block.text ||
            (typeof block.content === 'string' ? block.content : '') || '';
          const isError = block.isError === true || resultContent.includes('Error');
          entries.push({
            type: 'tool_result',
            timestamp: obj.timestamp || '',
            content: resultContent,
            toolCallId: toolId,
            toolName,
            status: isError ? 'error' : 'success',
          });
          pendingToolCalls.delete(toolId);
        }
      } else if (typeof content === 'string') {
        // Simple string result — try to match to last pending tool call
        const lastToolId = Array.from(pendingToolCalls.keys()).pop() || '';
        const toolName = pendingToolCalls.get(lastToolId) || 'unknown';
        entries.push({
          type: 'tool_result',
          timestamp: obj.timestamp || '',
          content,
          toolCallId: lastToolId,
          toolName,
          status: content.includes('Error') ? 'error' : 'success',
        });
        if (lastToolId) pendingToolCalls.delete(lastToolId);
      }
    }

    if (role === 'bashExecution') {
      const content = msg.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          const command = block.command || '';
          const toolId = block.id || `bash-${obj.id || ''}`;
          const stdout = block.stdout || '';
          const stderr = block.stderr || '';
          const exitCode = block.exitCode;
          const isError = exitCode !== undefined && exitCode !== 0;

          entries.push({
            type: 'tool_call',
            timestamp: obj.timestamp || '',
            content: command,
            toolName: 'Bash',
            toolCallId: toolId,
            toolInput: { command },
          });

          const output = stderr ? `${stdout}\n${stderr}`.trim() : stdout;
          entries.push({
            type: 'tool_result',
            timestamp: obj.timestamp || '',
            content: output || (isError ? `Exit code: ${exitCode}` : ''),
            toolCallId: toolId,
            toolName: 'Bash',
            status: isError ? 'error' : 'success',
          });
        }
      }
    }
  }

  const title = generateTitle(firstUserMessage);

  const metadata: SessionMetadata = {
    agent: 'openclaw',
    sessionId,
    title,
    project: extractProjectName(project),
    cwd: project,
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

function stripBotMetadata(text: string): string {
  return text
    .replace(/Conversation info \(untrusted metadata\):\n```json\n[\s\S]*?```\n\n?/g, '')
    .replace(/Sender \(untrusted metadata\):\n```json\n[\s\S]*?```\n\n?/g, '')
    .trim();
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
