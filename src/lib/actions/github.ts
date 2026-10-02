"use server";

import { setProjectProgress } from "@/lib/analysis/progress";
import { auth, signIn } from "@/lib/auth";
import {
  assertCanCreateProject,
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

export type ProjectActionState = {
  error?: string;
};

async function requireUser() {
  const session = await auth();
  const user = session?.user;

  if (!user || !user.id) {
    redirect("/login");
  }

  return user as typeof user & { id: string };
}

/** Link GitHub via Auth.js (same callback URL as login). */
export async function connectGitHubAccount() {
  await requireUser();
  await signIn("github", { redirectTo: "/settings?github=connected" });
}

async function assertDailyLimit(userId: string) {
  await assertCanCreateProject(userId);
}

/**
 * Ingest files only, then hand off to the progress page for live analysis.
 */
async function finalizeProjectFromZip(options: {
  userId: string;
  name: string;
  source: "github" | "upload";
  repositoryUrl?: string;
  zipBuffer: Buffer;
}) {
  await assertDailyLimit(options.userId);

  const project = await prisma.project.create({
    data: {
      userId: options.userId,
      name: options.name,
      source: options.source,
      repositoryUrl: options.repositoryUrl,
      status: "processing",
      progressStep: "Reading files",
      progressPercent: 10,
    },
  });

  await recordAnalysisUsage(options.userId);

  try {
    await setProjectProgress(project.id, {
      step: "Reading files",
      percent: 15,
      status: "processing",
    });

    const extracted = await extractFromZipBuffer(options.zipBuffer, {
      stripRoot: options.source === "github",
    });

    if (!extracted.ok) {
      await setProjectProgress(project.id, {
        step: "Import failed",
        percent: 15,
        status: "failed",
        errorMessage: extracted.error,
      });
      return { projectId: project.id, failed: true as const };
    }

    await setProjectProgress(project.id, {
      step: "Detecting framework",
      percent: 22,
      status: "processing",
    });

    const framework = detectFramework(
      extracted.sourceFiles,
      extracted.allRelativePaths,
    );
    const sourceOnly = extracted.sourceFiles.filter((file) =>
      isSourceFile(file.relativePath),
    );

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

    return { projectId: project.id, failed: false as const };
  } catch (error) {
    await deleteProjectFiles(project.id);
    await setProjectProgress(project.id, {
      step: "Import failed",
      percent: 10,
      status: "failed",
      errorMessage:
        error instanceof Error ? error.message : "Project ingestion failed.",
    });
    return { projectId: project.id, failed: true as const };
  }
}

export async function disconnectGitHub() {
  const user = await requireUser();

  await prisma.user.update({
    where: { id: user.id },
    data: {
      githubAccessToken: null,
      githubUsername: null,
    },
  });

  await prisma.account.deleteMany({
    where: {
      userId: user.id,
      provider: "github",
    },
  });

  revalidatePath("/settings");
  revalidatePath("/projects/new");
}

export async function createProjectFromGitHub(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const user = await requireUser();
  const fullName = String(formData.get("fullName") ?? "");
  const defaultBranch = String(formData.get("defaultBranch") ?? "");

  if (!fullName.includes("/")) {
    return { error: "Invalid repository selection." };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { githubAccessToken: true },
  });

  if (!dbUser?.githubAccessToken) {
    return {
      error: "Connect GitHub in Settings before selecting a repository.",
    };
  }

  try {
    const zipBuffer = await downloadGitHubZipball(
      dbUser.githubAccessToken,
      fullName,
      defaultBranch || undefined,
    );

    if (zipBuffer.byteLength > MAX_REPO_SIZE_BYTES) {
      return {
        error: `Repository archive exceeds the ${MAX_REPO_SIZE_BYTES / (1024 * 1024)} MB limit.`,
      };
    }

    const result = await finalizeProjectFromZip({
      userId: user.id,
      name: fullName,
      source: "github",
      repositoryUrl: `https://github.com/${fullName}`,
      zipBuffer,
    });

    revalidatePath("/dashboard");
    redirect(`/projects/${result.projectId}/progress`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return {
      error:
        error instanceof Error ? error.message : "Failed to import repository.",
    };
  }
}

export async function createProjectFromZip(
  _prev: ProjectActionState,
  formData: FormData,
): Promise<ProjectActionState> {
  const user = await requireUser();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { error: "Please choose a ZIP file to upload." };
  }

  if (!file.name.toLowerCase().endsWith(".zip")) {
    return { error: "Only .zip uploads are supported." };
  }

  if (file.size > MAX_REPO_SIZE_BYTES) {
    return {
      error: `ZIP exceeds the ${MAX_REPO_SIZE_BYTES / (1024 * 1024)} MB limit.`,
    };
  }

  if (file.size === 0) {
    return { error: "The uploaded ZIP is empty." };
  }

  try {
    const zipBuffer = Buffer.from(await file.arrayBuffer());
    const name = file.name.replace(/\.zip$/i, "") || "Uploaded project";

    const result = await finalizeProjectFromZip({
      userId: user.id,
      name,
      source: "upload",
      zipBuffer,
    });

    revalidatePath("/dashboard");
    redirect(`/projects/${result.projectId}/progress`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return {
      error:
        error instanceof Error ? error.message : "Failed to upload project.",
    };
  }
}