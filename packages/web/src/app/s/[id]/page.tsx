import { notFound } from 'next/navigation';
import { getDb, type StoredSession } from '@/lib/db';
import { auth } from '@/lib/auth';
import { SessionViewer } from './viewer';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ key?: string }>;
}

function getSessionRow(id: string): StoredSession | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as StoredSession | undefined;
  if (!row) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;
  return row;
}

function parseSession(row: StoredSession) {
  try {
    return {
      id: row.id,
      metadata: JSON.parse(row.metadata),
      entries: JSON.parse(row.entries),
      visibility: row.visibility,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      viewCount: row.view_count,
      userId: row.user_id,
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const row = getSessionRow(id);
  if (!row) return { title: 'Not Found' };

  const session = parseSession(row);
  if (!session) return { title: 'Not Found' };

  return {
    title: `${session.metadata.title} — CodeCast`,
    description: `${session.metadata.agent} session with ${session.metadata.entryCount} entries`,
  };
}

export default async function SessionPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { key } = await searchParams;
  const row = getSessionRow(id);

  if (!row) {
    notFound();
  }

  const session = parseSession(row);
  if (!session) {
    notFound();
  }

  // Check visibility & ownership
  const authSession = await auth();
  const currentUserId = (authSession as any)?.userId as string | undefined;
  const isOwner = !!currentUserId && currentUserId === session.userId;

  // Check manage token from ?key= query param
  const canManage = !!(key && row.manage_token && key === row.manage_token);

  if (session.visibility === 'private' && !isOwner && !canManage) {
    notFound();
  }

  // Increment view count once per page load (not in generateMetadata)
  const db = getDb();
  db.prepare('UPDATE sessions SET view_count = view_count + 1 WHERE id = ?').run(id);
  session.viewCount = (session.viewCount || 0) + 1;

  return (
    <SessionViewer
      session={session}
      isOwner={isOwner}
      canManage={canManage}
      manageToken={canManage ? key : undefined}
    />
  );
}
