import {
  GenerateReportButton,
  RetryFullAnalysisButton,
} from "@/components/projects/report-actions";
import { RetryKnowledgeButton } from "@/components/projects/retry-knowledge-button";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

function statusClass(status: string) {
  if (status === "completed") return "app-status-completed";
  if (status === "failed") return "app-status-failed";
  return "app-status-processing";
}

export default async function ProjectOverviewPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    include: {
      report: {
        select: { healthScore: true },
      },
      _count: { select: { chunks: true } },
    },
  });

  if (!project) notFound();

  const chatReady = project._count.chunks > 0;
  const reportReady = Boolean(project.report);

  const navLinks = [
    reportReady
      ? {
          href: `/projects/${project.id}/report`,
          label: "Health Report",
          primary: true,
        }
      : null,
    reportReady
      ? { href: `/projects/${project.id}/issues`, label: "Issues" }
      : null,
    chatReady
      ? { href: `/projects/${project.id}/chat`, label: "AI Chat" }
      : null,
    { href: `/projects/${project.id}/explorer`, label: "Explorer" },
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
    primary?: boolean;
  }>;

  return (
    <main className="app-page app-page-narrow">
      <header className="mb-8">
        <p className="app-kicker">Project</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="app-title text-3xl">{project.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={cn("app-status", statusClass(project.status))}>
                {project.status}
              </span>
              {project.status === "processing" ||
              project.status === "queued" ? (
                <Link
                  href={`/projects/${project.id}/progress`}
                  className="text-xs font-medium text-[color:var(--app-accent-deep)] underline-offset-4 hover:underline"
                >
                  View progress
                </Link>
              ) : null}
            </div>
          </div>
        </div>
        <nav className="mt-5 flex flex-wrap gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                buttonVariants({
                  variant: link.primary ? "default" : "outline",
                  size: "sm",
                }),
                link.primary &&
                  "bg-[linear-gradient(135deg,#06b6d4_0%,#0e7490_100%)] text-white hover:opacity-90",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <section className="app-panel space-y-4 p-6 text-sm">
        <h2 className="app-title text-lg">Overview</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[color:var(--app-muted)]">Source</dt>
            <dd className="mt-0.5 font-medium capitalize">{project.source}</dd>
          </div>
          <div>
            <dt className="text-[color:var(--app-muted)]">Framework</dt>
            <dd className="mt-0.5 font-medium">{project.framework ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[color:var(--app-muted)]">Source files</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {project.fileCount}
            </dd>
          </div>
          <div>
            <dt className="text-[color:var(--app-muted)]">Code chunks</dt>
            <dd className="mt-0.5 font-medium tabular-nums">
              {project._count.chunks}
            </dd>
          </div>
          <div>
            <dt className="text-[color:var(--app-muted)]">Health score</dt>
            <dd className="mt-0.5 font-semibold tabular-nums text-[color:var(--app-accent-deep)]">
              {project.report ? `${project.report.healthScore}/100` : "—"}
            </dd>
          </div>
          {project.repositoryUrl ? (
            <div className="sm:col-span-2">
              <dt className="text-[color:var(--app-muted)]">Repository</dt>
              <dd className="mt-0.5">
                <a
                  href={project.repositoryUrl}
                  className="font-medium text-[color:var(--app-accent-deep)] underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {project.repositoryUrl}
                </a>
              </dd>
            </div>
          ) : null}
        </dl>

        {project.errorMessage ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">
            {project.errorMessage}
          </p>
        ) : null}

        {reportReady ? (
          <div className="space-y-3 border-t border-[color:var(--app-line)] pt-4">
            <p className="text-[color:var(--app-muted)]">
              Health report is ready. Open it for category scores, issues, and
              the improvement roadmap.
            </p>
            <RetryFullAnalysisButton projectId={project.id} />
          </div>
        ) : chatReady ? (
          <div className="space-y-3 border-t border-[color:var(--app-line)] pt-4">
            <p className="text-[color:var(--app-muted)]">
              Code knowledge is ready. Generate the health report next.
            </p>
            <GenerateReportButton projectId={project.id} />
            <RetryFullAnalysisButton projectId={project.id} />
          </div>
        ) : null}

        {project.status === "failed" ? (
          <div className="space-y-3 border-t border-[color:var(--app-line)] pt-4">
            <RetryFullAnalysisButton projectId={project.id} />
            <RetryKnowledgeButton projectId={project.id} />
            <Link
              href="/projects/new"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "inline-flex",
              )}
            >
              Try another project
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}