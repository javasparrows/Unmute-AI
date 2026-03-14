import { auth } from "@/lib/auth";
import {
  resolveFullText,
  getEvidenceTier,
} from "@/lib/providers/fulltext-resolver";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    doi?: string;
    pmid?: string;
    pmcid?: string;
    arxivId?: string;
  };
  const { doi, pmid, pmcid, arxivId } = body;

  if (!doi && !pmid && !pmcid && !arxivId) {
    return Response.json(
      { error: "At least one identifier required" },
      { status: 400 },
    );
  }

  const result = await resolveFullText({ doi, pmid, pmcid, arxivId });

  if (!result) {
    return Response.json({
      found: false,
      evidenceTier: "ABSTRACT_ONLY",
      sections: [],
    });
  }

  return Response.json({
    found: true,
    source: result.source,
    evidenceTier: getEvidenceTier(result),
    sections: result.sections,
    format: result.format,
  });
}
