import { prismaAdmin } from "@/lib/prisma";
import type { Plan, PlanChangeSource } from "@/generated/prisma/client";

interface RecordPlanChangeParams {
  userId: string;
  fromPlan: Plan;
  toPlan: Plan;
  source: PlanChangeSource;
  externalEventId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  note?: string;
}

/**
 * Record a plan change in the PlanChangeLog table.
 *
 * - Skips logging if fromPlan === toPlan (no actual change).
 * - For STRIPE_WEBHOOK source with an externalEventId, uses upsert
 *   to prevent duplicate entries from webhook replays.
 */
export async function recordPlanChange(
  params: RecordPlanChangeParams,
): Promise<void> {
  const {
    userId,
    fromPlan,
    toPlan,
    source,
    externalEventId,
    stripeSubscriptionId,
    stripePriceId,
    note,
  } = params;

  // No-op guard: skip if the plan didn't actually change
  if (fromPlan === toPlan) {
    return;
  }

  const data = {
    userId,
    fromPlan,
    toPlan,
    source,
    externalEventId,
    stripeSubscriptionId,
    stripePriceId,
    note,
  };

  // Use upsert for STRIPE_WEBHOOK with externalEventId to handle
  // duplicate webhook deliveries idempotently
  if (source === "STRIPE_WEBHOOK" && externalEventId) {
    await prismaAdmin.planChangeLog.upsert({
      where: { externalEventId },
      create: data,
      update: {},
    });
    return;
  }

  await prismaAdmin.planChangeLog.create({ data });
}
