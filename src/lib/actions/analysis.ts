"use server";

import { buildProjectKnowledge } from "@/lib/analysis/pipline";
import { setProjectProgress } from "@/lib/analysis/progress";
import { generateProjectReport } from "@/lib/analysis/report";
import { auth } from "@/lib/auth";
import {
  assertCanRunAnalysis,
  BillingLimitError,
  recordAnalysisUsage,
} from "@/lib/billing/entitlements";
import { prisma } from "@/lib/db";
import { extractFromZipBuffer } from "@/lib/files/extract";
import { isSourceFile } from "@/lib/files/filters";
import { detectFramework } from "@/lib/files/framework";
import { deleteProjectFiles, persistProjectFiles } from "@/lib/files/storage";
import { downloadGitHubZipball } from "@/lib/github";
import { MAX_REPO_SIZE_BYTES } from "@/lib/limits";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";

export type RetryState = {
  error?: string;
};

async function requireOwnedProject(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
  });

  if (!project) return null;
  return project;
}

function githubFullName(project: {
  name: string;
  repositoryUrl: string | null;
}): string | null {
  if (project.name.includes("/")) return project.name;
  const match = project.repositoryUrl?.match(/github\.com\/([^/]+\/[^/#?]+)/i);
  return match?.[1]?.replace(/\.git$/i, "") ?? null;
}

async function refreshProjectSources(project: {
  id: string;
  userId: string;
  name: string;
  source: "github" | "upload";
  repositoryUrl: string | null;
}): Promise<void> {
  if (project.source !== "github") return;

  const fullName = githubFullName(project);
  if (!fullName) {
    throw new Error(
      "Could not determine the GitHub repository for this project.",
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: project.userId },
    select: { githubAccessToken: true },
  });

  if (!user?.githubAccessToken) {
    throw new Error(
      "Connect GitHub in Settings before re-analyzing this repository.",
    );
  }

  await setProjectProgress(project.id, {
    step: "Fetching latest code from GitHub",
    percent: 10,
    status: "processing",
    errorMessage: null,
  });

  const zipBuffer = await downloadGitHubZipball(
    user.githubAccessToken,
    fullName,
  );

  if (zipBuffer.byteLength > MAX_REPO_SIZE_BYTES) {
    throw new Error(
      `Repository archive exceeds the ${MAX_REPO_SIZE_BYTES / (1024 * 1024)} MB limit.`,
    );
  }

  await setProjectProgress(project.id, {
    step: "Reading updated files",
    percent: 18,
    status: "processing",
  });

  const extracted = await extractFromZipBuffer(zipBuffer, { stripRoot: true });
  if (!extracted.ok) {
    throw new Error(extracted.error);
  }

  const framework = detectFramework(
    extracted.sourceFiles,
    extracted.allRelativePaths,
  );
  const sourceOnly = extracted.sourceFiles.filter((file) =>
    isSourceFile(file.relativePath),
  );

  await deleteProjectFiles(project.id);
  await persistProjectFiles(project.id, extracted.sourceFiles);

  await setProjectProgress(project.id, {
    step: "Files ready for analysis",
    percent: 25,
    status: "queued",
    framework,
    fileCount: sourceOnly.length,
    errorMessage:
      extracted.skippedLargeFiles.length > 0
        ? `Skipped ${extracted.skippedLargeFiles.length} file(s) over the size limit.`
        : null,
  });
}

export async function retryProjectKnowledge(
  _prev: RetryState,
  formData: FormData,
): Promise<RetryState> {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return { error: "Missing project id." };

  const project = await requireOwnedProject(projectId);
  if (!project) return { error: "Project not found." };

  try {
    await buildProjectKnowledge(project.id);
    revalidatePath(`/projects/${project.id}`);
    revalidatePath("/dashboard");
    redirect(`/projects/${project.id}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to rebuild code knowledge.",
    };
  }
}

export async function retryFullAnalysis(
  _prev: RetryState,
  formData: FormData,
): Promise<RetryState> {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return { error: "Missing project id." };

  const project = await requireOwnedProject(projectId);
  if (!project) return { error: "Project not found." };

  if (project.status === "processing" || project.status === "queued") {
    return { error: "Analysis is already running for this project." };
  }

  try {
    await assertCanRunAnalysis(project.userId);
    // Pull fresh GitHub code when possible; ZIP projects reuse local files.
    await refreshProjectSources(project);

    await recordAnalysisUsage(project.userId);

    await prisma.project.update({
      where: { id: project.id },
      data: {
        status: "queued",
        progressStep:
          project.source === "github"
            ? "Latest code fetched — waiting to analyze"
            : "Waiting to restart analysis",
        progressPercent: Math.max(project.progressPercent || 0, 25),
        errorMessage: null,
      },
    });
    revalidatePath(`/projects/${project.id}`);
    revalidatePath(`/projects/${project.id}/progress`);
    revalidatePath("/dashboard");
    redirect(`/projects/${project.id}/progress`);
  } catch (error) {
    if (isRedirectError(error)) throw error;

    if (error instanceof BillingLimitError) {
      return { error: error.message };
    }

    await setProjectProgress(project.id, {
      step: "Re-analyze failed",
      percent: project.progressPercent || 0,
      status: "failed",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Failed to restart project analysis.",
    });
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to restart project analysis.",
    };
  }
}

export async function generateReportAction(
  _prev: RetryState,
  formData: FormData,
): Promise<RetryState> {
  const projectId = String(formData.get("projectId") ?? "");
  if (!projectId) return { error: "Missing project id." };

  const project = await requireOwnedProject(projectId);
  if (!project) return { error: "Project not found." };

  try {
    await generateProjectReport(project.id);
    revalidatePath(`/projects/${project.id}`);
    revalidatePath(`/projects/${project.id}/report`);
    revalidatePath("/dashboard");
    redirect(`/projects/${project.id}/report`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to generate health report.",
    };
  }
}