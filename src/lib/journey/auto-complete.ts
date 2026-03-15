import { prisma } from "@/lib/prisma";
import { PHASES, TASKS, getTasksForPhase } from "./task-registry";

/**
 * Create a new journey record for a document.
 * Called when a new document is created.
 */
export async function createJourney(documentId: string): Promise<void> {
  await prisma.paperJourney.create({
    data: {
      documentId,
      currentPhase: 1,
      currentTask: "1.1",
      phaseStatuses: JSON.parse(JSON.stringify({ "1": "not_started", "2": "not_started", "3": "not_started", "4": "not_started", "5": "not_started", "6": "not_started", "7": "not_started" })),
      taskStatuses: JSON.parse(JSON.stringify({})),
      guideVisible: true,
    },
  });
}

/**
 * Refresh journey status by checking auto-completion conditions.
 * Auto-completes tasks whose conditions are met (e.g., text length thresholds,
 * citation counts, etc.) and advances the current phase/task accordingly.
 */
export async function refreshJourneyStatus(documentId: string): Promise<void> {
  const journey = await prisma.paperJourney.findUnique({
    where: { documentId },
  });

  if (!journey) return;

  // Get the document with latest version for condition checks
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        take: 1,
      },
      _count: {
        select: {
          manuscriptCitations: true,
          reviewFindings: true,
        },
      },
    },
  });

  if (!document) return;

  const latestVersion = document.versions[0];
  const taskStatuses = (journey.taskStatuses as Record<string, string>) ?? {};
  let changed = false;

  // Auto-complete 1.1 if document has a non-default title
  if (
    taskStatuses["1.1"] !== "completed" &&
    taskStatuses["1.1"] !== "skipped" &&
    document.title !== "無題の翻訳" &&
    document.title !== "無題の論文" &&
    document.title.trim().length > 0
  ) {
    taskStatuses["1.1"] = "completed";
    await upsertAutoCompletion(journey.id, "1.1");
    changed = true;
  }

  // Auto-complete 1.2 if journal is selected
  if (
    taskStatuses["1.2"] !== "completed" &&
    taskStatuses["1.2"] !== "skipped" &&
    latestVersion?.journal &&
    latestVersion.journal !== "general"
  ) {
    taskStatuses["1.2"] = "completed";
    await upsertAutoCompletion(journey.id, "1.2");
    changed = true;
  }

  // Auto-complete 4.1 if source text has substantial content
  const sourceText = latestVersion?.sourceText ?? "";
  const sourceLength = sourceText.trim().length;
  if (
    taskStatuses["4.1"] !== "completed" &&
    taskStatuses["4.1"] !== "skipped" &&
    sourceLength > 500
  ) {
    taskStatuses["4.1"] = "completed";
    await upsertAutoCompletion(journey.id, "4.1");
    changed = true;
  }

  // Auto-complete 2.1 if there are citations
  if (
    taskStatuses["2.1"] !== "completed" &&
    taskStatuses["2.1"] !== "skipped" &&
    document._count.manuscriptCitations > 0
  ) {
    taskStatuses["2.1"] = "completed";
    await upsertAutoCompletion(journey.id, "2.1");
    changed = true;
  }

  if (changed) {
    // Advance current phase/task
    const { currentPhase, currentTask, phaseStatuses } =
      computeCurrentPosition(taskStatuses);

    await prisma.paperJourney.update({
      where: { id: journey.id },
      data: {
        taskStatuses: JSON.parse(JSON.stringify(taskStatuses)),
        currentPhase,
        currentTask,
        phaseStatuses: JSON.parse(JSON.stringify(phaseStatuses)),
      },
    });
  }
}

async function upsertAutoCompletion(
  journeyId: string,
  taskId: string,
): Promise<void> {
  await prisma.taskCompletion.upsert({
    where: { journeyId_taskId: { journeyId, taskId } },
    create: {
      journeyId,
      taskId,
      status: "completed",
      autoCompleted: true,
      completedAt: new Date(),
    },
    update: {
      status: "completed",
      autoCompleted: true,
      completedAt: new Date(),
    },
  });
}

function computeCurrentPosition(taskStatuses: Record<string, string>): {
  currentPhase: number;
  currentTask: string;
  phaseStatuses: Record<string, string>;
} {
  const phaseStatuses: Record<string, string> = {};

  let currentPhase = 1;
  let currentTask = "1.1";
  let foundCurrent = false;

  for (const phase of PHASES) {
    const phaseTasks = getTasksForPhase(phase.phase);
    const allDone = phaseTasks.every(
      (t) =>
        taskStatuses[t.id] === "completed" || taskStatuses[t.id] === "skipped",
    );
    const anyStarted = phaseTasks.some(
      (t) =>
        taskStatuses[t.id] === "completed" ||
        taskStatuses[t.id] === "in_progress" ||
        taskStatuses[t.id] === "skipped",
    );

    if (allDone) {
      phaseStatuses[String(phase.phase)] = "completed";
    } else if (anyStarted) {
      phaseStatuses[String(phase.phase)] = "in_progress";
      if (!foundCurrent) {
        currentPhase = phase.phase;
        // Find the first incomplete task in this phase
        const nextTask = phaseTasks.find(
          (t) =>
            taskStatuses[t.id] !== "completed" &&
            taskStatuses[t.id] !== "skipped",
        );
        currentTask = nextTask?.id ?? phaseTasks[0]?.id ?? "1.1";
        foundCurrent = true;
      }
    } else {
      phaseStatuses[String(phase.phase)] = "not_started";
      if (!foundCurrent) {
        currentPhase = phase.phase;
        currentTask = phaseTasks[0]?.id ?? `${phase.phase}.1`;
        foundCurrent = true;
      }
    }
  }

  // If all tasks are done, stay on last task of last phase
  if (!foundCurrent) {
    const lastTask = TASKS.at(-1);
    if (lastTask) {
      currentPhase = lastTask.phase;
      currentTask = lastTask.id;
    }
  }

  return { currentPhase, currentTask, phaseStatuses };
}
