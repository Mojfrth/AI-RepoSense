import type { ExtractedFile } from "@/lib/files/filters";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";

const DATA_ROOT = path.join(process.cwd(), ".data", "projects");

export type ProjectManifestEntry = {
  relativePath: string;
  sizeBytes: number;
};

export function getProjectDataDir(projectId: string): string {
  return path.join(DATA_ROOT, projectId);
}

export async function persistProjectFiles(
  projectId: string,
  files: ExtractedFile[],
): Promise<void> {
  const root = getProjectDataDir(projectId);
  await mkdir(root, { recursive: true });

  const manifest: ProjectManifestEntry[] = files.map((file) => ({
    relativePath: file.relativePath,
    sizeBytes: file.sizeBytes,
  }));

  await writeFile(
    path.join(root, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8",
  );

  for (const file of files) {
    const target = path.join(root, "files", file.relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, file.content, "utf8");
  }
}

export async function readProjectManifest(
  projectId: string,
): Promise<ProjectManifestEntry[]> {
  const raw = await readFile(
    path.join(getProjectDataDir(projectId), "manifest.json"),
    "utf8",
  );
  return JSON.parse(raw) as ProjectManifestEntry[];
}

export async function deleteProjectFiles(projectId: string): Promise<void> {
  await rm(getProjectDataDir(projectId), { recursive: true, force: true });
}