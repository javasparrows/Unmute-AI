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
