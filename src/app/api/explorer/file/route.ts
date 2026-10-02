import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readProjectFile } from "@/lib/files/explorer";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projectId = request.nextUrl.searchParams.get("projectId");
  const filePath = request.nextUrl.searchParams.get("file");

  if (!projectId || !filePath) {
    return Response.json(
      { error: "projectId and file are required" },
      { status: 400 },
    );
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: session.user.id },
    select: { id: true },
  });

  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const file = await readProjectFile(projectId, filePath);
  if (!file) {
    return Response.json({ error: "File not found" }, { status: 404 });
  }

  return Response.json(file);
}