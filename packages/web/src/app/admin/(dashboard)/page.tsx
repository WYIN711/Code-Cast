import { getDb } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function AdminDashboardPage() {
  const db = getDb();

  const totalSessions = db.prepare('SELECT COUNT(*) as count FROM sessions').get() as { count: number };
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  const totalViews = db.prepare('SELECT COALESCE(SUM(view_count), 0) as count FROM sessions').get() as { count: number };

  const byVisibility = db.prepare(
    'SELECT visibility, COUNT(*) as count FROM sessions GROUP BY visibility ORDER BY count DESC'
  ).all() as { visibility: string; count: number }[];

  const byAgent = db.prepare(
    `SELECT COALESCE(json_extract(metadata, '$.agent'), 'unknown') as agent, COUNT(*) as count
     FROM sessions GROUP BY agent ORDER BY count DESC`
  ).all() as { agent: string; count: number }[];

  const recentSessions = db.prepare(
    `SELECT id, title, visibility, view_count, created_at,
            json_extract(metadata, '$.agent') as agent
     FROM sessions ORDER BY created_at DESC LIMIT 10`
  ).all() as { id: string; title: string | null; visibility: string; view_count: number; created_at: string; agent: string | null }[];

  const recentUsers = db.prepare(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.created_at,
            (SELECT COUNT(*) FROM sessions s WHERE s.user_id = u.id) as session_count
     FROM users u ORDER BY u.created_at DESC LIMIT 10`
  ).all() as { id: string; username: string; display_name: string | null; avatar_url: string | null; created_at: string; session_count: number }[];

  return (
    <>
      <h1 className="adm-title">Dashboard</h1>

      <div className="adm-stats">
        <div className="adm-stat">
          <div className="adm-stat-val">{totalSessions.count}</div>
          <div className="adm-stat-label">Sessions</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-val">{totalUsers.count}</div>
          <div className="adm-stat-label">Users</div>
        </div>
        <div className="adm-stat">
          <div className="adm-stat-val">{totalViews.count}</div>
          <div className="adm-stat-label">Total Views</div>
        </div>
      </div>

      <div className="adm-grid-2">
        <div className="adm-card">
          <div className="adm-card-title">Sessions by Visibility</div>
          <table className="adm-table">
            <tbody>
              {byVisibility.map(r => (
                <tr key={r.visibility}>
                  <td>{r.visibility}</td>
                  <td className="adm-td-num">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="adm-card">
          <div className="adm-card-title">Sessions by Agent</div>
          <table className="adm-table">
            <tbody>
              {byAgent.map(r => (
                <tr key={r.agent}>
                  <td>{r.agent}</td>
                  <td className="adm-td-num">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-title">Recent Sessions</div>
        <table className="adm-table adm-table-full">
          <thead>
            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Agent</th>
              <th>Visibility</th>
              <th>Views</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {recentSessions.map(s => (
              <tr key={s.id}>
                <td><Link href={`/s/${s.id}`} className="adm-link">{s.id.slice(0, 8)}</Link></td>
                <td className="adm-td-trunc">{s.title || '—'}</td>
                <td>{s.agent || '—'}</td>
                <td><span className={`adm-badge adm-badge-${s.visibility}`}>{s.visibility}</span></td>
                <td className="adm-td-num">{s.view_count}</td>
                <td className="adm-td-date">{new Date(s.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {recentSessions.length === 0 && (
              <tr><td colSpan={6} className="adm-td-empty">No sessions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="adm-card">
        <div className="adm-card-title">Recent Users</div>
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
            {recentUsers.map(u => (
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
            {recentUsers.length === 0 && (
              <tr><td colSpan={4} className="adm-td-empty">No users yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
