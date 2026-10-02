"use server";

import { auth } from "@/lib/auth";
import { getPaidPlan } from "@/lib/billing/plans";
import { getAppUrl, getPremiumPriceId, getStripe } from "@/lib/billing/stripe";
import { syncCustomerSubscriptionsForUser } from "@/lib/billing/sync-checkout";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user.id;
}

async function ensureStripeCustomer(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      stripeCustomerId: true,
    },
  });
  if (!user) throw new Error("User not found.");

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/** Start Stripe Checkout for the Premium subscription. */
export async function startPremiumCheckout() {
  const userId = await requireUserId();
  const stripe = getStripe();
  const customerId = await ensureStripeCustomer(userId);
  const appUrl = getAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: getPremiumPriceId(), quantity: 1 }],
    success_url: `${appUrl}/settings?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/settings?billing=canceled`,
    client_reference_id: userId,
    metadata: { userId, plan: "premium" },
    subscription_data: {
      metadata: { userId, plan: "premium" },
    },
    allow_promotion_codes: true,
  });

  if (!session.url) {
    throw new Error("Stripe Checkout did not return a redirect URL.");
  }

  redirect(session.url);
}

export async function startProCheckout() {
  return startPremiumCheckout();
}

/** Open Stripe Customer Portal for plan/payment management. */
export async function openBillingPortal() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    throw new Error(
      `No Stripe customer on file. Upgrade to ${getPaidPlan().label} first.`,
    );
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/settings`,
  });

  redirect(session.url);
}

/** Pull latest subscription state from Stripe into our DB. */
export async function refreshBillingFromStripe() {
  const userId = await requireUserId();
  const ok = await syncCustomerSubscriptionsForUser(userId);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  if (!ok) {
    redirect("/settings?billing=sync_failed");
  }
  redirect("/settings?billing=synced");
}