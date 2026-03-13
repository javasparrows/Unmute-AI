import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const LOCALES = new Set([
  "ja", "en", "zh-CN", "zh-TW", "ko", "de", "fr",
  "es", "pt-BR", "ru", "it", "hi", "tr", "ar", "id", "pl", "fa",
]);

const VISITOR_COOKIE = "um_visitor";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years

/**
 * Strip a leading locale prefix from a path.
 * e.g. "/en/pricing" -> "/pricing", "/zh-CN/about" -> "/about"
 * Paths without a locale prefix are returned as-is.
 */
function stripLocalePrefix(path: string): { normalizedPath: string; locale: string | null } {
  // Match first segment: "/en/..." or "/zh-CN/..."
  const match = path.match(/^\/([^/]+)(\/.*)?$/);
  if (match) {
    const firstSegment = match[1];
    if (LOCALES.has(firstSegment)) {
      return {
        normalizedPath: match[2] || "/",
        locale: firstSegment,
      };
    }
  }
  // No locale prefix found — default locale "ja"
  return { normalizedPath: path, locale: "ja" };
}

export async function POST(request: NextRequest) {
  let body: { path?: string };
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const rawPath = body.path;
  if (typeof rawPath !== "string" || rawPath.length === 0) {
    return new NextResponse(null, { status: 400 });
  }

  // The client component sends a locale-stripped path (next-intl's usePathname
  // already strips the prefix). We still normalise server-side in case of
  // direct API calls or unexpected prefixed paths.
  const { normalizedPath, locale } = stripLocalePrefix(rawPath);

  // Visitor identification via cookie
  let visitorId = request.cookies.get(VISITOR_COOKIE)?.value ?? "";
  const isNewVisitor = !visitorId;
  if (isNewVisitor) {
    visitorId = crypto.randomUUID();
  }

  // Authenticated user (optional)
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session?.user?.id ?? null;
  } catch {
    // Auth failure should not block tracking
  }

  // Country code from Vercel edge header
  const countryCode =
    request.headers.get("x-vercel-ip-country")?.toUpperCase().slice(0, 2) ?? null;

  // Persist the page view
  await prisma.pageView.create({
    data: {
      visitorId,
      userId,
      path: normalizedPath,
      locale,
      countryCode,
    },
  });

  // Build response (204 No Content)
  const response = new NextResponse(null, { status: 204 });

  // Set visitor cookie if it was just created
  if (isNewVisitor) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
    });
  }

  return response;
}
