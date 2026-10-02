import { getLanguageModel } from "@/lib/ai/llm";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readProjectFile } from "@/lib/files/explorer";
import { assertChatRateLimit, RateLimitError } from "@/lib/rate-limit";
import { generateText } from "ai";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  projectId?: string;
  filePath?: string;
  question?: string;
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Body;
    const projectId = body.projectId?.trim();
    const filePath = body.filePath?.trim();
    const question = body.question?.trim();

    if (!projectId || !filePath || !question) {
      return Response.json(
        { error: "projectId, filePath, and question are required." },
        { status: 400 },
      );
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    });
    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    await assertChatRateLimit(session.user.id);

    const file = await readProjectFile(projectId, filePath);
    if (!file) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    const truncated =
      file.content.length > 12000
        ? `${file.content.slice(0, 12000)}\n\n/* truncated for analysis */`
        : file.content;

    const { text } = await generateText({
      model: getLanguageModel(),
      prompt: [
        "You are an AI senior engineer helping a developer understand a single source file.",
        "Be concrete and concise. Cite symbols/functions from the file when useful.",
        "If something is unclear from this file alone, say so.",
        "",
        `Project: ${project.name}`,
        `File: ${file.relativePath}`,
        `Question: ${question}`,
        "",
        "File contents:",
        "```",
        truncated,
        "```",
      ].join("\n"),
    });

    return Response.json({
      answer: text,
      filePath: file.relativePath,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return Response.json({ error: error.message }, { status: 429 });
    }
    console.error("Explorer explain API error:", error);
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to explain the selected file.",
      },
      { status: 500 },
    );
  }
}