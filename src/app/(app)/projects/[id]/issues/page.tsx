import { IssuesDashboard } from "@/components/projects/issues-dashboard";
import {
  GenerateReportButton,
  RetryFullAnalysisButton,
} from "@/components/projects/report-actions";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ReportIssue } from "@/lib/analysis/report-types";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectIssuesPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
    include: {
      report: {
        select: {
          issues: true,
          healthScore: true,
        },
      },
      _count: { select: { chunks: true } },
    },
  });

  if (!project) notFound();

  const issues = (project.report?.issues ?? []) as ReportIssue[];

  return (
    <main className="app-page">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="app-kicker">Issues</p>
          <h1 className="app-title mt-2 text-3xl">{project.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/projects/${project.id}/report`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Health Report
          </Link>
          <Link
            href={`/projects/${project.id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Overview
          </Link>
        </div>
      </div>

      {!project.report ? (
        <Card>
          <CardHeader>
            <CardTitle>No issues yet</CardTitle>
            <CardDescription>
              Generate a health report first to populate the issues dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {project._count.chunks > 0 ? (
              <GenerateReportButton projectId={project.id} />
            ) : (
              <RetryFullAnalysisButton projectId={project.id} />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Issues Dashboard</CardTitle>
            <CardDescription>
              Filter by severity and category. Health score:{" "}
              {project.report.healthScore}/100
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IssuesDashboard projectId={project.id} issues={issues} />
          </CardContent>
        </Card>
      )}
    </main>
  );
}