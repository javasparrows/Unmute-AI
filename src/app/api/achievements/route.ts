import { auth } from "@/lib/auth";
import { getUserAchievements, checkMilestoneAchievements } from "@/lib/achievements";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check for new milestone achievements
  const newAchievements = await checkMilestoneAchievements(session.user.id);

  // Return all achievements
  const achievements = await getUserAchievements(session.user.id);

  return Response.json({ achievements, newAchievements });
}
