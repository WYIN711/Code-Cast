'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';
const THEME_KEY = 'theme';

interface Entry {
  type: 'user' | 'assistant' | 'tool_call' | 'tool_result' | 'thinking' | 'system';
  timestamp: string;
  content: string;
  toolName?: string;
  toolCallId?: string;
  status?: 'success' | 'error';
  toolInput?: Record<string, unknown>;
}

interface SessionData {
  id: string;
  metadata: {
    agent: string;
    sessionId: string;
    title: string;
    project?: string;
    model?: string;
    startedAt: string;
    endedAt: string;
    version?: string;
    entryCount: number;
  };
  entries: Entry[];
  visibility: string;
  createdAt: string;
  viewCount: number;
}

export function SessionViewer({ session, isOwner = false, canManage = false, manageToken }: { session: SessionData; isOwner?: boolean; canManage?: boolean; manageToken?: string }) {
  const [search, setSearch] = useState('');
  const [showThinking, setShowThinking] = useState(false);
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedDark, setResolvedDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      setTheme(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);

    const apply = (dark: boolean) => {
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      setResolvedDark(dark);
    };

    if (theme === 'light') { apply(false); return; }
    if (theme === 'dark') { apply(true); return; }

    // system
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const cycleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light');
  };

  const themeLabel = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'System';

  const groups = useMemo(() => groupEntries(session.entries), [session.entries]);

  const filtered = useMemo(() => {
    if (!search) return groups;
    const q = search.toLowerCase();
    return groups.filter(g =>
      g.entries.some(e => e.content.toLowerCase().includes(q))
    );
  }, [groups, search]);

  const stats = useMemo(() => {
    const toolCalls = session.entries.filter(e => e.type === 'tool_call').length;
    const userMsgs = session.entries.filter(e => e.type === 'user').length;
    const filesChanged = new Set(
      session.entries
        .filter(e => e.type === 'tool_call' && (e.toolName === 'Write' || e.toolName === 'Edit'))
        .map(e => e.content.split('\n')[0])
    ).size;
    const duration = getDuration(session.metadata.startedAt, session.metadata.endedAt);
    return { toolCalls, userMsgs, filesChanged, duration };
  }, [session]);

  const agentLabel = session.metadata.agent === 'claude-code' ? 'Claude Code'
    : session.metadata.agent === 'codex' ? 'Codex' : session.metadata.agent;
  const date = new Date(session.metadata.startedAt).toLocaleDateString();

  return (
    <div className="page" style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 0', borderBottom: '1px solid var(--border-light)',
      }}>
        <a href="/" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          textDecoration: 'none', fontSize: 14, fontWeight: 600, color: 'var(--text)',
        }}>
          <img src={resolvedDark ? '/logo-light.svg' : '/logo.svg'} alt="CodeCast" width={24} height={24} style={{ borderRadius: 6 }} />
          CodeCast
        </a>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={cycleTheme}
            style={{
              padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: 'var(--bg)', border: '1px solid var(--border)',
              color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >{themeLabel}</button>
          <button
            onClick={() => {
              const data = JSON.stringify({ metadata: session.metadata, entries: session.entries }, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = `${session.id}.json`; a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500,
              background: 'var(--bg)', border: '1px solid var(--border)',
              color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >Raw JSON</button>
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            style={{
              padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: 'var(--text)', border: '1px solid var(--text)',
              color: 'var(--bg)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}
          >Copy Link</button>
        </div>
      </nav>

      {/* Owner Controls */}
      {(isOwner || canManage) && <OwnerControls sessionId={session.id} visibility={session.visibility} manageToken={manageToken} />}

      {/* Header */}
      <div style={{ padding: '32px 0 24px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 13, color: 'var(--text-3)', marginBottom: 12,
        }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500,
            background: 'var(--bg-2)', border: '1px solid var(--border-light)',
            color: 'var(--text-2)', fontFamily: 'var(--font-mono)',
          }}>{agentLabel}</span>
          <span>/</span>
          {session.metadata.model && <span>{session.metadata.model}</span>}
        </div>
        <h1 style={{
          fontSize: 24, fontWeight: 700, letterSpacing: '-0.025em',
          lineHeight: 1.4, marginBottom: 12, color: 'var(--text)',
        }}>
          {session.metadata.title}
        </h1>
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 16,
          fontSize: 12, color: 'var(--text-3)',
        }}>
          {session.metadata.project && <span>{session.metadata.project}</span>}
          <span>{stats.duration}</span>
          <span>{stats.userMsgs} messages &middot; {stats.toolCalls} tool calls</span>
          <span>{date}</span>
        </div>
      </div>

      {/* Stats Bar */}
      <div style={{
        display: 'flex', gap: 24, padding: '16px 0',
        borderBottom: '1px solid var(--border-light)', marginBottom: 24,
      }}>
        <StatItem n={stats.userMsgs} label="Messages" />
        <StatItem n={stats.toolCalls} label="Tool Calls" />
        <StatItem n={stats.filesChanged} label="Files" />
        <StatItem n={stats.duration} label="Duration" />
      </div>

      {/* Search & Controls */}
      <div style={{
        display: 'flex', gap: 8, padding: '12px 0 20px',
        borderBottom: '1px solid var(--border-light)', marginBottom: 0,
      }}>
        <input
          type="text"
          placeholder="Search in session..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 180, padding: '8px 12px',
            background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6,
            color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none',
          }}
        />
        <button
          onClick={() => setShowThinking(!showThinking)}
          style={{
            padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
            background: showThinking ? 'var(--bg-3)' : 'var(--bg)',
            border: `1px solid ${showThinking ? 'var(--text-3)' : 'var(--border)'}`,
            color: showThinking ? 'var(--text)' : 'var(--text-2)',
            cursor: 'pointer', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap',
          }}
        >
          {showThinking ? 'Hide Thinking' : 'Thinking'}
        </button>
      </div>

      {/* Entries */}
      <div style={{ paddingBottom: 60 }}>
        {filtered.map((group, idx) => {
          if (group.type === 'thinking' && !showThinking) {
            // Show collapsed thinking line
            const entry = group.entries[0];
            return (
              <div key={idx} style={{ padding: '20px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, background: 'var(--border)', color: 'var(--text-3)',
                    }}>T</span>
                    <span style={{ color: 'var(--text-3)' }}>Thinking</span>
                  </span>
                  {entry.timestamp && <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{formatTime(entry.timestamp)}</span>}
                </div>
                <span
                  onClick={() => setShowThinking(true)}
                  style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic', cursor: 'pointer' }}
                >
                  {entry.content.substring(0, 100).split('\n')[0]}...
                </span>
              </div>
            );
          }
          if (group.type === 'thinking' && showThinking) {
            return <ThinkingEntry key={idx} entry={group.entries[0]} />;
          }
          if (group.type === 'tool_group') {
            return <ToolGroup key={idx} entries={group.entries} />;
          }
          const entry = group.entries[0];
          return <EntryCard key={idx} entry={entry} />;
        })}
      </div>

      {/* Footer */}
      <footer style={{
        padding: '24px 0', textAlign: 'center', fontSize: 11,
        color: 'var(--text-3)', borderTop: '1px solid var(--border-light)',
      }}>
        Shared via <a href="/" style={{ color: 'var(--text-2)', textDecoration: 'underline', textUnderlineOffset: 2 }}>CodeCast</a>
      </footer>
    </div>
  );
}

