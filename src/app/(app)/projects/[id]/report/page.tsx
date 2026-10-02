import {
  GenerateReportButton,
  RetryFullAnalysisButton,
} from "@/components/projects/report-actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  severityVariant,
  sortIssues,
} from "@/lib/analysis/issue-utils";
import type {
  CategoryScores,
  CategorySummaries,
  IssueCategory,
  ReportIssue,
} from "@/lib/analysis/report-types";
import {
  CATEGORY_ACCENT,
  scoreBarClass,
  scoreChipClass,
  scoreLabel,
  scoreTextClass,
  scoreTone,
} from "@/lib/analysis/score-ui";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Code2,
  FlaskConical,
  Gauge,
  Layers,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ComponentType } from "react";

type PageProps = {
  params: Promise<{ id: string }>;
};

type StoredCategoryScores = CategoryScores & {
  summaries?: CategorySummaries;
};

const CATEGORY_ICONS: Record<
  IssueCategory,
  ComponentType<{ className?: string }>
> = {
  architecture: Layers,
  security: Shield,
  performance: Gauge,
  codeQuality: Code2,
  testing: FlaskConical,
};

export default async function ProjectReportPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    include: {
      report: true,
      _count: { select: { chunks: true } },
    },
  });

  if (!project) notFound();

  const report = project.report;
  const categoryScores = (report?.categoryScores ??
    null) as StoredCategoryScores | null;
  const summaries = categoryScores?.summaries;
  const issues = sortIssues((report?.issues ?? []) as ReportIssue[]);
  const roadmap = issues.slice(0, 8);
  const previewIssues = issues.slice(0, 5);
  const overallTone = scoreTone(report?.healthScore);

  return (
    <main className="app-page">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="app-kicker">Health Report</p>
          <h1 className="app-title mt-2 text-3xl sm:text-4xl">
            {project.name}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[color:var(--app-muted)]">
            Potential findings to review — not certified security or performance
            results.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {report ? (
            <Link
              href={`/projects/${project.id}/issues`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Issues
            </Link>
          ) : null}
          <Link
            href={`/projects/${project.id}/explorer`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Explore
          </Link>
          <Link
            href={`/projects/${project.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Overview
          </Link>
          {project._count.chunks > 0 ? (
            <Link
              href={`/projects/${project.id}/chat`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Chat
            </Link>
          ) : null}
        </div>
      </header>

      {!report ? (
        <section className="app-panel p-6">
          <p className="app-kicker">Not ready</p>
          <h2 className="app-title mt-2 text-2xl">No report yet</h2>
          <p className="mt-2 text-sm text-[color:var(--app-muted)]">
            {project._count.chunks > 0
              ? "Code knowledge exists. Generate the health report to see scores and issues."
              : "Build code knowledge first, then generate a health report."}
          </p>
          <div className="mt-5">
            {project.errorMessage ? (
              <p className="mb-3 text-sm text-destructive">
                {project.errorMessage}
              </p>
            ) : null}
            {project._count.chunks > 0 ? (
              <GenerateReportButton projectId={project.id} />
            ) : (
              <RetryFullAnalysisButton projectId={project.id} />
            )}
          </div>
        </section>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Hero score */}
          <section className="report-hero relative overflow-hidden rounded-2xl border border-[color:var(--app-line)] p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(720px_280px_at_100%_0%,rgba(8,145,178,0.22),transparent_55%)]" />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="app-kicker">Project health</p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <p
                    className={cn(
                      "app-title text-6xl tabular-nums sm:text-7xl",
                      scoreTextClass(overallTone),
                    )}
                  >
                    {report.healthScore}
                  </p>
                  <span className="pb-2 text-lg text-[color:var(--app-muted)]">
                    / 100
                  </span>
                  <span
                    className={cn(
                      "mb-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                      scoreChipClass(overallTone),
                    )}
                  >
                    {scoreLabel(overallTone)}
                  </span>
                </div>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-[color:var(--app-muted)]">
                  Average of five category scores. Use the roadmap below to
                  decide what to fix first.
                </p>
                <div className="mt-5 h-2.5 max-w-md overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      scoreBarClass(overallTone),
                    )}
                    style={{
                      width: `${Math.min(100, Math.max(0, report.healthScore))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:max-w-xl">
                {(Object.keys(CATEGORY_LABELS) as IssueCategory[]).map(
                  (key) => {
                    const score = categoryScores?.[key];
                    const tone = scoreTone(score);
                    const Icon = CATEGORY_ICONS[key];
                    return (
                      <div
                        key={key}
                        className={cn(
                          "rounded-xl border p-3 backdrop-blur-sm",
                          CATEGORY_ACCENT[key].soft,
                        )}
                      >
                        <div className="flex items-center gap-1.5 text-[color:var(--app-muted)]">
                          <Icon className="size-3.5" aria-hidden />
                          <p className="text-[11px] font-medium tracking-wide uppercase">
                            {CATEGORY_LABELS[key]}
                          </p>
                        </div>
                        <p
                          className={cn(
                            "mt-2 text-2xl font-bold tabular-nums",
                            scoreTextClass(tone),
                          )}
                        >
                          {score ?? "—"}
                        </p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              CATEGORY_ACCENT[key].bar,
                            )}
                            style={{
                              width: `${Math.min(100, Math.max(0, score ?? 0))}%`,
                              opacity: score == null ? 0.25 : 1,
                            }}
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          </section>

          {/* Category summaries */}
          <section className="grid gap-4">
            {(Object.keys(CATEGORY_LABELS) as IssueCategory[]).map((key) => {
              const score = categoryScores?.[key];
              const tone = scoreTone(score);
              const Icon = CATEGORY_ICONS[key];
              return (
                <article key={key} className="app-panel overflow-hidden p-0">
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:gap-6">
                    <div
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-xl border",
                        CATEGORY_ACCENT[key].soft,
                      )}
                    >
                      <Icon className="size-5 text-foreground/80" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="app-title text-lg">
                          {CATEGORY_LABELS[key]}
                        </h2>
                        <span
                          className={cn(
                            "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
                            scoreChipClass(tone),
                          )}
                        >
                          {score ?? "—"}/100
                        </span>
                      </div>
                      <p className="mt-2 text-[15px] leading-relaxed text-foreground/80">
                        {summaries?.[key] ?? "No summary available."}
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn("h-1 w-full", CATEGORY_ACCENT[key].bar)}
                    style={{
                      opacity: 0.55,
                    }}
                  />
                </article>
              );
            })}
          </section>

          {/* Roadmap */}
          <section className="app-panel p-5 sm:p-6">
            <p className="app-kicker">Next steps</p>
            <h2 className="app-title mt-2 text-2xl">Improvement roadmap</h2>
            <p className="mt-1 text-sm text-[color:var(--app-muted)]">
              Priority-ordered recommendations. No time estimates.
            </p>
            {roadmap.length === 0 ? (
              <p className="mt-5 text-sm text-[color:var(--app-muted)]">
                No prioritized issues were generated.
              </p>
            ) : (
              <ol className="mt-5 space-y-3">
                {roadmap.map((issue, index) => (
                  <li
                    key={`${issue.title}-${index}`}
                    className="flex gap-3 rounded-xl border border-[color:var(--app-line)] bg-[color:var(--app-accent)]/[0.03] p-3.5"
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#06b6d4_0%,#0e7490_100%)] text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium tracking-tight">
                        {issue.title}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--app-muted)]">
                        {CATEGORY_LABELS[issue.category]} ·{" "}
                        {SEVERITY_LABELS[issue.severity]}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Top issues */}
          <section className="app-panel p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="app-kicker">Findings</p>
                <h2 className="app-title mt-2 text-2xl">Top issues</h2>
                <p className="mt-1 text-sm text-[color:var(--app-muted)]">
                  {issues.length} potential issue
                  {issues.length === 1 ? "" : "s"} across all categories.
                </p>
              </div>
              <Link
                href={`/projects/${project.id}/issues`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                )}
              >
                View all
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {previewIssues.length === 0 ? (
                <p className="text-sm text-[color:var(--app-muted)]">
                  No issues were flagged.
                </p>
              ) : (
                previewIssues.map((issue, index) => (
                  <div
                    key={`${issue.title}-${index}`}
                    className={cn(
                      "rounded-xl border border-l-4 p-4 text-sm",
                      issue.severity === "critical" || issue.severity === "high"
                        ? "border-l-rose-500 border-[color:var(--app-line)] bg-rose-500/[0.04]"
                        : issue.severity === "medium"
                          ? "border-l-amber-500 border-[color:var(--app-line)] bg-amber-500/[0.04]"
                          : "border-l-sky-500 border-[color:var(--app-line)] bg-sky-500/[0.04]",
                    )}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <AlertTriangle
                        className={cn(
                          "size-3.5",
                          issue.severity === "critical" ||
                            issue.severity === "high"
                            ? "text-rose-500"
                            : issue.severity === "medium"
                              ? "text-amber-500"
                              : "text-sky-500",
                        )}
                        aria-hidden
                      />
                      <p className="font-medium tracking-tight">
                        {issue.title}
                      </p>
                      <Badge variant={severityVariant(issue.severity)}>
                        {SEVERITY_LABELS[issue.severity]}
                      </Badge>
                      <Badge variant="outline">
                        {CATEGORY_LABELS[issue.category]}
                      </Badge>
                    </div>
                    <p className="leading-relaxed text-foreground/75">
                      {issue.description}
                    </p>
                    {issue.filePath ? (
                      <p className="mt-2 font-mono text-xs text-[color:var(--app-muted)]">
                        {issue.filePath}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="app-panel flex flex-wrap items-center gap-3 p-4">
            <GenerateReportButton projectId={project.id} />
            <RetryFullAnalysisButton projectId={project.id} />
          </div>
        </div>
      )}
    </main>
  );
}