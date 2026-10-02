import { getProjectDataDir, readProjectManifest } from "@/lib/files/storage";
import { readFile } from "fs/promises";
import path from "path";

export type FileTreeNode = {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: FileTreeNode[];
};

export type ProjectFileContent = {
  relativePath: string;
  content: string;
  sizeBytes: number;
};

/** Build a nested file tree from flat relative paths. */
export function buildFileTree(paths: string[]): FileTreeNode[] {
  const root: FileTreeNode[] = [];

  for (const relativePath of [...paths].sort()) {
    const parts = relativePath.split("/").filter(Boolean);
    let current = root;

    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      const nodePath = parts.slice(0, index + 1).join("/");
      let existing = current.find((node) => node.name === part);

      if (!existing) {
        existing = {
          name: part,
          path: nodePath,
          type: isFile ? "file" : "dir",
          children: isFile ? undefined : [],
        };
        current.push(existing);
      }

      if (!isFile) {
        existing.children ??= [];
        current = existing.children;
      }
    });
  }

  function sortNodes(nodes: FileTreeNode[]) {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) sortNodes(node.children);
    }
  }

  sortNodes(root);
  return root;
}

export async function listProjectFilePaths(
  projectId: string,
): Promise<string[]> {
  const manifest = await readProjectManifest(projectId);
  return manifest.map((entry) => entry.relativePath).sort();
}

export async function readProjectFile(
  projectId: string,
  relativePath: string,
): Promise<ProjectFileContent | null> {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || path.isAbsolute(normalized)) {
    return null;
  }

  const manifest = await readProjectManifest(projectId);
  const entry = manifest.find((item) => item.relativePath === normalized);
  if (!entry) return null;

  const absolute = path.join(getProjectDataDir(projectId), "files", normalized);
  const root = path.join(getProjectDataDir(projectId), "files");
  if (!absolute.startsWith(root)) return null;

  const content = await readFile(absolute, "utf8");
  return {
    relativePath: normalized,
    content,
    sizeBytes: entry.sizeBytes,
  };
}