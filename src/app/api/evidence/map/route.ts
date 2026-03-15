import { auth } from "@/lib/auth";
import { mapEvidence } from "@/lib/evidence/mapping/map-evidence";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    documentId,
    manuscriptCitationId,
    sentenceIndex,
    manuscriptSentence,
    sectionType,
  } = body;

  if (
    !documentId ||
    !manuscriptCitationId ||
    sentenceIndex === undefined ||
    !manuscriptSentence
  ) {
    return Response.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  try {
    const result = await mapEvidence({
      documentId,
      manuscriptCitationId,
      sentenceIndex,
      manuscriptSentence,
      sectionType,
    });

    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Mapping failed" },
      { status: 500 },
    );
  }
}
