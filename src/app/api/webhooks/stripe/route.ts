import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prismaAdmin } from "@/lib/prisma";
import { getPlanByPriceId } from "@/lib/plans";
import { recordPlanChange } from "@/lib/plan-change-log";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const subscription = await getStripe().subscriptions.retrieve(
          session.subscription as string,
        );
        await handleSubscriptionUpdate(subscription, event.id);
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(subscription, event.id);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription, event.id);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.customer) {
        await prismaAdmin.user.updateMany({
          where: {
            stripeCustomerId: invoice.customer as string,
            deletedAt: null,
          },
          data: { subscriptionStatus: "past_due" },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  eventId: string,
) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  const planInfo = priceId ? getPlanByPriceId(priceId) : undefined;
  const plan = planInfo?.id ?? "FREE";

  // Use "canceling" status when subscription is set to cancel at period end
  const status = subscription.cancel_at_period_end
    ? "canceling"
    : subscription.status;

  // Fetch current effective plan before updating
  const currentUser = await prismaAdmin.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true, plan: true, planOverride: true, deletedAt: true },
  });

  // Skip webhook processing for soft-deleted users
  if (currentUser?.deletedAt) {
    console.log(`Skipping webhook for soft-deleted user: ${currentUser.id}`);
    return;
  }

  await prismaAdmin.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      plan,
      subscriptionStatus: status,
      currentPeriodEnd: new Date(
        subscription.items.data[0]?.current_period_end * 1000,
      ),
    },
  });

  // Log the plan change
  if (currentUser) {
    const fromPlan = currentUser.planOverride ?? currentUser.plan;
    await recordPlanChange({
      userId: currentUser.id,
      fromPlan,
      toPlan: plan,
      source: "STRIPE_WEBHOOK",
      externalEventId: eventId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
    });
  }
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  eventId: string,
) {
  const customerId = subscription.customer as string;

  // Fetch current effective plan before updating
  const currentUser = await prismaAdmin.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true, plan: true, planOverride: true, deletedAt: true },
  });

  // Skip webhook processing for soft-deleted users
  if (currentUser?.deletedAt) {
    console.log(`Skipping webhook for soft-deleted user: ${currentUser.id}`);
    return;
  }

  await prismaAdmin.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      plan: "FREE",
      stripeSubscriptionId: null,
      stripePriceId: null,
      subscriptionStatus: "canceled",
      currentPeriodEnd: null,
    },
  });

  // Log the plan change to FREE
  if (currentUser) {
    const fromPlan = currentUser.planOverride ?? currentUser.plan;
    await recordPlanChange({
      userId: currentUser.id,
      fromPlan,
      toPlan: "FREE",
      source: "STRIPE_WEBHOOK",
      externalEventId: eventId,
      stripeSubscriptionId: subscription.id,
    });
  }
}
