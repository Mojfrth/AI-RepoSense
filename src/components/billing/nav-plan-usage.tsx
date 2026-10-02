import { getBillingSnapshot } from "@/lib/billing/entitlements";
import { effectivePlanId, getPlans } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";
import Link from "next/link";

function formatLimit(n: number) {
  return Number.isFinite(n) ? String(n) : "∞";
}

export async function NavPlanUsage({ userId }: { userId: string }) {
  const billing = await getBillingSnapshot(userId);
  const planId = effectivePlanId(billing.plan, billing.planStatus);
  const plans = getPlans();
  const label = plans[planId].label;
  const isPaid = planId === "premium";
  const used = billing.analysesUsedToday;
  const max = billing.limits.analysesPerDay;
  const nearLimit = Number.isFinite(max) && used / max >= 0.8;

  return (
    <Link
      href="/settings"
      title="Open billing settings"
      className={cn(
        "hidden items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition-colors sm:inline-flex",
        isPaid
          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-800 hover:bg-cyan-500/15 dark:text-cyan-200"
          : "border-[color:var(--app-line)] bg-[color:var(--app-surface)] text-[color:var(--app-ink)] hover:border-[color:var(--app-accent)]/40",
      )}
    >
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
          isPaid
            ? "bg-cyan-500/20 text-cyan-800 dark:text-cyan-200"
            : "bg-muted text-[color:var(--app-muted)]",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "font-medium tabular-nums",
          nearLimit
            ? "text-amber-700 dark:text-amber-300"
            : "text-[color:var(--app-muted)]",
        )}
      >
        {used}/{formatLimit(max)}
        <span className="ms-1 hidden font-normal lg:inline">today</span>
      </span>
    </Link>
  );
}