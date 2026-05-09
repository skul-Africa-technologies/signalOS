/**
 * Next.js Middleware
 *
 * NOTE: Server-side route protection requires tokens in cookies.
 * Current authentication uses localStorage (token sent via Authorization header in API calls).
 * This middleware is a PASS-THROUGH placeholder for future cookie-based auth.
 *
 * Client-side protection is handled by AppLayout and useProtectedRoute hook.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Static files and API routes bypass
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/static') ||
    request.nextUrl.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next()
  }

  // TODO: Enable cookie-based auth when backend sets HTTP-only cookie or client syncs token to cookie
  // For now, rely on client-side auth guards

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next|api|static|favicon.ico).*)',
  ],
}
