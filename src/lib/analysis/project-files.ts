import { isSourceFile } from "@/lib/files/filters";
import {
  readProjectFileContent,
  readProjectManifest,
  type ProjectManifestEntry,
} from "@/lib/files/storage";

export type ProjectSourceFile = {
  relativePath: string;
  content: string;
};

/** Load extracted JS/TS source files from the configured project storage. */
export async function loadProjectSourceFiles(
  projectId: string,
): Promise<ProjectSourceFile[]> {
  const manifest: ProjectManifestEntry[] = await readProjectManifest(projectId);

  const files: ProjectSourceFile[] = [];

  for (const entry of manifest) {
    if (!isSourceFile(entry.relativePath)) continue;
    const content = await readProjectFileContent(projectId, entry.relativePath);
    files.push({ relativePath: entry.relativePath, content });
  }

  return files;
}