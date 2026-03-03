import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPlanInfo, type PlanLimits } from "@/lib/plans";
import type { Plan } from "@/generated/prisma/client";

export async function getUserPlan(): Promise<{
  plan: Plan;
  limits: PlanLimits;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    return { plan: "FREE", limits: getPlanInfo("FREE").limits };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { plan: true, planOverride: true },
  });

  const plan = user?.planOverride ?? user?.plan ?? "FREE";
  return { plan, limits: getPlanInfo(plan).limits };
}

export async function getUserPlanById(userId: string): Promise<{
  plan: Plan;
  limits: PlanLimits;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planOverride: true },
  });

  const plan = user?.planOverride ?? user?.plan ?? "FREE";
  return { plan, limits: getPlanInfo(plan).limits };
}
