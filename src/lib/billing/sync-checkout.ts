import { getStripe } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db";
import {
  handleCheckoutSessionCompleted,
  syncSubscriptionFromStripe,
} from "./webhook-handlers";

/**
 * After Checkout redirect, sync the session even if the webhook was missed
 */
export async function syncCheckoutSessionForUser(
  userId: string,
  checkoutSessionId: string,
): Promise<boolean> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ["subscription"],
  });

  const sessionUserId =
    session.metadata?.userId || session.client_reference_id || null;

  if (sessionUserId && sessionUserId !== userId) {
    console.warn("[stripe] checkout session user mismatch", {
      sessionUserId,
      userId,
    });
    return false;
  }

  if (session.status !== "complete" && session.payment_status !== "paid") {
    return false;
  }

  await handleCheckoutSessionCompleted(session);

  const subscription =
    typeof session.subscription === "string"
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

  if (subscription && typeof subscription !== "string") {
    await syncSubscriptionFromStripe(subscription);
  }

  return true;
}

/** Recover plan from Stripe by listing the customer's subscriptions. */
export async function syncCustomerSubscriptionsForUser(
  userId: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!user?.stripeCustomerId) return false;

  const stripe = getStripe();
  const list = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: "all",
    limit: 5,
  });

  const active = list.data.find(
    (sub) =>
      sub.status === "active" ||
      sub.status === "trialing" ||
      sub.status === "past_due",
  );

  if (!active) return false;

  await syncSubscriptionFromStripe(active);
  return true;
}