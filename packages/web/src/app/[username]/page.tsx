import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db';
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

function getUserSessions(userId: string) {
  const db = getDb();
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

  const sessions = getUserSessions(user.id);

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
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
              {user.display_name || user.username}
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
              @{user.username} &middot; {sessions.length} public session{sessions.length !== 1 ? 's' : ''}
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
