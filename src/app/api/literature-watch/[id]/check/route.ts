import { auth } from "@/lib/auth";
import { checkLiteratureWatch } from "@/lib/literature-watch";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const results = await checkLiteratureWatch(id);

  return Response.json({ results });
}