function StatItem({ n, label }: { n: number | string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{n}</div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  const config = AVATAR_CONFIG[entry.type] || AVATAR_CONFIG.system;
  const needsTruncation = entry.content.length >= 600;
  const [expanded, setExpanded] = useState(!needsTruncation);

  return (
    <div style={{ padding: '20px 0', borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
          <span style={{
            width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: 'white', background: config.bg,
          }}>{config.letter}</span>
          {config.name}
        </span>
        {entry.timestamp && (
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            {formatTime(entry.timestamp)}
          </span>
        )}
      </div>
      <div style={{
        fontSize: 14, lineHeight: 1.75, color: 'var(--text)',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere',
        maxHeight: expanded ? 'none' : 200, overflow: 'hidden', position: 'relative',
      }}>
        {entry.content}
        {!expanded && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
            background: 'linear-gradient(transparent, var(--bg))', pointerEvents: 'none',
          }} />
        )}
      </div>
      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            marginTop: 6, background: 'none', border: 'none', color: 'var(--text-2)',
            cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-sans)',
            textDecoration: 'underline', textUnderlineOffset: 2,
          }}
        >{expanded ? 'Show less' : 'Show more'}</button>
      )}
    </div>
  );
}

function ThinkingEntry({ entry }: { entry: Entry }) {
  const needsTruncation = entry.content.length >= 400;
  const [expanded, setExpanded] = useState(!needsTruncation);

  return (
    <div style={{ padding: '20px 0', borderBottom: '1px solid var(--border-light)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600 }}>
          <span style={{
            width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, background: 'var(--border)', color: 'var(--text-3)',
          }}>T</span>
          <span style={{ color: 'var(--text-3)' }}>Thinking</span>
        </span>
        {entry.timestamp && <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{formatTime(entry.timestamp)}</span>}
      </div>
      <div style={{
        fontSize: 13, lineHeight: 1.75, color: 'var(--text-3)', fontStyle: 'italic',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere',
        maxHeight: expanded ? 'none' : 200, overflow: 'hidden', position: 'relative',
      }}>
        {entry.content}
        {!expanded && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
            background: 'linear-gradient(transparent, var(--bg))', pointerEvents: 'none',
          }} />
        )}
      </div>
      {needsTruncation && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            marginTop: 6, background: 'none', border: 'none', color: 'var(--text-2)',
            cursor: 'pointer', fontSize: 12, textDecoration: 'underline', textUnderlineOffset: 2,
          }}
        >{expanded ? 'Show less' : 'Show more'}</button>
      )}
    </div>
  );
}

