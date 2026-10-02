import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import Link from "next/link";

function statusClass(status: string) {
  if (status === "completed") return "app-status-completed";
  if (status === "failed") return "app-status-failed";
  return "app-status-processing";
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      report: {
        select: { healthScore: true },
      },
      _count: {
        select: { chunks: true },
      },
    },
  });

  return (
    <main className="app-page">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="app-kicker">Workspace</p>
          <h1 className="app-title mt-2 text-3xl sm:text-4xl">
            Hello, {session.user.name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="mt-2 max-w-lg text-sm text-[color:var(--app-muted)]">
            Your analyzed repositories and health scores live here.
          </p>
        </div>
        <Link
          href="/projects/new"
          className={cn(
            buttonVariants({ size: "lg" }),
            "bg-[linear-gradient(135deg,#06b6d4_0%,#0e7490_100%)] text-white shadow-[0_14px_32px_rgba(8,145,178,0.25)] hover:opacity-90",
          )}
        >
          + Analyze repository
        </Link>
      </header>

      {projects.length === 0 ? (
        <section className="app-panel border-dashed px-8 py-14 text-center">
          <p className="app-kicker">Get started</p>
          <h2 className="app-title mt-3 text-2xl">No projects yet</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-[color:var(--app-muted)]">
            Connect a GitHub repository or upload a ZIP to run your first
            codebase health check.
          </p>
          <Link
            href="/projects/new"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-6 bg-[linear-gradient(135deg,#06b6d4_0%,#0e7490_100%)] text-white hover:opacity-90",
            )}
          >
            Analyze new repository
          </Link>
        </section>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-medium text-[color:var(--app-muted)]">
              {projects.length} project{projects.length === 1 ? "" : "s"}
            </h2>
          </div>
          <ul className="app-panel overflow-hidden divide-y divide-[color:var(--app-line)]">
            {projects.map((project) => {
              const inFlight =
                project.status === "processing" || project.status === "queued";
              const href = inFlight
                ? `/projects/${project.id}/progress`
                : `/projects/${project.id}`;

              return (
                <li
                  key={project.id}
                  className="flex items-center gap-3 px-5 py-4"
                >
                  <Link
                    href={href}
                    className="min-w-0 flex-1 transition-opacity hover:opacity-80"
                  >
                    <p className="truncate font-medium tracking-tight">
                      {project.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[color:var(--app-muted)]">
                      {project.framework ?? "Unknown framework"} ·{" "}
                      {project.fileCount} source files
                      {project._count.chunks
                        ? ` · ${project._count.chunks} chunks`
                        : ""}
                      {project.source === "github" ? " · GitHub" : " · ZIP"}
                    </p>
                  </Link>

                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    {project.report ? (
                      <span className="hidden text-sm tabular-nums text-[color:var(--app-muted)] md:inline">
                        Health{" "}
                        <span className="font-semibold text-[color:var(--app-accent-deep)]">
                          {project.report.healthScore}
                        </span>
                      </span>
                    ) : null}
                    <span
                      className={cn("app-status", statusClass(project.status))}
                    >
                      {project.status}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}