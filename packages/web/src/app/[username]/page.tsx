import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
import { auth } from '@/lib/auth';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ username: string }>;
}

interface UserRow {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface SessionRow {
  id: string;
  metadata: string;
  visibility: string;
  created_at: string;
  view_count: number;
  pinned: number;
  title: string | null;
}

function getUser(rawUsername: string) {
  const username = rawUsername.startsWith('@') ? rawUsername.slice(1) : rawUsername;
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserRow | undefined;
}

function getUserSessions(userId: string, isOwner: boolean) {
  const db = getDb();
  if (isOwner) {
    return db.prepare(
      'SELECT id, metadata, visibility, created_at, view_count, pinned, title FROM sessions WHERE user_id = ? AND visibility IN (?, ?) ORDER BY pinned DESC, created_at DESC'
    ).all(userId, 'public', 'unlisted') as SessionRow[];
  }
  return db.prepare(
    'SELECT id, metadata, visibility, created_at, view_count, pinned, title FROM sessions WHERE user_id = ? AND visibility = ? ORDER BY pinned DESC, created_at DESC'
  ).all(userId, 'public') as SessionRow[];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username } = await params;
  const user = getUser(username);
  if (!user) return { title: 'Not Found' };
  return {
    title: `${user.display_name || user.username} — CodeCast`,
    description: `${user.username}'s shared coding sessions on CodeCast`,
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  const user = getUser(username);

  if (!user) {
    notFound();
  }

  const session = await auth();
  const isOwner = !!(session as any)?.userId && (session as any).userId === user.id;
  const sessions = getUserSessions(user.id, isOwner);
  const publicCount = sessions.filter(s => s.visibility === 'public').length;

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px' }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 0', borderBottom: '1px solid var(--border-light)',
      }}>
        <a href="/" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          textDecoration: 'none', fontSize: 14, fontWeight: 600, color: 'var(--text)',
        }}>
          <img src="/logo.svg" alt="CodeCast" width={24} height={24} style={{ borderRadius: 6 }} />
          CodeCast
        </a>
        {isOwner && (
          <a href="/api/auth/signout" style={{
            fontSize: 13, color: 'var(--text-3)', textDecoration: 'none',
          }}>
            Sign out
          </a>
        )}
      </nav>

      {/* Profile Header */}
      <div style={{ padding: '32px 0 24px', borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.username}
              width={56}
              height={56}
              style={{ borderRadius: '50%' }}
            />
          ) : (
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: 'var(--text)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: 'var(--bg)',
            }}>
              {user.username.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
                {user.display_name || user.username}
              </h1>
              <a
                href={`https://github.com/${user.username}`}
                target="_blank"
                rel="noopener noreferrer"
                title="GitHub profile"
                style={{ display: 'inline-flex', color: 'var(--text-3)', marginBottom: 4 }}
              >
                <svg width={18} height={18} viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
              </a>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
              @{user.username} &middot; {publicCount} public session{publicCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Sessions */}
      <div style={{ padding: '24px 0 60px' }}>
        {sessions.length === 0 ? (
          <p style={{ color: 'var(--text-3)', textAlign: 'center', padding: '40px 0', fontSize: 14 }}>
            No public sessions yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sessions.map(s => {
              const meta = JSON.parse(s.metadata);
              const displayTitle = s.title || meta.title || 'Untitled Session';
              const agentLabel = meta.agent === 'claude-code' ? 'Claude Code' : meta.agent === 'codex' ? 'Codex' : meta.agent;
              const date = new Date(s.created_at).toLocaleDateString();

              return (
                <a
                  key={s.id}
                  href={`/s/${s.id}`}
                  style={{
                    display: 'block', padding: '14px 18px',
                    background: 'var(--bg)', border: '1px solid var(--border-light)',
                    borderRadius: 8, textDecoration: 'none', color: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    {s.pinned ? <span style={{ fontSize: 11 }}>📌</span> : null}
                    <span style={{
                      display: 'inline-flex', padding: '1px 7px', borderRadius: 3,
                      fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)',
                      background: 'var(--bg-2)', border: '1px solid var(--border-light)',
                      color: 'var(--text-2)',
                    }}>{agentLabel}</span>
                    {s.visibility === 'unlisted' && (
                      <span style={{
                        display: 'inline-flex', padding: '1px 7px', borderRadius: 3,
                        fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-mono)',
                        background: 'transparent', border: '1px dashed var(--border-light)',
                        color: 'var(--text-3)',
                      }}>unlisted</span>
                    )}
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{displayTitle}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: 12, color: 'var(--text-3)' }}>
                    {meta.model && <span>{meta.model}</span>}
                    <span>{date}</span>
                    <span>{meta.entryCount} entries</span>
                    <span>{s.view_count} views</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{
        padding: '24px 0', textAlign: 'center', fontSize: 11,
        color: 'var(--text-3)', borderTop: '1px solid var(--border-light)',
      }}>
        <a href="/" style={{ color: 'var(--text-2)', textDecoration: 'underline', textUnderlineOffset: 2 }}>CodeCast</a>
      </footer>
    </div>
  );
}
