import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/api/auth',
    '/api/register',
  ]
  const isPublicRoute = publicRoutes.some((r) => pathname.startsWith(r))

  // Halaman publik per agama: /<nama-agama> (tidak termasuk /dashboard, /api, dll)
  const isAgamaPublic =
    /^\/[\w-]+$/.test(pathname) &&
    !pathname.startsWith('/dashboard') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/agama') &&
    !pathname.startsWith('/pengurus')

  if (!isLoggedIn && !isPublicRoute && !isAgamaPublic) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
