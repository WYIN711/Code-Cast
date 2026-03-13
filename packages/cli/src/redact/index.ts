import type { ParsedSession, RedactionSummary, SessionEntry } from '../parsers/types.js';

/**
 * Redaction rule: a regex pattern + category label.
 * Designed for easy extension — just add more rules to the array.
 */
interface RedactionRule {
  name: string;
  pattern: RegExp;
  replacement: string | ((...args: string[]) => string);
}

/**
 * Static rules that don't depend on session context.
 */
const STATIC_RULES: RedactionRule[] = [
  // API keys and tokens
  {
    name: 'api_key',
    pattern: /(?:sk|pk|api|key|token|bearer|secret|password|auth)[-_]?[a-zA-Z0-9]{20,}/gi,
    replacement: '[REDACTED_KEY]',
  },
  {
    name: 'api_key',
    pattern: /(?:AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}/g,
    replacement: '[REDACTED_AWS_KEY]',
  },
  {
    name: 'bearer_token',
    pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
    replacement: 'Bearer [REDACTED_TOKEN]',
  },
  // Environment variable values in common formats
  {
    name: 'env_value',
    pattern: /(?:^|\s)([A-Z_]{2,50})=["']?([^\s"']{20,})["']?/gm,
    replacement: (_match: string, key: string) => `${key}=[REDACTED]`,
  },
  // Email addresses
  {
    name: 'email',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[REDACTED_EMAIL]',
  },
  // Private git URLs (with credentials)
  {
    name: 'git_url',
    pattern: /https?:\/\/[^@\s]+@[^\s]+\.git/g,
    replacement: '[REDACTED_GIT_URL]',
  },
  {
    name: 'git_url',
    pattern: /git@[^\s:]+:[^\s]+\.git/g,
    replacement: '[REDACTED_GIT_URL]',
  },
  // JWT tokens
  {
    name: 'jwt',
    pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    replacement: '[REDACTED_JWT]',
  },
  // Long hex/base64 strings that look like secrets (40+ chars)
  {
    name: 'secret_string',
    pattern: /(?<![a-zA-Z0-9/])[A-Za-z0-9+/]{40,}={0,2}(?![a-zA-Z0-9/])/g,
    replacement: '[REDACTED_SECRET]',
  },
  // IP addresses (private)
  {
    name: 'ip_address',
    pattern: /\b(?:10|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/g,
    replacement: '[REDACTED_IP]',
  },
];

/**
 * Build path-stripping rules based on the session's cwd.
 *
 * Strategy: replace all absolute paths that start with or contain the cwd
 * (or its parent directories) with paths relative to the project root.
 *
 * Example:
 *   cwd = "/Users/williamydh/VibeCoding/BoboGPT"
 *   Input:  "/Users/williamydh/VibeCoding/BoboGPT/packages/api/index.ts"
 *   Output: "packages/api/index.ts"
 */
function buildPathRules(cwd?: string): RedactionRule[] {
  if (!cwd) {
    // Fallback: just strip home dir username
    return [
      { name: 'file_path', pattern: /\/Users\/[a-zA-Z0-9._-]+\/[^\s"',;)>\]]+/g, replacement: '[PATH_REDACTED]' },
      { name: 'file_path', pattern: /\/home\/[a-zA-Z0-9._-]+\/[^\s"',;)>\]]+/g, replacement: '[PATH_REDACTED]' },
      { name: 'file_path', pattern: /C:\\Users\\[a-zA-Z0-9._-]+\\[^\s"',;)>\]]+/gi, replacement: '[PATH_REDACTED]' },
    ];
  }

  const rules: RedactionRule[] = [];

  // Normalize: ensure cwd ends without slash
  const cwdNorm = cwd.replace(/\/+$/, '');

  // Rule 1: Replace cwd prefix + "/" with nothing (convert to relative path)
  // This handles: /Users/xxx/VibeCoding/BoboGPT/packages/... → packages/...
  rules.push({
    name: 'file_path',
    pattern: new RegExp(escapeRegExp(cwdNorm) + '/', 'g'),
    replacement: '',
  });

  // Rule 2: Replace bare cwd reference (no trailing slash)
  rules.push({
    name: 'file_path',
    pattern: new RegExp(escapeRegExp(cwdNorm) + '(?=[\\s"\'`,;)>\\]|$])', 'g'),
    replacement: '.',
  });

  // Rule 3: Strip all parent directories above cwd
  // e.g., if cwd = /Users/xxx/VibeCoding/BoboGPT
  // also catch /Users/xxx/VibeCoding/OtherProject/... → [REDACTED_PATH]/OtherProject/...
  // We strip everything up to and including the parent of cwd's last component
  const parentDir = cwdNorm.substring(0, cwdNorm.lastIndexOf('/'));
  if (parentDir && parentDir !== '/') {
    rules.push({
      name: 'file_path',
      pattern: new RegExp(escapeRegExp(parentDir) + '/', 'g'),
      replacement: '',
    });

    // Rule 4: Go one more level up and strip any remaining ancestor prefixes
    // This catches things like /Users/xxx/ references that aren't under cwd
    const grandparentDir = parentDir.substring(0, parentDir.lastIndexOf('/'));
    if (grandparentDir && grandparentDir !== '/') {
      rules.push({
        name: 'file_path',
        pattern: new RegExp(escapeRegExp(grandparentDir) + '/[a-zA-Z0-9._-]+/', 'g'),
        replacement: '',
      });
    }
  }

  // Rule 5: Catch any remaining home directory paths that weren't caught above
  // (e.g., completely unrelated paths on the same machine)
  rules.push(
    { name: 'file_path', pattern: /\/Users\/[a-zA-Z0-9._-]+\/[^\s"',;)>\]]+/g, replacement: '[REDACTED_PATH]' },
    { name: 'file_path', pattern: /\/home\/[a-zA-Z0-9._-]+\/[^\s"',;)>\]]+/g, replacement: '[REDACTED_PATH]' },
    { name: 'file_path', pattern: /C:\\Users\\[a-zA-Z0-9._-]+\\[^\s"',;)>\]]+/gi, replacement: '[REDACTED_PATH]' },
  );

  return rules;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Apply all redaction rules to a string.
 */
function redactString(text: string, rules: RedactionRule[], counts: Record<string, number>): string {
  let result = text;
  for (const rule of rules) {
    const before = result;
    if (typeof rule.replacement === 'function') {
      result = result.replace(rule.pattern, rule.replacement as (...args: string[]) => string);
    } else {
      result = result.replace(rule.pattern, rule.replacement);
    }
    if (result !== before) {
      // Count matches more accurately
      const matches = before.match(rule.pattern);
      const hitCount = matches ? matches.length : 1;
      counts[rule.name] = (counts[rule.name] || 0) + hitCount;
    }
  }
  return result;
}

/**
 * Redact sensitive information from an entry.
 */
function redactEntry(entry: SessionEntry, rules: RedactionRule[], counts: Record<string, number>): SessionEntry {
  return {
    ...entry,
    content: redactString(entry.content, rules, counts),
    toolInput: entry.toolInput
      ? (() => { try { return JSON.parse(redactString(JSON.stringify(entry.toolInput), rules, counts)); } catch { return entry.toolInput; } })()
      : undefined,
  };
}

/**
 * Redact a full parsed session. Returns a new session with redacted content
 * and a summary of what was redacted.
 *
 * Uses the session's cwd to convert absolute paths to relative paths,
 * stripping all directory structure above the project root.
 */
export function redactSession(session: ParsedSession): { session: ParsedSession; summary: RedactionSummary } {
  const counts: Record<string, number> = {};

  // Build context-aware path rules from cwd, then append static rules
  const pathRules = buildPathRules(session.metadata.cwd);
  const allRules = [...pathRules, ...STATIC_RULES];

  const redactedEntries = session.entries.map(e => redactEntry(e, allRules, counts));

  // Redact metadata (title may contain paths)
  const redactedMetadata = {
    ...session.metadata,
    title: redactString(session.metadata.title, allRules, counts),
    // cwd is internal-only, strip it from published output
    cwd: undefined,
  };

  const totalRedactions = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    session: {
      metadata: redactedMetadata,
      entries: redactedEntries,
    },
    summary: {
      totalRedactions,
      categories: counts,
    },
  };
}
