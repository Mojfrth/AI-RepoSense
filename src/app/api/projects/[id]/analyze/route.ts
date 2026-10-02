import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const project = await prisma.project.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  if (project.status === "completed") {
    return Response.json({
      ok: true,
      alreadyCompleted: true,
      status: project.status,
    });
  }

  // Avoid starting a second run if one is clearly in-flight.
  if (
    project.status === "processing" &&
    project.progressPercent >= 30 &&
    Date.now() - project.updatedAt.getTime() < 2 * 60 * 1000
  ) {
    return Response.json({
      ok: true,
      alreadyRunning: true,
      status: project.status,
      progressStep: project.progressStep,
      progressPercent: project.progressPercent,
    });
  }

  if (project.status === "failed" && project.fileCount === 0) {
    return Response.json(
      {
        error:
          "Import failed before files were ready. Please create a new project.",
      },
      { status: 400 },
    );
  }

  try {
    const { runFullProjectAnalysis } = await import(
      "@/lib/analysis/pipline"
    );
    await runFullProjectAnalysis(project.id);
    const updated = await prisma.project.findUnique({
      where: { id: project.id },
    });
    return Response.json({
      ok: true,
      status: updated?.status ?? "completed",
      progressStep: updated?.progressStep,
      progressPercent: updated?.progressPercent,
    });
  } catch (error) {
    console.error("Project analysis failed", { projectId: project.id, error });
    const updated = await prisma.project.findUnique({
      where: { id: project.id },
    });
    return Response.json(
      {
        ok: false,
        status: updated?.status ?? "failed",
        progressStep: updated?.progressStep,
        progressPercent: updated?.progressPercent,
        error: error instanceof Error ? error.message : "Analysis failed.",
      },
      { status: 500 },
    );
  }
}