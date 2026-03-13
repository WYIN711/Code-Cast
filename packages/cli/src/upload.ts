import type { SharedSession } from './parsers/types.js';
import { getToken } from './auth.js';

const DEFAULT_SERVER = 'https://code-cast.dev';

/**
 * Upload a shared session to the server and return the shareable URL.
 */
export async function uploadSession(
  session: SharedSession,
  serverUrl?: string,
): Promise<{ url: string; id: string; manageToken?: string }> {
  const base = serverUrl || process.env.CODECAST_SERVER || DEFAULT_SERVER;
  const endpoint = `${base}/api/share`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // Attach auth token if logged in
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(session),
    });
  } catch (err) {
    throw new Error(`Failed to connect to ${base}: ${(err as Error).message}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    throw new Error(`Upload failed (${response.status}): ${text}`);
  }

  let result: { id: string; url: string; manageToken?: string };
  try {
    result = await response.json() as { id: string; url: string; manageToken?: string };
  } catch {
    throw new Error('Server returned invalid JSON response');
  }

  return {
    id: result.id,
    url: result.url || `${base}/s/${result.id}`,
    manageToken: result.manageToken,
  };
}
