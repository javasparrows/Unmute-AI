import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  setPlanOverride,
  clearPlanOverride,
  AdminActionError,
} from "@/lib/admin/user-management";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { planOverride, note } = body;

  // Validate planOverride value
  if (
    planOverride !== null &&
    planOverride !== "FREE" &&
    planOverride !== "PRO" &&
    planOverride !== "MAX"
  ) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  try {
    const user =
      planOverride === null
        ? await clearPlanOverride(session.user.id, id)
        : await setPlanOverride(session.user.id, id, planOverride, note);
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof AdminActionError) {
      const status = err.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    throw err;
  }
}
