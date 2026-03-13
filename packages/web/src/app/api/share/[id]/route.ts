import { NextRequest, NextResponse } from 'next/server';
import { getDb, type StoredSession } from '@/lib/db';
import { getUserIdFromToken, auth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function getSession(id: string): StoredSession | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as StoredSession | undefined;
}

/**
 * Check if the request is authorized to manage the given session.
 * Supports three auth methods (checked in order):
 *   1. Bearer token (CLI auth) → matches user_id
 *   2. X-Manage-Token header or ?token= query param → matches manage_token
 *   3. NextAuth session cookie → matches user_id
 */
async function isAuthorized(
  request: NextRequest,
  session: StoredSession,
): Promise<boolean> {
  // 1. Bearer token (CLI auth)
  const userId = getUserIdFromToken(request.headers.get('authorization'));
  if (userId && session.user_id && userId === session.user_id) {
    return true;
  }

  // 2. Manage token (header or query param)
  const manageToken =
    request.headers.get('x-manage-token') ||
    request.nextUrl.searchParams.get('token');
  if (manageToken && session.manage_token && manageToken === session.manage_token) {
    return true;
  }

  // 3. NextAuth session cookie (browser users)
  const authSession = await auth();
  const sessionUserId = (authSession as any)?.userId as string | undefined;
  if (sessionUserId && session.user_id && sessionUserId === session.user_id) {
    return true;
  }

  return false;
}

/** GET a session by ID (returns JSON) */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const row = getSession(id);

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Check if caller can manage this session
  const canManage = await isAuthorized(request, row);

  return NextResponse.json({
    id: row.id,
    metadata: JSON.parse(row.metadata as string),
    visibility: row.visibility,
    createdAt: row.created_at,
    viewCount: row.view_count,
    userId: row.user_id,
    pinned: row.pinned,
    title: row.title,
    canManage,
  });
}

/** PATCH a session — update visibility, title, pinned */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const row = getSession(id);

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!(await isAuthorized(request, row))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const db = getDb();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.visibility !== undefined) {
    if (!['public', 'unlisted', 'private'].includes(body.visibility)) {
      return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 });
    }
    updates.push('visibility = ?');
    values.push(body.visibility);
  }

  if (body.title !== undefined) {
    updates.push('title = ?');
    values.push(body.title);
  }

  if (body.pinned !== undefined) {
    updates.push('pinned = ?');
    values.push(body.pinned ? 1 : 0);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  values.push(id);
  db.prepare(`UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return NextResponse.json({ updated: true });
}

/** DELETE a session (requires ownership) */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const row = getSession(id);

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!(await isAuthorized(request, row))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const result = db.prepare('DELETE FROM sessions WHERE id = ?').run(id);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
