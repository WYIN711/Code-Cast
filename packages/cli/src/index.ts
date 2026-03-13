import { Command } from 'commander';
import { parseSession } from './parsers/index.js';
import { redactSession } from './redact/index.js';
import { uploadSession } from './upload.js';
import { getAuth, saveAuth, clearAuth } from './auth.js';
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
      // Resolve file path
      let filePath: string;
      if (file) {
        filePath = resolve(file);
      } else {
        spinner.start('Finding latest session...');
        filePath = findLatestSession();
        spinner.succeed(`Found session: ${filePath.split('/').pop()}`);
      }

      // Parse
      spinner.start('Parsing session...');
      const parsed = parseSession(filePath);
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

      console.log('\n' + chalk.green.bold('Share link: ') + chalk.cyan.underline(result.url));
      console.log(chalk.dim(`ID: ${result.id}`));
    } catch (err: unknown) {
      spinner.fail((err as Error).message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List recent local sessions')
  .option('-n, --count <n>', 'Number of sessions to show', '10')
  .option('--source <type>', 'Filter by source: claude-code, codex, all', 'all')
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
      const size = (s.size / 1024).toFixed(0) + ' KB';
      const label = s.source === 'claude-code'
        ? chalk.blue('[Claude Code]')
        : chalk.green('[Codex]');
      console.log(`  ${label} ${chalk.dim(date)} ${chalk.white(s.name)} ${chalk.dim(size)}`);
      console.log(`    ${chalk.dim(s.path)}`);
    }
    console.log();
  });

program
  .command('parse')
  .description('Parse a session file and output JSON (for debugging)')
  .argument('<file>', 'Path to session JSONL file')
  .action((file: string) => {
    const parsed = parseSession(resolve(file));
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

program.parse();

// --- Helpers ---

interface SessionInfo {
  name: string;
  path: string;
  source: 'claude-code' | 'codex';
  mtime: number;
  size: number;
}

function findLatestSession(): string {
  const sessions = listSessions('all', 1);
  if (sessions.length === 0) {
    throw new Error('No sessions found. Provide a file path explicitly.');
  }
  return sessions[0].path;
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
