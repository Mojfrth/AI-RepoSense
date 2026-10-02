import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, countProject, countUsage, createUsage } = vi.hoisted(
  () => ({
    findUnique: vi.fn(),
    countProject: vi.fn(),
    countUsage: vi.fn(),
    createUsage: vi.fn(),
  }),
);

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique },
    project: { count: countProject },
    usageEvent: { count: countUsage, create: createUsage },
  },
}));

import {
  assertCanCreateProject,
  assertCanRunAnalysis,
  BillingLimitError,
  getBillingSnapshot,
  recordAnalysisUsage,
} from "@/lib/billing/entitlements";

describe("entitlements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PLAN_FREE_ANALYSES_PER_DAY;
    delete process.env.PLAN_FREE_MAX_PROJECTS;
  });

  it("recordAnalysisUsage creates an analysis usage event", async () => {
    createUsage.mockResolvedValue({});
    await recordAnalysisUsage("user-1");
    expect(createUsage).toHaveBeenCalledWith({
      data: { userId: "user-1", type: "analysis" },
    });
  });

  it("assertCanRunAnalysis allows when under daily limit", async () => {
    findUnique.mockResolvedValue({ plan: "free", planStatus: "none" });
    countUsage.mockResolvedValue(2);
    await expect(assertCanRunAnalysis("user-1")).resolves.toBeUndefined();
  });

  it("assertCanRunAnalysis throws BillingLimitError at daily cap", async () => {
    findUnique.mockResolvedValue({ plan: "free", planStatus: "none" });
    countUsage.mockResolvedValue(5);

    await expect(assertCanRunAnalysis("user-1")).rejects.toMatchObject({
      name: "BillingLimitError",
      code: "analyses",
    });
  });

  it("assertCanCreateProject throws when project cap reached", async () => {
    findUnique.mockResolvedValue({ plan: "free", planStatus: "none" });
    countProject.mockResolvedValue(5);

    await expect(assertCanCreateProject("user-1")).rejects.toBeInstanceOf(
      BillingLimitError,
    );
    await expect(assertCanCreateProject("user-1")).rejects.toMatchObject({
      code: "projects",
    });
  });

  it("assertCanCreateProject checks analysis limit after project count", async () => {
    findUnique.mockResolvedValue({ plan: "free", planStatus: "none" });
    countProject.mockResolvedValue(1);
    countUsage.mockResolvedValue(5);

    await expect(assertCanCreateProject("user-1")).rejects.toMatchObject({
      code: "analyses",
    });
  });

  it("getBillingSnapshot returns usage and limits", async () => {
    findUnique.mockResolvedValue({
      plan: "premium",
      planStatus: "active",
      stripeCustomerId: "cus_1",
      stripeSubscriptionId: "sub_1",
    });
    countUsage.mockResolvedValue(3);
    countProject.mockResolvedValue(7);

    const snap = await getBillingSnapshot("user-1");
    expect(snap.analysesUsedToday).toBe(3);
    expect(snap.projectCount).toBe(7);
    expect(snap.hasStripeCustomer).toBe(true);
    expect(snap.hasSubscription).toBe(true);
    expect(snap.limits.analysesPerDay).toBe(50);
  });
});