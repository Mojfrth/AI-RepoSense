import {
  ManageBillingButton,
  RefreshBillingButton,
  UpgradeToPremiumButton,
} from "@/components/billing/billing-buttons";
import { Button, buttonVariants } from "@/components/ui/button";
import { connectGitHubAccount, disconnectGitHub } from "@/lib/actions/github";
import { auth } from "@/lib/auth";
import { getBillingSnapshot } from "@/lib/billing/entitlements";
import {
  effectivePlanId,
  getPlansWithStripePricing,
} from "@/lib/billing/plans";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import Link from "next/link";

type PageProps = {
  searchParams: Promise<{
    github?: string;
    github_error?: string;
    billing?: string;
    session_id?: string;
  }>;
};

function formatLimit(n: number) {
  return Number.isFinite(n) ? String(n) : "∞";
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) return null;

  const params = await searchParams;
  const plans = await getPlansWithStripePricing();
  const paid = plans.premium;

  // Activate plan after Checkout even if the webhook was missed (local/dev).
  if (params.billing === "success") {
    const { syncCheckoutSessionForUser, syncCustomerSubscriptionsForUser } =
      await import("@/lib/billing/sync-checkout");

    if (params.session_id) {
      await syncCheckoutSessionForUser(session.user.id, params.session_id);
    } else {
      await syncCustomerSubscriptionsForUser(session.user.id);
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      authProvider: true,
      githubUsername: true,
      githubAccessToken: true,
    },
  });

  const billing = await getBillingSnapshot(session.user.id);
  const planId = effectivePlanId(billing.plan, billing.planStatus);
  const isPaid = planId === "premium";
  const current = plans[planId];
  const githubConnected = Boolean(user?.githubAccessToken);

  return (
    <main className="app-page app-page-narrow">
      <header className="mb-8">
        <p className="app-kicker">Account</p>
        <h1 className="app-title mt-2 text-3xl">Settings</h1>
        <p className="mt-2 text-sm text-[color:var(--app-muted)]">
          Manage your profile, plan, and GitHub connection.
        </p>
      </header>

      {params.github === "connected" ? (
        <p className="mb-4 rounded-2xl border border-[color:var(--app-line)] bg-[color:var(--app-accent)]/10 px-4 py-3 text-sm text-[color:var(--app-accent-deep)]">
          GitHub connected successfully.
        </p>
      ) : null}
      {params.github_error ? (
        <p className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          GitHub connection failed ({params.github_error}). Try again.
        </p>
      ) : null}
      {params.billing === "success" ? (
        <p className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          Payment received
          {isPaid
            ? `. Your ${paid.label} plan is active.`
            : `. If the plan still shows ${plans.free.label}, click “Refresh plan from Stripe”.`}
        </p>
      ) : null}
      {params.billing === "synced" ? (
        <p className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          Plan synced from Stripe successfully.
        </p>
      ) : null}
      {params.billing === "sync_failed" ? (
        <p className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          No active Stripe subscription found for this account yet. Wait a
          moment and try Refresh again, or confirm payment in the Stripe
          Dashboard.
        </p>
      ) : null}
      {params.billing === "canceled" ? (
        <p className="mb-4 rounded-2xl border border-[color:var(--app-line)] bg-muted/40 px-4 py-3 text-sm text-[color:var(--app-muted)]">
          Checkout was canceled. You can upgrade anytime.
        </p>
      ) : null}

      <section className="app-panel mb-5 space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="app-title text-lg">Billing</h2>
            <p className="mt-1 text-sm text-[color:var(--app-muted)]">
              {plans.free.label} includes limited daily analyses. {paid.label}{" "}
              unlocks higher limits.
            </p>
          </div>
          <span
            className={cn(
              "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
              isPaid
                ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                : "border-[color:var(--app-line)] bg-muted/50 text-[color:var(--app-muted)]",
            )}
          >
            {current.label}
            {billing.planStatus === "past_due" ? " · past due" : ""}
          </span>
        </div>

        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-xl border border-[color:var(--app-line)] px-3 py-2.5">
            <dt className="text-xs text-[color:var(--app-muted)]">
              Analyses today
            </dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {billing.analysesUsedToday}
              <span className="font-normal text-[color:var(--app-muted)]">
                {" "}
                / {formatLimit(billing.limits.analysesPerDay)}
              </span>
            </dd>
          </div>
          <div className="rounded-xl border border-[color:var(--app-line)] px-3 py-2.5">
            <dt className="text-xs text-[color:var(--app-muted)]">Projects</dt>
            <dd className="mt-1 font-semibold tabular-nums">
              {billing.projectCount}
              <span className="font-normal text-[color:var(--app-muted)]">
                {" "}
                / {formatLimit(billing.limits.maxProjects)}
              </span>
            </dd>
          </div>
          <div className="rounded-xl border border-[color:var(--app-line)] px-3 py-2.5 sm:col-span-2">
            <dt className="text-xs text-[color:var(--app-muted)]">
              Chat messages / hour
            </dt>
            <dd className="mt-1 font-semibold tabular-nums">
              up to {billing.limits.chatPerHour}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-2">
          {isPaid ? (
            <ManageBillingButton />
          ) : (
            <>
              <UpgradeToPremiumButton
                label={`Upgrade to ${paid.label}`}
                planLabel={paid.label}
                priceLabel={paid.priceLabel}
                features={paid.features}
              />
              {billing.hasStripeCustomer ? <ManageBillingButton /> : null}
            </>
          )}
          {billing.hasStripeCustomer ? <RefreshBillingButton /> : null}
        </div>

        {!isPaid ? (
          <ul className="space-y-1.5 text-sm text-[color:var(--app-muted)]">
            <li>
              {paid.label} · {paid.priceLabel}
            </li>
            {paid.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="app-panel mb-5 space-y-3 p-6">
        <h2 className="app-title text-lg">Profile</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[color:var(--app-muted)]">Name</dt>
            <dd className="font-medium">{user?.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[color:var(--app-muted)]">Email</dt>
            <dd className="font-medium">{user?.email ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[color:var(--app-muted)]">Auth provider</dt>
            <dd className="font-medium capitalize">
              {user?.authProvider ?? "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="app-panel space-y-4 p-6">
        <div>
          <h2 className="app-title text-lg">GitHub</h2>
          <p className="mt-1 text-sm text-[color:var(--app-muted)]">
            Required to select a repository. If you signed in with GitHub, the
            connection already appears here.
          </p>
        </div>
        {githubConnected ? (
          <>
            <p className="text-sm">
              Connected as{" "}
              <span className="font-semibold text-[color:var(--app-accent-deep)]">
                {user?.githubUsername ?? "GitHub"}
              </span>
            </p>
            <form action={disconnectGitHub}>
              <Button type="submit" variant="outline">
                Disconnect GitHub
              </Button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-[color:var(--app-muted)]">
              GitHub is not connected yet.
            </p>
            <form action={connectGitHubAccount}>
              <Button
                type="submit"
                className="bg-[linear-gradient(135deg,#06b6d4_0%,#0e7490_100%)] text-white hover:opacity-90"
              >
                Connect GitHub
              </Button>
            </form>
          </>
        )}
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "px-0",
          )}
        >
          ← Back to projects
        </Link>
      </section>
    </main>
  );
}