import { auth } from "@/lib/auth";
import { suggestCitations } from "@/lib/evidence/autopilot";
import type { SectionType } from "@/types/evidence";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sentence, section, existingCiteKeys } = body;

  if (!sentence?.trim()) {
    return Response.json({ error: "sentence required" }, { status: 400 });
  }

  try {
    const result = await suggestCitations(
      sentence,
      (section || "INTRODUCTION") as SectionType,
      existingCiteKeys || []
    );
    return Response.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Suggestion failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
