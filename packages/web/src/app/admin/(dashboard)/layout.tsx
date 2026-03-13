import { redirect } from 'next/navigation';
import { isAdminAuthenticated } from '@/lib/admin-auth';
import { AdminNav } from './admin-nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const authed = await isAdminAuthenticated();
  if (!authed) redirect('/admin/login');

  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}
