import { getDb } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function AdminSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const q = (params.q || '').trim();
  const offset = (page - 1) * PAGE_SIZE;
  const db = getDb();

  let total: number;
  let sessions: {
    id: string; title: string | null; visibility: string; view_count: number;
    created_at: string; agent: string | null; username: string | null;
  }[];

  if (q) {
    const like = `%${q}%`;
    total = (db.prepare(
      `SELECT COUNT(*) as count FROM sessions
       WHERE id LIKE ? OR title LIKE ? OR json_extract(metadata, '$.title') LIKE ?`
    ).get(like, like, like) as { count: number }).count;

    sessions = db.prepare(
      `SELECT s.id, s.title, s.visibility, s.view_count, s.created_at,
              json_extract(s.metadata, '$.agent') as agent,
              u.username
       FROM sessions s LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id LIKE ? OR s.title LIKE ? OR json_extract(s.metadata, '$.title') LIKE ?
       ORDER BY s.created_at DESC LIMIT ? OFFSET ?`
    ).all(like, like, like, PAGE_SIZE, offset) as typeof sessions;
  } else {
    total = (db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number }).count;
    sessions = db.prepare(
      `SELECT s.id, s.title, s.visibility, s.view_count, s.created_at,
              json_extract(s.metadata, '$.agent') as agent,
              u.username
       FROM sessions s LEFT JOIN users u ON s.user_id = u.id
       ORDER BY s.created_at DESC LIMIT ? OFFSET ?`
    ).all(PAGE_SIZE, offset) as typeof sessions;
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    params.set('page', String(p));
    if (q) params.set('q', q);
    return `/admin/sessions?${params}`;
  }

  return (
    <>
      <h1 className="adm-title">Sessions</h1>

      <form className="adm-search" method="GET" action="/admin/sessions">
        <input className="adm-input adm-search-input" type="text" name="q" placeholder="Search by ID or title..." defaultValue={q} />
        <button className="adm-btn adm-btn-sm" type="submit">Search</button>
      </form>

      <div className="adm-card">
        <table className="adm-table adm-table-full">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Agent</th>
              <th>Owner</th>
              <th>Visibility</th>
              <th>Views</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(s => (
              <tr key={s.id}>
                <td><Link href={`/s/${s.id}`} className="adm-link">{s.id.slice(0, 8)}</Link></td>
                <td className="adm-td-trunc">{s.title || '—'}</td>
                <td>{s.agent || '—'}</td>
                <td>{s.username ? <Link href={`/${s.username}`} className="adm-link">{s.username}</Link> : '—'}</td>
                <td><span className={`adm-badge adm-badge-${s.visibility}`}>{s.visibility}</span></td>
                <td className="adm-td-num">{s.view_count}</td>
                <td className="adm-td-date">{new Date(s.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {sessions.length === 0 && (
              <tr><td colSpan={7} className="adm-td-empty">{q ? 'No results found' : 'No sessions yet'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="adm-pagination">
          {page > 1 && <a href={pageUrl(page - 1)} className="adm-page-link">Prev</a>}
          <span className="adm-page-info">Page {page} of {totalPages} ({total} total)</span>
          {page < totalPages && <a href={pageUrl(page + 1)} className="adm-page-link">Next</a>}
        </div>
      )}
    </>
  );
}
