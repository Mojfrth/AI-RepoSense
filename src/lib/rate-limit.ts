import { getPlanLimits, getPlans } from "@/lib/billing/plans";
import { prisma } from "@/lib/db";

type Bucket = number[];

const chatBuckets = new Map<string, Bucket>();

export async function assertChatRateLimit(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planStatus: true },
  });
  const limits = getPlanLimits(user?.plan, user?.planStatus);
  const max = limits.chatPerHour;
  const freeLabel = getPlans().free.label;
  const paidLabel = getPlans().premium.label;

  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const previous = chatBuckets.get(userId) ?? [];
  const recent = previous.filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= max) {
    throw new RateLimitError(
      `Chat rate limit reached (${max} messages/hour on ${limits.label}). ${
        limits.label === freeLabel
          ? `Upgrade to ${paidLabel} for a higher limit.`
          : "Try again later."
      }`,
    );
  }

  recent.push(now);
  chatBuckets.set(userId, recent);
}

export class RateLimitError extends Error {
  status = 429;

  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}