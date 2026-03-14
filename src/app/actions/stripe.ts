"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function createCheckoutSession(
  priceId: string,
): Promise<{ url: string | null; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { url: null, error: "Not authenticated" };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true, email: true },
    });

    let customerId = user?.stripeCustomerId;

    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: user?.email ?? session.user.email ?? undefined,
        metadata: { userId: session.user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: session.user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/settings/billing?success=true`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      allow_promotion_codes: true,
    });

    return { url: checkoutSession.url };
  } catch (err) {
    console.error("Checkout session creation failed:", err);
    return { url: null, error: "Failed to create checkout session" };
  }
}

export async function createPortalSession(): Promise<{ url: string | null; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { url: null, error: "Not authenticated" };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) return { url: null, error: "No subscription" };

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    const portalSession = await getStripe().billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/settings/billing`,
    });

    return { url: portalSession.url };
  } catch (err) {
    console.error("Portal session creation failed:", err);
    return { url: null, error: "Failed to create portal session" };
  }
}

export async function cancelSubscription(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return { success: false, error: "Not authenticated" };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeSubscriptionId: true },
    });

    if (!user?.stripeSubscriptionId)
      return { success: false, error: "No active subscription" };

    await getStripe().subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    return { success: true };
  } catch (err) {
    console.error("Subscription cancellation failed:", err);
    return { success: false, error: "Failed to cancel subscription" };
  }
}

export async function reactivateSubscription(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return { success: false, error: "Not authenticated" };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeSubscriptionId: true },
    });

    if (!user?.stripeSubscriptionId)
      return { success: false, error: "No active subscription" };

    await getStripe().subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    return { success: true };
  } catch (err) {
    console.error("Subscription reactivation failed:", err);
    return { success: false, error: "Failed to reactivate subscription" };
  }
}

export async function changeSubscription(priceId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return { success: false, error: "Not authenticated" };

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeSubscriptionId: true },
    });

    if (!user?.stripeSubscriptionId)
      return { success: false, error: "No active subscription" };

    const subscription = await getStripe().subscriptions.retrieve(
      user.stripeSubscriptionId,
    );

    const itemId = subscription.items.data[0]?.id;
    if (!itemId)
      return { success: false, error: "No subscription item found" };

    await getStripe().subscriptions.update(user.stripeSubscriptionId, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: "create_prorations",
    });

    return { success: true };
  } catch (err) {
    console.error("Subscription change failed:", err);
    return { success: false, error: "Failed to change subscription" };
  }
}
