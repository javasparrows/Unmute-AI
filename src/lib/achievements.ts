import { prisma } from "@/lib/prisma";

export type AchievementType =
  | "FIRST_DOCUMENT"
  | "FIRST_CITATION"
  | "FIRST_EVIDENCE_MAP"
  | "FIRST_VERIFICATION"
  | "FIRST_EXPORT"
  | "CITATIONS_5"
  | "CITATIONS_10"
  | "CITATIONS_25"
  | "EVIDENCE_COMPLETE"
  | "FLOW_ANALYSIS"
  | "COMPLIANCE_CHECK"
  | "POMODORO_FIRST"
  | "POMODORO_10";

const ACHIEVEMENT_MESSAGES: Record<AchievementType, { title: string; description: string }> = {
  FIRST_DOCUMENT: { title: "最初の論文", description: "最初のドキュメントを作成しました！" },
  FIRST_CITATION: { title: "初引用", description: "最初の引用を追加しました！" },
  FIRST_EVIDENCE_MAP: { title: "エビデンス発見", description: "最初のエビデンスマッピングを完了しました！" },
  FIRST_VERIFICATION: { title: "検証者", description: "最初のエビデンスを検証しました！" },
  FIRST_EXPORT: { title: "初エクスポート", description: "最初の論文をエクスポートしました！" },
  CITATIONS_5: { title: "引用の達人", description: "5件の引用を追加しました！" },
  CITATIONS_10: { title: "文献マスター", description: "10件の引用を達成しました！" },
  CITATIONS_25: { title: "引用の王者", description: "25件の引用を達成しました！" },
  EVIDENCE_COMPLETE: { title: "完全検証", description: "全エビデンスの検証を完了しました！" },
  FLOW_ANALYSIS: { title: "構成チェック", description: "初めてのフロー分析を実行しました！" },
  COMPLIANCE_CHECK: { title: "ガイドライン準拠", description: "初めてのコンプライアンスチェックを実行しました！" },
  POMODORO_FIRST: { title: "集中モード", description: "最初のPomodoroセッションを完了しました！" },
  POMODORO_10: { title: "集中の達人", description: "10回のPomodoroセッションを完了しました！" },
};

/**
 * Award an achievement to a user. Idempotent — won't duplicate.
 * Returns the achievement message if newly awarded, null if already had.
 */
export async function awardAchievement(
  userId: string,
  type: AchievementType,
  documentId?: string,
): Promise<{ title: string; description: string } | null> {
  try {
    await prisma.achievement.create({
      data: {
        userId,
        type,
        documentId,
      },
    });
    return ACHIEVEMENT_MESSAGES[type];
  } catch {
    // Unique constraint violation = already awarded
    return null;
  }
}

/**
 * Check and award milestone achievements based on counts.
 */
export async function checkMilestoneAchievements(userId: string): Promise<{ title: string; description: string }[]> {
  const awarded: { title: string; description: string }[] = [];

  const [citationCount, mappingCount, verifiedCount, sessionCount] = await Promise.all([
    prisma.manuscriptCitation.count({
      where: { document: { userId } },
    }),
    prisma.evidenceMapping.count({
      where: { document: { userId } },
    }),
    prisma.evidenceMapping.count({
      where: { document: { userId }, humanVerified: true },
    }),
    prisma.writingSession.count({
      where: { userId, status: "COMPLETED" },
    }),
  ]);

  if (citationCount >= 5) {
    const r = await awardAchievement(userId, "CITATIONS_5");
    if (r) awarded.push(r);
  }
  if (citationCount >= 10) {
    const r = await awardAchievement(userId, "CITATIONS_10");
    if (r) awarded.push(r);
  }
  if (citationCount >= 25) {
    const r = await awardAchievement(userId, "CITATIONS_25");
    if (r) awarded.push(r);
  }
  if (mappingCount > 0 && mappingCount === verifiedCount) {
    const r = await awardAchievement(userId, "EVIDENCE_COMPLETE");
    if (r) awarded.push(r);
  }
  if (sessionCount >= 10) {
    const r = await awardAchievement(userId, "POMODORO_10");
    if (r) awarded.push(r);
  }

  return awarded;
}

/**
 * Get all achievements for a user.
 */
export async function getUserAchievements(userId: string) {
  const achievements = await prisma.achievement.findMany({
    where: { userId },
    orderBy: { achievedAt: "desc" },
  });

  return achievements.map((a) => ({
    ...a,
    ...(ACHIEVEMENT_MESSAGES[a.type as AchievementType] ?? { title: a.type, description: "" }),
  }));
}
