import createMiddleware from 'next-intl/middleware';
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

// Public paths that don't require auth (without locale prefix)
const publicPaths = ['/', '/login', '/pricing', '/privacy', '/terms', '/faq'];

function isPublicPath(pathname: string): boolean {
  // Strip locale prefix if present
  const pathWithoutLocale = pathname.replace(/^\/(ja|en|zh-CN|zh-TW|ko|de|fr|es|pt-BR|ru|it|hi|tr|ar|id|pl|fa)/, '') || '/';

  return (
    publicPaths.includes(pathWithoutLocale) ||
    pathWithoutLocale.startsWith('/legal') ||
    pathWithoutLocale.startsWith('/api/auth') ||
    pathWithoutLocale.startsWith('/api/webhooks')
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip all API routes (including auth callbacks — NextAuth handles them internally)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Run intl middleware first (handles locale detection and redirects)
  const response = intlMiddleware(request);

  // Check auth for non-public paths
  if (!isPublicPath(pathname)) {
    const sessionToken =
      request.cookies.get("authjs.session-token") ??
      request.cookies.get("__Secure-authjs.session-token");

    if (!sessionToken) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|api/|sitemap\\.xml|robots\\.txt|llms\\.txt|llms-full\\.txt).*)"],
};
