import { getPlanLimits, getPlans } from "@/lib/billing/plans";
import { prisma } from "@/lib/db";

export class BillingLimitError extends Error {
  code: "analyses" | "projects" | "chat";
  upgradeRequired = true;

  constructor(code: BillingLimitError["code"], message: string) {
    super(message);
    this.name = "BillingLimitError";
    this.code = code;
  }
}

async function loadUserBilling(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planStatus: true },
  });
  if (!user) throw new Error("User not found.");
  return user;
}

function startOfUtcDay(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Record one analysis attempt (new project or re-analyze). */
export async function recordAnalysisUsage(userId: string): Promise<void> {
  await prisma.usageEvent.create({
    data: { userId, type: "analysis" },
  });
}

export async function assertCanCreateProject(userId: string): Promise<void> {
  const user = await loadUserBilling(userId);
  const limits = getPlanLimits(user.plan, user.planStatus);

  const projectCount = await prisma.project.count({ where: { userId } });
  if (projectCount >= limits.maxProjects) {
    throw new BillingLimitError(
      "projects",
      `Project limit reached (${limits.maxProjects} on ${limits.label}). Upgrade to ${getPlans().premium.label} for unlimited projects.`,
    );
  }

  await assertCanRunAnalysis(userId);
}

export async function assertCanRunAnalysis(userId: string): Promise<void> {
  const user = await loadUserBilling(userId);
  const limits = getPlanLimits(user.plan, user.planStatus);
  const since = startOfUtcDay();

  const used = await prisma.usageEvent.count({
    where: {
      userId,
      type: "analysis",
      createdAt: { gte: since },
    },
  });

  if (used >= limits.analysesPerDay) {
    const paid = getPlans().premium;
    throw new BillingLimitError(
      "analyses",
      `Daily analysis limit reached (${limits.analysesPerDay}/day on ${limits.label}). ${
        limits.label === getPlans().free.label
          ? `Upgrade to ${paid.label} for a higher limit, or try again tomorrow.`
          : "Try again tomorrow."
      }`,
    );
  }
}

export async function getBillingSnapshot(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      plan: true,
      planStatus: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });
  if (!user) throw new Error("User not found.");

  const limits = getPlanLimits(user.plan, user.planStatus);
  const since = startOfUtcDay();
  const analysesUsedToday = await prisma.usageEvent.count({
    where: { userId, type: "analysis", createdAt: { gte: since } },
  });
  const projectCount = await prisma.project.count({ where: { userId } });

  return {
    plan: user.plan,
    planStatus: user.planStatus,
    limits,
    analysesUsedToday,
    projectCount,
    hasStripeCustomer: Boolean(user.stripeCustomerId),
    hasSubscription: Boolean(user.stripeSubscriptionId),
  };
}