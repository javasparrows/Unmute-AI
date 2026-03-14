import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { handleLoginDevice } from "@/lib/login-device";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return new NextResponse(null, { status: 401 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null;
  const userAgent = request.headers.get("user-agent") ?? null;

  try {
    await handleLoginDevice({
      userId: session.user.id,
      email: session.user.email,
      ip,
      userAgent,
    });
  } catch (err: unknown) {
    // Login device tracking should never block the user experience.
    // Log the error but return success to the client.
    console.error("Login device check failed:", err);
  }

  return new NextResponse(null, { status: 204 });
}
