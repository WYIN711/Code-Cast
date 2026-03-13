import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { getDb } from './db';
import { nanoid } from 'nanoid';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider !== 'github' || !profile) return false;

      const db = getDb();
      const githubId = Number(profile.id);
      const username = (profile.login as string).toLowerCase();
      const displayName = profile.name as string || username;
      const avatarUrl = profile.avatar_url as string || '';

      const existing = db.prepare('SELECT id FROM users WHERE github_id = ?').get(githubId) as { id: string } | undefined;

      if (existing) {
        db.prepare('UPDATE users SET username = ?, display_name = ?, avatar_url = ? WHERE github_id = ?')
          .run(username, displayName, avatarUrl, githubId);
      } else {
        db.prepare('INSERT INTO users (id, github_id, username, display_name, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .run(nanoid(12), githubId, username, displayName, avatarUrl, new Date().toISOString());
      }

      return true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === 'github' && profile) {
        const db = getDb();
        const user = db.prepare('SELECT id, username FROM users WHERE github_id = ?').get(Number(profile.id)) as { id: string; username: string } | undefined;
        if (user) {
          token.userId = user.id;
          token.username = user.username;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        (session as any).userId = token.userId;
        (session as any).username = token.username;
      }
      return session;
    },
  },
});

const TOKEN_MAX_AGE_DAYS = 30;

/**
 * Look up user from a Bearer token (for CLI auth).
 * Returns user_id or null. Tokens expire after 30 days.
 */
export function getUserIdFromToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const db = getDb();
  const cutoff = new Date(Date.now() - TOKEN_MAX_AGE_DAYS * 86400000).toISOString();
  const row = db.prepare('SELECT user_id FROM auth_tokens WHERE token = ? AND created_at > ?').get(token, cutoff) as { user_id: string } | undefined;
  return row?.user_id ?? null;
}
