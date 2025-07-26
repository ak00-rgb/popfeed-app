import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session if expired
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Define protected routes (require authentication)
  const protectedRoutes = [
    '/create/details',
    '/create/username',
    '/create/success',
  ];

  // Define auth-only routes (require authentication)
  // Temporarily disabled to prevent redirect loops
  const authOnlyRoutes: string[] = [
    // '/create/verify',
  ];

  const { pathname } = req.nextUrl;

  // Check if user is trying to access protected routes without session
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!session) {
      const redirectUrl = new URL('/create', req.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Check if user is trying to access auth-only routes with existing session
  if (authOnlyRoutes.some(route => pathname.startsWith(route))) {
    if (session) {
      // If user has session, redirect to home (let the verify page handle proper redirects)
      const redirectUrl = new URL('/', req.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}; 