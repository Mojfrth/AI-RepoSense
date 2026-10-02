import { AnalysisProgress } from "@/components/projects/analysis-progress";
import { buttonVariants } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectProgressPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      name: true,
      status: true,
      progressStep: true,
      progressPercent: true,
      errorMessage: true,
      framework: true,
      fileCount: true,
      report: { select: { healthScore: true } },
    },
  });

  if (!project) notFound();

  return (
    <main className="app-page app-page-narrow">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="app-kicker">Analysis</p>
          <h1 className="app-title mt-2 text-3xl">{project.name}</h1>
          <p className="mt-2 text-sm text-[color:var(--app-muted)]">
            Sit tight — we are reading, chunking, and reviewing your code.
          </p>
        </div>
        <Link
          href={`/projects/${project.id}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Overview
        </Link>
      </header>

      <AnalysisProgress
        projectId={project.id}
        initial={{
          id: project.id,
          name: project.name,
          status: project.status,
          progressStep: project.progressStep,
          progressPercent: project.progressPercent,
          errorMessage: project.errorMessage,
          framework: project.framework,
          fileCount: project.fileCount,
          report: project.report,
        }}
      />
    </main>
  );
}