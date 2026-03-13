import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { nanoid } from 'nanoid';

/**
 * GET /api/auth/cli-token
 * Generates a CLI auth token for the authenticated user.
 * The CLI opens this URL in the browser after OAuth login.
 */
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session || !(session as any).userId) {
    // If called with ?callback=<url>, redirect to sign in first
    const callbackUrl = request.nextUrl.searchParams.get('callback');
    const signInUrl = new URL('/api/auth/signin', request.nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', `/api/auth/cli-token${callbackUrl ? `?callback=${encodeURIComponent(callbackUrl)}` : ''}`);
    return NextResponse.redirect(signInUrl);
  }

  const userId = (session as any).userId as string;
  const username = (session as any).username as string;
  const db = getDb();

  // Generate new token
  const token = nanoid(32);
  db.prepare('INSERT INTO auth_tokens (token, user_id, created_at) VALUES (?, ?, ?)')
    .run(token, userId, new Date().toISOString());

  // If CLI provided a callback URL, validate it's localhost only (prevent open redirect)
  const callbackUrl = request.nextUrl.searchParams.get('callback');
  if (callbackUrl) {
    try {
      const url = new URL(callbackUrl);
      if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
        return NextResponse.json({ error: 'Invalid callback URL: must be localhost' }, { status: 400 });
      }
      url.searchParams.set('token', token);
      url.searchParams.set('username', username);
      return NextResponse.redirect(url.toString());
    } catch {
      return NextResponse.json({ error: 'Invalid callback URL' }, { status: 400 });
    }
  }

  // Otherwise return JSON (for browser usage)
  return NextResponse.json({ token, username });
}
