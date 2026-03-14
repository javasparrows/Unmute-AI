import { prismaAdmin } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { recordPlanChange } from "@/lib/plan-change-log";
import type { Plan, UserRole } from "@/generated/prisma/client";

export class AdminActionError extends Error {
  constructor(
    message: string,
    public code:
      | "SELF_ACTION"
      | "LAST_ADMIN"
      | "NOT_FOUND"
      | "ALREADY_DELETED"
      | "NOT_DELETED",
  ) {
    super(message);
    this.name = "AdminActionError";
  }
}

export async function changeRole(
  adminId: string,
  targetId: string,
  newRole: UserRole,
) {
  if (adminId === targetId) {
    throw new AdminActionError("Cannot change your own role", "SELF_ACTION");
  }

  const target = await prismaAdmin.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true, deletedAt: true },
  });
  if (!target || target.deletedAt) {
    throw new AdminActionError("User not found", "NOT_FOUND");
  }

  // Prevent demoting last admin
  if (target.role === "ADMIN" && newRole === "USER") {
    const adminCount = await prismaAdmin.user.count({
      where: { role: "ADMIN", deletedAt: null },
    });
    if (adminCount <= 1) {
      throw new AdminActionError("Cannot demote the last admin", "LAST_ADMIN");
    }
  }

  const [updatedUser] = await prismaAdmin.$transaction([
    prismaAdmin.user.update({
      where: { id: targetId },
      data: { role: newRole },
    }),
    prismaAdmin.adminActionLog.create({
      data: {
        actorId: adminId,
        targetUserId: targetId,
        action: "ROLE_CHANGE",
        before: { role: target.role },
        after: { role: newRole },
      },
    }),
  ]);

  return updatedUser;
}

export async function setPlanOverride(
  adminId: string,
  targetId: string,
  plan: Plan,
  note?: string,
) {
  const target = await prismaAdmin.user.findUnique({
    where: { id: targetId },
    select: { id: true, plan: true, planOverride: true, deletedAt: true },
  });
  if (!target || target.deletedAt) {
    throw new AdminActionError("User not found", "NOT_FOUND");
  }

  const fromPlan = target.planOverride ?? target.plan;

  const [updatedUser] = await prismaAdmin.$transaction([
    prismaAdmin.user.update({
      where: { id: targetId },
      data: { planOverride: plan, planOverrideNote: note ?? null },
    }),
    prismaAdmin.adminActionLog.create({
      data: {
        actorId: adminId,
        targetUserId: targetId,
        action: "PLAN_OVERRIDE_SET",
        reason: note,
        before: { planOverride: target.planOverride, plan: target.plan },
        after: { planOverride: plan },
      },
    }),
  ]);

  await recordPlanChange({
    userId: targetId,
    fromPlan,
    toPlan: plan,
    source: "ADMIN_OVERRIDE",
    note: note ?? `Admin override by ${adminId}`,
  });

  return updatedUser;
}

export async function clearPlanOverride(
  adminId: string,
  targetId: string,
) {
  const target = await prismaAdmin.user.findUnique({
    where: { id: targetId },
    select: { id: true, plan: true, planOverride: true, deletedAt: true },
  });
  if (!target || target.deletedAt) {
    throw new AdminActionError("User not found", "NOT_FOUND");
  }

  if (target.planOverride === null) return target; // Already cleared

  const fromPlan = target.planOverride ?? target.plan;

  const [updatedUser] = await prismaAdmin.$transaction([
    prismaAdmin.user.update({
      where: { id: targetId },
      data: { planOverride: null, planOverrideNote: null },
    }),
    prismaAdmin.adminActionLog.create({
      data: {
        actorId: adminId,
        targetUserId: targetId,
        action: "PLAN_OVERRIDE_CLEAR",
        before: { planOverride: target.planOverride },
        after: { planOverride: null },
      },
    }),
  ]);

  await recordPlanChange({
    userId: targetId,
    fromPlan,
    toPlan: target.plan, // Reverts to Stripe-managed plan
    source: "ADMIN_OVERRIDE",
    note: `Override cleared by ${adminId}`,
  });

  return updatedUser;
}

export async function softDeleteUser(
  adminId: string,
  targetId: string,
) {
  if (adminId === targetId) {
    throw new AdminActionError("Cannot delete yourself", "SELF_ACTION");
  }

  const target = await prismaAdmin.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      deletedAt: true,
      stripeSubscriptionId: true,
      plan: true,
      planOverride: true,
    },
  });
  if (!target) {
    throw new AdminActionError("User not found", "NOT_FOUND");
  }
  if (target.deletedAt) {
    throw new AdminActionError("User is already deleted", "ALREADY_DELETED");
  }

  // Cancel Stripe subscription immediately if active
  if (target.stripeSubscriptionId) {
    try {
      await getStripe().subscriptions.cancel(target.stripeSubscriptionId);
    } catch (err) {
      console.error("Failed to cancel Stripe subscription:", err);
      // Continue with soft-delete even if Stripe cancel fails
    }
  }

  await prismaAdmin.$transaction([
    prismaAdmin.user.update({
      where: { id: targetId },
      data: {
        deletedAt: new Date(),
        deletedById: adminId,
        planOverride: null,
        planOverrideNote: null,
        plan: "FREE",
        stripeSubscriptionId: null,
        stripePriceId: null,
        subscriptionStatus: "canceled",
        currentPeriodEnd: null,
      },
    }),
    // Invalidate all sessions
    prismaAdmin.session.deleteMany({
      where: { userId: targetId },
    }),
    prismaAdmin.adminActionLog.create({
      data: {
        actorId: adminId,
        targetUserId: targetId,
        action: "SOFT_DELETE",
        before: {
          plan: target.plan,
          planOverride: target.planOverride,
          stripeSubscriptionId: target.stripeSubscriptionId,
        },
      },
    }),
  ]);
}

export async function restoreUser(adminId: string, targetId: string) {
  const target = await prismaAdmin.user.findUnique({
    where: { id: targetId },
    select: { id: true, deletedAt: true },
  });
  if (!target) {
    throw new AdminActionError("User not found", "NOT_FOUND");
  }
  if (!target.deletedAt) {
    throw new AdminActionError("User is not deleted", "NOT_DELETED");
  }

  const [updatedUser] = await prismaAdmin.$transaction([
    prismaAdmin.user.update({
      where: { id: targetId },
      data: {
        deletedAt: null,
        deletedById: null,
        plan: "FREE",
        planOverride: null,
        planOverrideNote: null,
      },
    }),
    prismaAdmin.adminActionLog.create({
      data: {
        actorId: adminId,
        targetUserId: targetId,
        action: "RESTORE",
        after: { plan: "FREE", planOverride: null },
      },
    }),
  ]);

  return updatedUser;
}
