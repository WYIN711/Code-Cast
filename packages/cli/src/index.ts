import { Command } from 'commander';
import { parseSession, listOpenCodeSessions } from './parsers/index.js';
import { redactSession } from './redact/index.js';
import { uploadSession } from './upload.js';
import { generateAITitle } from './ai-title.js';
import { getAuth, saveAuth, clearAuth, getToken } from './auth.js';
import { addToHistory, getHistory, findInHistory, removeFromHistory } from './history.js';
import { nanoid } from 'nanoid';
import chalk from 'chalk';
import ora from 'ora';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { createServer } from 'http';

const program = new Command();

program
  .name('codecast')
  .description('Share AI coding sessions as beautiful web pages')
  .version('0.1.0');

program
  .command('publish')
  .description('Publish a session file as a shareable link')
  .argument('[file]', 'Path to session JSONL file (auto-detects latest if omitted)')
  .option('-s, --server <url>', 'Server URL', process.env.CODECAST_SERVER || 'https://code-cast.dev')
  .option('-v, --visibility <type>', 'public or unlisted', 'unlisted')
  .option('--no-redact', 'Skip redaction (not recommended)')
  .option('--dry-run', 'Parse and redact but do not upload')
  .option('--expire <days>', 'Expire after N days')
  .action(async (file: string | undefined, options) => {
    const spinner = ora();

    try {
      // Resolve session
      let sessionInfo: SessionInfo;
      if (file) {
        sessionInfo = {
          name: file.split('/').pop() || file,
          path: resolve(file),
          source: 'claude-code', // will be auto-detected by parseSession
          mtime: Date.now(),
          size: 0,
        };
      } else {
        spinner.start('Finding latest session...');
        sessionInfo = findLatestSessionInfo();
        spinner.succeed(`Found session: ${sessionInfo.name}`);
      }

      // Parse
      spinner.start('Parsing session...');
      const parsed = parseSession(sessionInfo.path, sessionInfo.openCodeSessionId);
      spinner.succeed(`Parsed ${parsed.entries.length} entries (${parsed.metadata.agent})`);

      // Redact
      let finalSession = parsed;
      if (options.redact !== false) {
        spinner.start('Redacting sensitive information...');
        const { session: redacted, summary } = redactSession(parsed);
        finalSession = redacted;

        if (summary.totalRedactions > 0) {
          const details = Object.entries(summary.categories)
            .map(([k, v]) => `${v} ${k}`)
            .join(', ');
          spinner.succeed(`Redacted: ${details}`);
        } else {
          spinner.succeed('No sensitive information detected');
        }
      }

      // AI title generation
      if (process.env.ANTHROPIC_API_KEY) {
        spinner.start('Generating title...');
        const aiTitle = await generateAITitle(finalSession.entries);
        if (aiTitle) {
          finalSession = {
            ...finalSession,
            metadata: { ...finalSession.metadata, title: aiTitle },
          };
          spinner.succeed(`Title: ${aiTitle}`);
        } else {
          spinner.warn('AI title failed, using default');
        }
      }

      // Build SharedSession payload
      let expiresAt: string | undefined;
      if (options.expire) {
        const days = parseInt(options.expire, 10);
        if (isNaN(days) || days < 1 || days > 365) {
          throw new Error('--expire must be between 1 and 365 days');
        }
        expiresAt = new Date(Date.now() + days * 86400000).toISOString();
      }

      const shared = {
        id: nanoid(12),
        ...finalSession,
        visibility: options.visibility as 'public' | 'unlisted',
        createdAt: new Date().toISOString(),
        expiresAt,
      };

      if (options.dryRun) {
        console.log('\n' + chalk.yellow('Dry run — session not uploaded'));
        console.log(chalk.dim(JSON.stringify(shared.metadata, null, 2)));
        console.log(chalk.dim(`\nEntries: ${shared.entries.length}`));
        return;
      }

      // Upload
      spinner.start('Publishing...');
      const result = await uploadSession(shared, options.server);
      spinner.succeed('Published!');

      // Save to history
      addToHistory({
        id: result.id,
        url: result.url,
        manageToken: result.manageToken,
        createdAt: new Date().toISOString(),
        server: options.server,
      });

      console.log('\n' + chalk.green.bold('Share link: ') + chalk.cyan.underline(result.url));
      console.log(chalk.dim(`ID: ${result.id}`));

      const authInfo = getAuth();
      if (authInfo) {
        // Logged-in: show profile link
        const profileUrl = `${options.server}/@${authInfo.username}`;
        console.log(chalk.dim(`Profile: ${profileUrl}`));
      } else if (result.manageToken) {
        // Anonymous: show manage link
        console.log(chalk.dim(`Manage: ${result.url}?key=${result.manageToken}`));
      }
    } catch (err: unknown) {
      spinner.fail((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List recent local sessions')
  .option('-n, --count <n>', 'Number of sessions to show', '10')
  .option('--source <type>', 'Filter by source: claude-code, codex, openclaw, opencode, gemini-cli, all', 'all')
  .action((options) => {
    const count = parseInt(options.count, 10);
    const sessions = listSessions(options.source, isNaN(count) || count < 1 ? 10 : count);
    if (sessions.length === 0) {
      console.log(chalk.yellow('No sessions found.'));
      return;
    }

    console.log(chalk.bold('\nRecent sessions:\n'));
    for (const s of sessions) {
      const date = new Date(s.mtime).toLocaleString();
      const size = s.size > 0 ? (s.size / 1024).toFixed(0) + ' KB' : '';
      const label = sourceLabel(s.source);
      const sizeStr = size ? ' ' + chalk.dim(size) : '';
      console.log(`  ${label} ${chalk.dim(date)} ${chalk.white(s.name)}${sizeStr}`);
      console.log(`    ${chalk.dim(s.path)}`);
    }
    console.log();
  });

program
  .command('parse')
  .description('Parse a session file and output JSON (for debugging)')
  .argument('<file>', 'Path to session file')
  .option('--session-id <id>', 'Session ID (required for OpenCode .db files)')
  .action((file: string, options) => {
    const parsed = parseSession(resolve(file), options.sessionId);
    console.log(JSON.stringify(parsed, null, 2));
  });

program
  .command('login')
  .description('Authenticate with your CodeCast account via GitHub')
  .option('-s, --server <url>', 'Server URL', process.env.CODECAST_SERVER || 'https://code-cast.dev')
  .action(async (options) => {
    const spinner = ora();
    try {
      // Start temporary local server to receive the token callback
      const port = 9876;
      const callbackUrl = `http://localhost:${port}/callback`;

      const tokenPromise = new Promise<{ token: string; username: string }>((resolve, reject) => {
        const server = createServer((req, res) => {
          const url = new URL(req.url || '/', `http://localhost:${port}`);
          if (url.pathname === '/callback') {
            const token = url.searchParams.get('token');
            const username = url.searchParams.get('username');
            if (token && username) {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end('<html><body><h2>Logged in! You can close this tab.</h2></body></html>');
              server.close();
              resolve({ token, username });
            } else {
              res.writeHead(400, { 'Content-Type': 'text/html' });
              res.end('<html><body><h2>Login failed.</h2></body></html>');
              server.close();
              reject(new Error('No token received'));
            }
          }
        });
        server.listen(port);
        setTimeout(() => { server.close(); reject(new Error('Login timed out')); }, 120000);
      });

      const loginUrl = `${options.server}/api/auth/cli-token?callback=${encodeURIComponent(callbackUrl)}`;
      console.log(chalk.dim('Opening browser for GitHub login...'));
      console.log(chalk.dim(`If it doesn't open, visit: ${loginUrl}`));

      // Open browser (safe: no shell interpolation)
      const { execFile } = await import('child_process');
      const openCmd = process.platform === 'darwin' ? 'open'
        : process.platform === 'win32' ? 'start'
        : 'xdg-open';
      execFile(openCmd, [loginUrl]);

      spinner.start('Waiting for login...');
      const { token, username } = await tokenPromise;

      saveAuth({ token, username, server: options.server });
      spinner.succeed(`Logged in as ${chalk.green.bold(username)}`);
    } catch (err: unknown) {
      spinner.fail((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('logout')
  .description('Remove stored authentication')
  .action(() => {
    clearAuth();
    console.log(chalk.dim('Logged out.'));
  });

program
  .command('whoami')
  .description('Show current authenticated user')
  .action(() => {
    const auth = getAuth();
    if (!auth) {
      console.log(chalk.yellow('Not logged in. Run `codecast login` to authenticate.'));
      return;
    }
    console.log(chalk.green.bold(auth.username));
    console.log(chalk.dim(`Server: ${auth.server}`));
  });

program
  .command('delete')
  .description('Delete a published session')
  .argument('<id>', 'Session ID to delete')
  .option('-s, --server <url>', 'Server URL', process.env.CODECAST_SERVER || 'https://code-cast.dev')
  .action(async (id: string, options) => {
    const spinner = ora();
    try {
      const base = options.server;
      const headers: Record<string, string> = {};

      // Try CLI auth token first
      const token = getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Also try manage token from history
      const historyEntry = findInHistory(id);
      if (historyEntry?.manageToken) {
        headers['X-Manage-Token'] = historyEntry.manageToken;
      }

      if (!token && !historyEntry?.manageToken) {
        console.log(chalk.red('No auth token or manage token found for this session.'));
        console.log(chalk.dim('Log in with `codecast login` or use a session you published from this machine.'));
        process.exit(1);
      }

      spinner.start('Deleting...');
      const response = await fetch(`${base}/api/share/${id}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error');
        throw new Error(`Delete failed (${response.status}): ${text}`);
      }

      removeFromHistory(id);
      spinner.succeed(`Deleted session ${chalk.dim(id)}`);
    } catch (err: unknown) {
      spinner.fail((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('history')
  .description('Show upload history')
  .option('-n, --count <n>', 'Number of entries to show', '20')
  .action((options) => {
    const count = parseInt(options.count, 10);
    const history = getHistory();
    const entries = history.slice(0, isNaN(count) || count < 1 ? 20 : count);

    if (entries.length === 0) {
      console.log(chalk.yellow('No upload history. Publish a session first.'));
      return;
    }

    console.log(chalk.bold('\nUpload history:\n'));
    for (const entry of entries) {
      const date = new Date(entry.createdAt).toLocaleString();
      console.log(`  ${chalk.dim(date)}  ${chalk.white(entry.id)}`);
      console.log(`    ${chalk.cyan.underline(entry.url)}`);
    }
    console.log();
  });

program.parse();

// --- Helpers ---

interface SessionInfo {
  name: string;
  path: string;
  source: 'claude-code' | 'codex' | 'openclaw' | 'opencode' | 'gemini-cli';
  mtime: number;
  size: number;
  /** For OpenCode sessions: the session ID within the SQLite database */
  openCodeSessionId?: string;
}

function sourceLabel(source: string): string {
  switch (source) {
    case 'claude-code': return chalk.blue('[Claude Code]');
    case 'codex': return chalk.green('[Codex]');
    case 'openclaw': return chalk.magenta('[OpenClaw]');
    case 'opencode': return chalk.yellow('[OpenCode]');
    case 'gemini-cli': return chalk.cyan('[Gemini CLI]');
    default: return chalk.dim(`[${source}]`);
  }
}

function findLatestSessionInfo(): SessionInfo {
  const sessions = listSessions('all', 1);
  if (sessions.length === 0) {
    throw new Error('No sessions found. Provide a file path explicitly.');
  }
  return sessions[0];
}

function listSessions(source: string, limit: number): SessionInfo[] {
  const results: SessionInfo[] = [];

  // Claude Code sessions
  if (source === 'all' || source === 'claude-code') {
    const claudeDir = join(homedir(), '.claude', 'projects');
    if (existsSync(claudeDir)) {
      for (const projectDir of readdirSync(claudeDir)) {
        const projectPath = join(claudeDir, projectDir);
        try {
          const stat = statSync(projectPath);
          if (!stat.isDirectory()) continue;
        } catch {
          continue;
        }
        for (const file of readdirSync(projectPath)) {
          if (!file.endsWith('.jsonl')) continue;
          const fullPath = join(projectPath, file);
          try {
            const stat = statSync(fullPath);
            results.push({
              name: file,
              path: fullPath,
              source: 'claude-code',
              mtime: stat.mtimeMs,
              size: stat.size,
            });
          } catch {
            continue;
          }
        }
      }
    }
  }

  // Codex sessions
  if (source === 'all' || source === 'codex') {
    const codexDir = join(homedir(), '.codex', 'sessions');
    if (existsSync(codexDir)) {
      walkDir(codexDir, (filePath) => {
        if (!filePath.endsWith('.jsonl')) return;
        try {
          const stat = statSync(filePath);
          results.push({
            name: filePath.split('/').pop() || '',
            path: filePath,
            source: 'codex',
            mtime: stat.mtimeMs,
            size: stat.size,
          });
        } catch {
          // skip
        }
      });
    }
  }

  // OpenClaw sessions
  if (source === 'all' || source === 'openclaw') {
    const openclawDir = join(homedir(), '.openclaw', 'agents');
    if (existsSync(openclawDir)) {
      for (const agentDir of readdirSync(openclawDir)) {
        const sessionsDir = join(openclawDir, agentDir, 'sessions');
        try {
          if (!existsSync(sessionsDir) || !statSync(sessionsDir).isDirectory()) continue;
        } catch {
          continue;
        }
        for (const file of readdirSync(sessionsDir)) {
          if (!file.endsWith('.jsonl')) continue;
          const fullPath = join(sessionsDir, file);
          try {
            const stat = statSync(fullPath);
            results.push({
              name: file,
              path: fullPath,
              source: 'openclaw',
              mtime: stat.mtimeMs,
              size: stat.size,
            });
          } catch {
            continue;
          }
        }
      }
    }
  }

  // OpenCode sessions (SQLite database)
  if (source === 'all' || source === 'opencode') {
    const openCodeDbPath = join(homedir(), '.local', 'share', 'opencode', 'opencode.db');
    if (existsSync(openCodeDbPath)) {
      try {
        const sessions = listOpenCodeSessions(openCodeDbPath);
        for (const s of sessions) {
          results.push({
            name: s.title,
            path: openCodeDbPath,
            source: 'opencode',
            mtime: s.mtime,
            size: 0,
            openCodeSessionId: s.id,
          });
        }
      } catch {
        // skip if db is locked or corrupted
      }
    }
  }

  // Gemini CLI sessions (JSON files)
  if (source === 'all' || source === 'gemini-cli') {
    const geminiDir = join(homedir(), '.gemini', 'tmp');
    if (existsSync(geminiDir)) {
      try {
        for (const projectHash of readdirSync(geminiDir)) {
          const chatsDir = join(geminiDir, projectHash, 'chats');
          try {
            if (!existsSync(chatsDir) || !statSync(chatsDir).isDirectory()) continue;
          } catch {
            continue;
          }
          for (const file of readdirSync(chatsDir)) {
            if (!file.startsWith('session-') || !file.endsWith('.json')) continue;
            const fullPath = join(chatsDir, file);
            try {
              const stat = statSync(fullPath);
              results.push({
                name: file,
                path: fullPath,
                source: 'gemini-cli',
                mtime: stat.mtimeMs,
                size: stat.size,
              });
            } catch {
              continue;
            }
          }
        }
      } catch {
        // skip
      }
    }
  }

  // Sort by modification time, most recent first
  results.sort((a, b) => b.mtime - a.mtime);
  return results.slice(0, limit);
}

function walkDir(dir: string, callback: (path: string) => void) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath, callback);
      } else {
        callback(fullPath);
      }
    } catch {
      continue;
    }
  }
}
