import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserIdFromToken } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function getSessionOwner(id: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT user_id FROM sessions WHERE id = ?').get(id) as { user_id: string | null } | undefined;
  return row?.user_id ?? null;
}

/** GET a session by ID (returns JSON) */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const db = getDb();
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Record<string, unknown> | undefined;

  if (!row) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: row.id,
    metadata: JSON.parse(row.metadata as string),
    visibility: row.visibility,
    createdAt: row.created_at,
    viewCount: row.view_count,
    userId: row.user_id,
    pinned: row.pinned,
    title: row.title,
  });
}

/** PATCH a session — update visibility, title, pinned */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const userId = getUserIdFromToken(request.headers.get('authorization'));

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const owner = getSessionOwner(id);
  if (owner !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
  const userId = getUserIdFromToken(request.headers.get('authorization'));

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const owner = getSessionOwner(id);
  if (owner !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = getDb();
  const result = db.prepare('DELETE FROM sessions WHERE id = ?').run(id);

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true });
}
