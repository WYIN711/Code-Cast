import { getDb } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const db = getDb();

  const total = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;

  const users = db.prepare(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.created_at,
            (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id) as session_count
     FROM users u ORDER BY u.created_at DESC LIMIT ? OFFSET ?`
  ).all(PAGE_SIZE, offset) as {
    id: string; username: string; display_name: string | null;
    avatar_url: string | null; created_at: string; session_count: number;
  }[];

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <h1 className="adm-title">Users</h1>

      <div className="adm-card">
        <table className="adm-table adm-table-full">
          <thead>
            <tr>
              <th>User</th>
              <th>Display Name</th>
              <th>Sessions</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="adm-user-cell">
                    {u.avatar_url && <img src={u.avatar_url} alt="" className="adm-avatar" />}
                    <Link href={`/${u.username}`} className="adm-link">{u.username}</Link>
                  </div>
                </td>
                <td>{u.display_name || '—'}</td>
                <td className="adm-td-num">{u.session_count}</td>
                <td className="adm-td-date">{new Date(u.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={4} className="adm-td-empty">No users yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="adm-pagination">
          {page > 1 && <a href={`/admin/users?page=${page - 1}`} className="adm-page-link">Prev</a>}
          <span className="adm-page-info">Page {page} of {totalPages} ({total} total)</span>
          {page < totalPages && <a href={`/admin/users?page=${page + 1}`} className="adm-page-link">Next</a>}
        </div>
      )}
    </>
  );
}
