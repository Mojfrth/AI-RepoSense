import { getPremiumPriceId } from "@/lib/billing/stripe";
import { prisma } from "@/lib/db";
import type Stripe from "stripe";

function planFromPriceId(priceId: string | null | undefined) {
  if (!priceId) return { plan: "free" as const, stripePriceId: null };
  try {
    if (priceId === getPremiumPriceId()) {
      return { plan: "premium" as const, stripePriceId: priceId };
    }
  } catch {
    // Price env missing in some contexts — fall through
  }

  return { plan: "premium" as const, stripePriceId: priceId };
}

function statusFromStripe(
  status: Stripe.Subscription.Status,
): "active" | "past_due" | "canceled" | "none" {
  if (status === "active" || status === "trialing") return "active";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (
    status === "canceled" ||
    status === "incomplete_expired" ||
    status === "paused"
  ) {
    return "canceled";
  }
  return "none";
}

async function findUserIdForSubscription(
  subscription: Stripe.Subscription,
): Promise<string | null> {
  const fromMeta = subscription.metadata?.userId;
  if (fromMeta) return fromMeta;

  if (typeof subscription.customer === "string") {
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: subscription.customer },
      select: { id: true },
    });
    return user?.id ?? null;
  }

  return null;
}

export async function syncSubscriptionFromStripe(
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId = await findUserIdForSubscription(subscription);
  if (!userId) {
    console.warn(
      "[stripe] No user for subscription",
      subscription.id,
      subscription.metadata,
    );
    return;
  }

  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const mapped = planFromPriceId(priceId);
  const planStatus = statusFromStripe(subscription.status);

  const entitled =
    planStatus === "active" || planStatus === "past_due"
      ? mapped.plan
      : ("free" as const);

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: mapped.stripePriceId,
      plan: entitled,
      planStatus,
      ...(typeof subscription.customer === "string"
        ? { stripeCustomerId: subscription.customer }
        : {}),
    },
  });
}

export async function markUserSubscriptionCanceled(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      plan: "free",
      planStatus: "canceled",
      stripeSubscriptionId: null,
      stripePriceId: null,
    },
  });
}

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId =
    session.metadata?.userId || session.client_reference_id || null;

  if (!userId) {
    console.warn("[stripe] checkout.session.completed missing userId");
    return;
  }

  const customerId =
    typeof session.customer === "string" ? session.customer : null;
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(customerId ? { stripeCustomerId: customerId } : {}),
      ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
      plan: "premium",
      planStatus: "active",
      stripePriceId: getPremiumPriceId(),
    },
  });
}