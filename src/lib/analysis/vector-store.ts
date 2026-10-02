import type { CodeChunkDraft } from "@/lib/analysis/chunking";
import { embedTexts, toVectorLiteral } from "@/lib/analysis/embeddings";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { randomUUID } from "crypto";

export type StoredChunk = {
  id: string;
  filePath: string;
  content: string;
  startLine: number | null;
  endLine: number | null;
  score?: number;
};

/** Replace all code chunks for a project and store embeddings in pgvector. */
export async function storeProjectChunks(
  projectId: string,
  drafts: CodeChunkDraft[],
): Promise<number> {
  await prisma.codeChunk.deleteMany({ where: { projectId } });

  if (drafts.length === 0) {
    throw new Error("No code chunks were produced from the source files.");
  }

  const records = drafts.map((draft) => ({
    id: randomUUID(),
    projectId,
    filePath: draft.filePath,
    content: draft.content,
    startLine: draft.startLine,
    endLine: draft.endLine,
  }));

  const embeddings = await embedTexts(records.map((record) => record.content));

  const INSERT_BATCH = 100;
  for (let i = 0; i < records.length; i += INSERT_BATCH) {
    const batch = records.slice(i, i + INSERT_BATCH);
    const rows = batch.map((record, offset) => {
      const vector = toVectorLiteral(embeddings[i + offset]!);
      return Prisma.sql`(
        ${record.id},
        ${record.projectId},
        ${record.filePath},
        ${record.content},
        ${record.startLine},
        ${record.endLine},
        ${vector}::vector
      )`;
    });

    await prisma.$executeRaw`
      INSERT INTO "CodeChunk" (id, "projectId", "filePath", content, "startLine", "endLine", embedding)
      VALUES ${Prisma.join(rows)}
    `;
  }

  return records.length;
}

/** Top-k similarity search over a project's code chunks. */
export async function searchProjectChunks(
  projectId: string,
  queryEmbedding: number[],
  limit = 8,
): Promise<StoredChunk[]> {
  const vector = toVectorLiteral(queryEmbedding);

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      filePath: string;
      content: string;
      startLine: number | null;
      endLine: number | null;
      score: number;
    }>
  >(
    `
    SELECT
      id,
      "filePath",
      content,
      "startLine",
      "endLine",
      (1 - (embedding <=> $1::vector))::float8 AS score
    FROM "CodeChunk"
    WHERE "projectId" = $2
      AND embedding IS NOT NULL
    ORDER BY embedding <=> $1::vector
    LIMIT $3
    `,
    vector,
    projectId,
    limit,
  );

  return rows;
}