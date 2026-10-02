import { chunkProjectFiles } from "@/lib/analysis/chunking";
import { setProjectProgress } from "@/lib/analysis/progress";
import { loadProjectSourceFiles } from "@/lib/analysis/project-files";
import { generateProjectReport } from "@/lib/analysis/report";
import { storeProjectChunks } from "@/lib/analysis/vector-store";

export async function buildProjectKnowledge(projectId: string): Promise<{
  chunkCount: number;
  fileCount: number;
}> {
  await setProjectProgress(projectId, {
    step: "Creating code knowledge",
    percent: 40,
    status: "processing",
    errorMessage: null,
  });

  try {
    const files = await loadProjectSourceFiles(projectId);
    if (files.length === 0) {
      throw new Error(
        "No JavaScript/TypeScript source files found to analyze.",
      );
    }

    await setProjectProgress(projectId, {
      step: "Chunking source files",
      percent: 50,
      fileCount: files.length,
    });

    const drafts = chunkProjectFiles(files);

    await setProjectProgress(projectId, {
      step: "Generating embeddings",
      percent: 65,
    });

    const chunkCount = await storeProjectChunks(projectId, drafts);

    await setProjectProgress(projectId, {
      step: "Code knowledge ready",
      percent: 75,
      fileCount: files.length,
    });

    return { chunkCount, fileCount: files.length };
  } catch (error) {
    await setProjectProgress(projectId, {
      step: "Knowledge build failed",
      percent: 65,
      status: "failed",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Failed to build code knowledge base.",
    });
    throw error;
  }
}

/**
 * Full analysis path used after import:
 * knowledge base first, then health report.
 */
export async function runFullProjectAnalysis(projectId: string): Promise<void> {
  await setProjectProgress(projectId, {
    step: "Starting analysis",
    percent: 30,
    status: "processing",
    errorMessage: null,
  });

  await buildProjectKnowledge(projectId);

  await setProjectProgress(projectId, {
    step: "Running analysis",
    percent: 80,
    status: "processing",
  });

  await setProjectProgress(projectId, {
    step: "Generating report",
    percent: 90,
  });

  await generateProjectReport(projectId);

  await setProjectProgress(projectId, {
    step: "Complete",
    percent: 100,
    status: "completed",
    errorMessage: null,
  });
}