function ToolGroup({ entries }: { entries: Entry[] }) {
  const [expanded, setExpanded] = useState(false);
  const toolCall = entries.find(e => e.type === 'tool_call');
  const toolResult = entries.find(e => e.type === 'tool_result');

  if (!toolCall) return null;

  const isError = toolResult?.status === 'error';
  const toolName = toolCall.toolName || 'Tool';
  const firstLetter = toolName.charAt(0).toUpperCase();

  // Try to extract file path from content (first line)
  const firstLine = toolCall.content.split('\n')[0];
  const isFileOp = toolName === 'Write' || toolName === 'Edit' || toolName === 'Read';

  return (
    <div style={{
      background: 'var(--bg-2)', margin: '0 -24px', padding: '16px 24px',
      borderBottom: '1px solid var(--border-light)',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: expanded ? 10 : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: 'white', background: 'var(--text-3)',
            }}>{firstLetter}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>
              {toolName}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10,
              color: isError ? 'var(--red)' : 'var(--green)',
              background: isError ? 'var(--red-bg)' : 'var(--green-bg)',
            }}>
              {isError ? 'error' : 'success'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {toolCall.timestamp && (
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                {formatTime(toolCall.timestamp)}
              </span>
            )}
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{expanded ? '\u25B2' : '\u25BC'}</span>
          </div>
        </div>

        {/* File path or collapsed preview */}
        {isFileOp && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)',
            textDecoration: 'underline', textUnderlineOffset: 2, display: 'inline-block', marginBottom: 4,
            wordBreak: 'break-all', overflowWrap: 'anywhere',
          }}>
            {firstLine.substring(0, 120)}
          </span>
        )}
        {!expanded && !isFileOp && (
          <pre style={{
            background: 'var(--bg-2)', border: '1px solid var(--border-light)', borderRadius: 8,
            padding: '10px 14px', marginTop: 6, overflow: 'hidden',
            fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.5, color: 'var(--text-2)',
            maxHeight: 60, textOverflow: 'ellipsis', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            overflowWrap: 'anywhere',
          }}>
            {firstLine.substring(0, 120)}
          </pre>
        )}
      </div>

      {expanded && (
        <div style={{
          border: '1px solid var(--border-light)', borderRadius: 6, marginTop: 8, overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.5,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere', color: 'var(--text)',
            maxHeight: 300, overflow: 'auto', background: 'var(--bg)',
          }}>
            {toolCall.content}
          </div>
          {toolResult && (
            <div style={{
              padding: '12px 14px', borderTop: '1px solid var(--border-light)',
              fontFamily: 'var(--font-mono)', fontSize: 11.5, lineHeight: 1.5,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere',
              maxHeight: 300, overflow: 'auto',
              background: isError ? 'var(--red-bg)' : 'var(--green-bg)',
              color: isError ? 'var(--red)' : 'var(--green)',
            }}>
              {toolResult.content}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OwnerControls({ sessionId, visibility, manageToken }: { sessionId: string; visibility: string; manageToken?: string }) {
  const [vis, setVis] = useState(visibility);
  const [saving, setSaving] = useState(false);

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (manageToken) {
      headers['X-Manage-Token'] = manageToken;
    }
    return headers;
  }, [manageToken]);

  const updateSession = useCallback(async (updates: Record<string, unknown>) => {
    setSaving(true);
    try {
      await fetch(`/api/share/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(updates),
      });
    } finally {
      setSaving(false);
    }
  }, [sessionId, authHeaders]);

  const handleVisChange = async (newVis: string) => {
    setVis(newVis);
    await updateSession({ visibility: newVis });
  };

  const handleDelete = async () => {
    if (!confirm('Delete this session permanently?')) return;
    await fetch(`/api/share/${sessionId}`, { method: 'DELETE', headers: authHeaders });
    window.location.href = '/';
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 0', borderBottom: '1px solid var(--border-light)',
      fontSize: 12,
    }}>
      <span style={{ color: 'var(--text-3)', marginRight: 4 }}>Visibility:</span>
      {(['public', 'unlisted', 'private'] as const).map(v => (
        <button
          key={v}
          onClick={() => handleVisChange(v)}
          disabled={saving}
          style={{
            padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
            background: vis === v ? 'var(--bg-3)' : 'var(--bg)',
            border: `1px solid ${vis === v ? 'var(--text-3)' : 'var(--border)'}`,
            color: vis === v ? 'var(--text)' : 'var(--text-2)',
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}
        >{v}</button>
      ))}
      <div style={{ flex: 1 }} />
      <button
        onClick={handleDelete}
        style={{
          padding: '3px 10px', borderRadius: 6, fontSize: 11,
          background: 'var(--bg)', border: '1px solid var(--red)',
          color: 'var(--red)', cursor: 'pointer',
        }}
      >Delete</button>
    </div>
  );
}

// --- Helpers ---

interface EntryGroup {
  type: 'user' | 'assistant' | 'thinking' | 'system' | 'tool_group';
  entries: Entry[];
}

function groupEntries(entries: Entry[]): EntryGroup[] {
  const groups: EntryGroup[] = [];
  let i = 0;
  while (i < entries.length) {
    const entry = entries[i];
    if (entry.type === 'tool_call') {
      const group: Entry[] = [entry];
      if (i + 1 < entries.length && entries[i + 1].type === 'tool_result' &&
          entries[i + 1].toolCallId === entry.toolCallId) {
        group.push(entries[i + 1]);
        i += 2;
      } else {
        i++;
      }
      groups.push({ type: 'tool_group', entries: group });
    } else {
      groups.push({ type: entry.type as EntryGroup['type'], entries: [entry] });
      i++;
    }
  }
  return groups;
}

const AVATAR_CONFIG: Record<string, { bg: string; letter: string; name: string }> = {
  user:        { bg: 'var(--text)',   letter: 'Y', name: 'You' },
  assistant:   { bg: 'var(--text-2)', letter: 'C', name: 'Claude' },
  thinking:    { bg: 'var(--border)', letter: 'T', name: 'Thinking' },
  tool_call:   { bg: 'var(--text-3)', letter: 'T', name: 'Tool' },
  tool_result: { bg: 'var(--text-3)', letter: 'R', name: 'Result' },
  system:      { bg: 'var(--text-3)', letter: 'S', name: 'System' },
};

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

function getDuration(start: string, end: string): string {
  try {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 60000) return `${Math.round(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  } catch {
    return '';
  }
}
