import { auth } from "@/lib/auth";
import { analyzeForCitations } from "@/lib/evidence/autopilot";
import type { SectionType } from "@/types/evidence";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { text, section } = body;

  if (!text?.trim()) {
    return Response.json({ error: "text required" }, { status: 400 });
  }

  try {
    const analysis = await analyzeForCitations(
      text,
      (section || "INTRODUCTION") as SectionType
    );
    return Response.json(analysis);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Analysis failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
