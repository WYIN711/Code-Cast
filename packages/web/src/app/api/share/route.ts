import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getUserIdFromToken } from '@/lib/auth';

const MAX_PAYLOAD_SIZE = 10 * 1024 * 1024; // 10MB
const ID_PATTERN = /^[a-zA-Z0-9_-]{1,32}$/;
const VALID_VISIBILITY = ['public', 'unlisted', 'private'];

export async function POST(request: NextRequest) {
  try {
    // Check content length
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
      return NextResponse.json({ error: 'Payload too large (max 10MB)' }, { status: 413 });
    }

    const body = await request.json();

    const { id, metadata, entries, visibility, createdAt, expiresAt } = body;

    // Validate required fields
    if (!id || !metadata || !entries) {
      return NextResponse.json({ error: 'Missing required fields: id, metadata, entries' }, { status: 400 });
    }

    // Validate field types and formats
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'Invalid id: must be 1-32 alphanumeric characters' }, { status: 400 });
    }

    if (typeof metadata !== 'object' || metadata === null) {
      return NextResponse.json({ error: 'Invalid metadata: must be an object' }, { status: 400 });
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'Invalid entries: must be a non-empty array' }, { status: 400 });
    }

    if (visibility && !VALID_VISIBILITY.includes(visibility)) {
      return NextResponse.json({ error: 'Invalid visibility: must be public, unlisted, or private' }, { status: 400 });
    }

    // Optional auth: link session to user if token provided
    const userId = getUserIdFromToken(request.headers.get('authorization'));

    const db = getDb();

    db.prepare(`
      INSERT OR REPLACE INTO sessions (id, metadata, entries, visibility, created_at, expires_at, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      JSON.stringify(metadata),
      JSON.stringify(entries),
      visibility || 'unlisted',
      createdAt || new Date().toISOString(),
      expiresAt || null,
      userId,
    );

    const baseUrl = request.headers.get('x-forwarded-host')
      ? `https://${request.headers.get('x-forwarded-host')}`
      : request.nextUrl.origin;

    return NextResponse.json({
      id,
      url: `${baseUrl}/s/${id}`,
    });
  } catch (err: unknown) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { error: 'Failed to upload session' },
      { status: 500 },
    );
  }
}
