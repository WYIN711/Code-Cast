import Link from 'next/link';

export function AdminNav() {
  return (
    <nav className="adm-nav">
      <div className="adm-nav-left">
        <Link href="/admin" className="adm-nav-brand">CodeCast Admin</Link>
        <Link href="/admin" className="adm-nav-link">Dashboard</Link>
        <Link href="/admin/sessions" className="adm-nav-link">Sessions</Link>
        <Link href="/admin/users" className="adm-nav-link">Users</Link>
      </div>
      <form action="/api/admin/logout" method="POST">
        <button type="submit" className="adm-nav-link adm-nav-logout">Logout</button>
      </form>
    </nav>
  );
}
