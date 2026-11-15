import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Gracefully redirect legacy routes from the old architecture to the streamlined pages
  const legacyRedirects: Record<string, string> = {
    '/dashboard': '/initiate',
    '/dashboard/live': '/initiate',
    '/dashboard/message': '/initiate',
    '/new-call': '/initiate',
    '/login': '/initiate',
    '/busy': '/setup',
    '/voice-studio': '/setup',
    '/voice-studio/settings': '/setup',
    '/call/live': '/initiate',
    '/call/history': '/setup',
    '/call/details': '/setup',
  };

  if (legacyRedirects[pathname]) {
    return NextResponse.redirect(new URL(legacyRedirects[pathname], request.url));
  }

  if (pathname.startsWith('/dashboard/')) {
    return NextResponse.redirect(new URL('/initiate', request.url));
  }

  if (pathname.startsWith('/voice-studio/')) {
    return NextResponse.redirect(new URL('/setup', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/dashboard',
    '/login',
    '/busy',
    '/voice-studio/:path*',
    '/voice-studio',
    '/new-call',
    '/call/live',
    '/call/history',
    '/call/details',
  ],
};
