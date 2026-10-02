import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { update, findFirst } = vi.hoisted(() => ({
  update: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { update, findFirst },
  },
}));

vi.mock("@/lib/billing/stripe", () => ({
  getPremiumPriceId: () => "price_premium_test",
}));

import {
  handleCheckoutSessionCompleted,
  markUserSubscriptionCanceled,
  syncSubscriptionFromStripe,
} from "@/lib/billing/webhook-handlers";

function fakeSubscription(
  overrides: Partial<Stripe.Subscription> & {
    metadata?: Record<string, string>;
    status?: Stripe.Subscription.Status;
    priceId?: string;
  } = {},
): Stripe.Subscription {
  const priceId = overrides.priceId ?? "price_premium_test";
  return {
    id: "sub_test",
    object: "subscription",
    customer: "cus_test",
    status: overrides.status ?? "active",
    metadata: overrides.metadata ?? { userId: "user-1" },
    items: {
      object: "list",
      data: [
        {
          id: "si_1",
          object: "subscription_item",
          price: { id: priceId, object: "price" },
        } as Stripe.SubscriptionItem,
      ],
      has_more: false,
      url: "",
    },
    ...overrides,
  } as Stripe.Subscription;
}

describe("webhook-handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handleCheckoutSessionCompleted sets premium active", async () => {
    update.mockResolvedValue({});

    await handleCheckoutSessionCompleted({
      id: "cs_test",
      object: "checkout.session",
      metadata: { userId: "user-1" },
      customer: "cus_test",
      subscription: "sub_test",
    } as unknown as Stripe.Checkout.Session);

    expect(update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({
        plan: "premium",
        planStatus: "active",
        stripeCustomerId: "cus_test",
        stripeSubscriptionId: "sub_test",
        stripePriceId: "price_premium_test",
      }),
    });
  });

  it("handleCheckoutSessionCompleted no-ops without userId", async () => {
    await handleCheckoutSessionCompleted({
      id: "cs_test",
      object: "checkout.session",
      metadata: {},
      client_reference_id: null,
    } as unknown as Stripe.Checkout.Session);

    expect(update).not.toHaveBeenCalled();
  });

  it("syncSubscriptionFromStripe maps active sub to premium", async () => {
    update.mockResolvedValue({});

    await syncSubscriptionFromStripe(fakeSubscription());

    expect(update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({
        plan: "premium",
        planStatus: "active",
        stripeSubscriptionId: "sub_test",
      }),
    });
  });

  it("syncSubscriptionFromStripe downgrades canceled sub to free", async () => {
    update.mockResolvedValue({});

    await syncSubscriptionFromStripe(fakeSubscription({ status: "canceled" }));

    expect(update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: expect.objectContaining({
        plan: "free",
        planStatus: "canceled",
      }),
    });
  });

  it("syncSubscriptionFromStripe finds user by stripe customer", async () => {
    findFirst.mockResolvedValue({ id: "user-from-customer" });
    update.mockResolvedValue({});

    await syncSubscriptionFromStripe(fakeSubscription({ metadata: {} }));

    expect(findFirst).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "user-from-customer" } }),
    );
  });

  it("markUserSubscriptionCanceled clears paid fields", async () => {
    update.mockResolvedValue({});
    await markUserSubscriptionCanceled("user-1");
    expect(update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        plan: "free",
        planStatus: "canceled",
        stripeSubscriptionId: null,
        stripePriceId: null,
      },
    });
  });
});