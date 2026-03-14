import { auth } from "@/lib/auth";
import { extractEvidence } from "@/lib/evidence/extract-evidence";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { canonicalPaperId, targetClaim } = body;

  if (!canonicalPaperId) {
    return Response.json(
      { error: "canonicalPaperId required" },
      { status: 400 },
    );
  }

  try {
    const result = await extractEvidence({ canonicalPaperId, targetClaim });
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Extraction failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
