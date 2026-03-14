import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { softDeleteUser, AdminActionError } from "@/lib/admin/user-management";

export async function POST(
  _request: Request,
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

  try {
    await softDeleteUser(session.user.id, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AdminActionError) {
      const status = err.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    throw err;
  }
}
