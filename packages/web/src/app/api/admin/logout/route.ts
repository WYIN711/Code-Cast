import { NextResponse } from 'next/server';
import { adminClearCookie } from '@/lib/admin-auth';

export async function POST() {
  const res = NextResponse.redirect(new URL('/admin/login', process.env.NEXTAUTH_URL || 'http://localhost:3000'), 303);
  const cookie = adminClearCookie();
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    path: cookie.path,
    maxAge: cookie.maxAge,
    sameSite: cookie.sameSite,
  });
  return res;
}
