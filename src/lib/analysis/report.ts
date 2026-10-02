import { computeDeterministicMetrics } from "@/lib/analysis/metrics";
import { loadProjectSourceFiles } from "@/lib/analysis/project-files";
import { runLlmHealthReview } from "@/lib/analysis/report-llm";
import {
  SEVERITY_ORDER,
  SEVERITY_PENALTY,
  type CategoryScores,
  type CategorySummaries,
  type ReportIssue,
} from "@/lib/analysis/report-types";
import { prisma } from "@/lib/db";

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreFromIssues(
  base: number,
  issues: ReportIssue[],
  category: ReportIssue["category"],
): number {
  const penalty = issues
    .filter((issue) => issue.category === category)
    .reduce((sum, issue) => sum + SEVERITY_PENALTY[issue.severity], 0);
  return clampScore(base - penalty);
}

function sortIssues(issues: ReportIssue[]): ReportIssue[] {
  return [...issues].sort((a, b) => {
    const severityDiff =
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return a.category.localeCompare(b.category);
  });
}

export type GeneratedReport = {
  healthScore: number;
  categoryScores: CategoryScores;
  categorySummaries: CategorySummaries;
  issues: ReportIssue[];
  roadmap: ReportIssue[];
};

/** Generate and persist the project health report. */
export async function generateProjectReport(
  projectId: string,
): Promise<GeneratedReport> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "processing", errorMessage: null },
  });

  try {
    const files = await loadProjectSourceFiles(projectId);
    const metrics = computeDeterministicMetrics(files);

    const chunks = await prisma.codeChunk.findMany({
      where: { projectId },
      orderBy: [{ filePath: "asc" }, { startLine: "asc" }],
      take: 80,
      select: {
        filePath: true,
        content: true,
        startLine: true,
        endLine: true,
      },
    });

    if (chunks.length === 0) {
      throw new Error(
        "No code chunks available. Build project knowledge before generating a report.",
      );
    }

    const llm = await runLlmHealthReview({
      projectName: project.name,
      framework: project.framework,
      chunks,
    });

    const issues = sortIssues([...metrics.issues, ...llm.issues]);

    const categoryScores: CategoryScores = {
      architecture: scoreFromIssues(88, issues, "architecture"),
      security: scoreFromIssues(
        metrics.secretHits.length > 0 ? 70 : 90,
        issues,
        "security",
      ),
      performance: scoreFromIssues(86, issues, "performance"),
      codeQuality: scoreFromIssues(
        metrics.largeFiles.length + metrics.complexFunctions.length > 8
          ? 72
          : 85,
        issues,
        "codeQuality",
      ),
      testing: scoreFromIssues(
        Math.max(40, metrics.testedSourceApproxPercent),
        issues,
        "testing",
      ),
    };

    const healthScore = clampScore(
      (categoryScores.architecture +
        categoryScores.security +
        categoryScores.performance +
        categoryScores.codeQuality +
        categoryScores.testing) /
        5,
    );

    const categorySummaries: CategorySummaries = {
      architecture: llm.architectureSummary,
      security: `${metrics.summaries.security} ${llm.securitySummary}`.trim(),
      performance: llm.performanceSummary,
      codeQuality: metrics.summaries.codeQuality,
      testing: metrics.summaries.testing,
    };

    const roadmap = issues.slice(0, 10);

    await prisma.report.upsert({
      where: { projectId },
      create: {
        projectId,
        healthScore,
        categoryScores: {
          ...categoryScores,
          summaries: categorySummaries,
        },
        issues,
      },
      update: {
        healthScore,
        categoryScores: {
          ...categoryScores,
          summaries: categorySummaries,
        },
        issues,
      },
    });

    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "completed",
        errorMessage: null,
      },
    });

    return {
      healthScore,
      categoryScores,
      categorySummaries,
      issues,
      roadmap,
    };
  } catch (error) {
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "failed",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Failed to generate health report.",
      },
    });
    throw error;
  }
}