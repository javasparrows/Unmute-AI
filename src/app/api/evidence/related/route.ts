import { auth } from "@/lib/auth";
import {
  getRelatedPapers,
  suggestMissingPapers,
} from "@/lib/evidence/paper-relations";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const paperId = searchParams.get("paperId");
  const documentId = searchParams.get("documentId");
  const mode = searchParams.get("mode") ?? "related"; // "related" | "missing"

  if (mode === "missing" && documentId) {
    const suggestions = await suggestMissingPapers(documentId);
    return Response.json({ suggestions });
  }

  if (paperId) {
    const related = await getRelatedPapers(paperId);
    return Response.json({ related });
  }

  return Response.json(
    { error: "paperId or documentId required" },
    { status: 400 },
  );
}
