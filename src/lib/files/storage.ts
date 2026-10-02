import { del, get, list, put } from "@vercel/blob";
import type { ExtractedFile } from "@/lib/files/filters";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import path from "path";

const DATA_ROOT = path.join(process.cwd(), ".data", "projects");
const BLOB_ACCESS = "private" as const;

export type ProjectManifestEntry = {
  relativePath: string;
  sizeBytes: number;
};

function blobStorageConfigured(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN),
  );
}

function shouldUseBlobStorage(): boolean {
  if (blobStorageConfigured()) return true;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Persistent project storage is not configured. Connect a private Vercel Blob store and redeploy.",
    );
  }
  return false;
}

function normalizeRelativePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (
    !normalized ||
    normalized.split("/").some((part) => part === ".." || part === ".") ||
    path.posix.isAbsolute(normalized)
  ) {
    throw new Error("Invalid project file path.");
  }
  return normalized;
}

function projectPrefix(projectId: string): string {
  return `projects/${projectId}/`;
}

function manifestPath(projectId: string): string {
  return `${projectPrefix(projectId)}manifest.json`;
}

function filePath(projectId: string, relativePath: string): string {
  return `${projectPrefix(projectId)}files/${normalizeRelativePath(relativePath)}`;
}

function localProjectDir(projectId: string): string {
  return path.join(DATA_ROOT, projectId);
}

async function readBlobText(pathname: string): Promise<string> {
  const result = await get(pathname, { access: BLOB_ACCESS });
  if (!result || result.statusCode !== 200 || !result.stream) {
    throw new Error(`Project storage object was not found: ${pathname}`);
  }
  return new Response(result.stream).text();
}

/** Persist accepted project files to durable private Blob storage in production. */
export async function persistProjectFiles(
  projectId: string,
  files: ExtractedFile[],
): Promise<void> {
  const useBlob = shouldUseBlobStorage();
  const manifest: ProjectManifestEntry[] = files.map((file) => ({
    relativePath: normalizeRelativePath(file.relativePath),
    sizeBytes: file.sizeBytes,
  }));

  if (!useBlob) {
    const root = localProjectDir(projectId);
    await mkdir(path.join(root, "files"), { recursive: true });
    for (const file of files) {
      const relativePath = normalizeRelativePath(file.relativePath);
      const target = path.join(root, "files", relativePath);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, file.content, "utf8");
    }
    await writeFile(
      path.join(root, "manifest.json"),
      JSON.stringify(manifest),
      "utf8",
    );
    return;
  }

  await deleteBlobProjectFiles(projectId);
  const objects = files.map((file) => ({
    pathname: filePath(projectId, file.relativePath),
    content: file.content,
  }));

  // Bound parallel uploads to avoid opening hundreds of requests at once.
  const batchSize = 12;
  for (let index = 0; index < objects.length; index += batchSize) {
    const batch = objects.slice(index, index + batchSize);
    await Promise.all(
      batch.map(({ pathname, content }) =>
        put(pathname, content, {
          access: BLOB_ACCESS,
          addRandomSuffix: false,
          allowOverwrite: true,
          contentType: "text/plain; charset=utf-8",
        }),
      ),
    );
  }

  // Write the manifest last so readers only see fully uploaded project files.
  await put(manifestPath(projectId), JSON.stringify(manifest), {
    access: BLOB_ACCESS,
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json; charset=utf-8",
  });
}

export async function readProjectManifest(
  projectId: string,
): Promise<ProjectManifestEntry[]> {
  const raw = shouldUseBlobStorage()
    ? await readBlobText(manifestPath(projectId))
    : await readFile(path.join(localProjectDir(projectId), "manifest.json"), "utf8");
  const manifest: unknown = JSON.parse(raw);
  if (
    !Array.isArray(manifest) ||
    !manifest.every(
      (entry) =>
        typeof entry?.relativePath === "string" &&
        typeof entry?.sizeBytes === "number",
    )
  ) {
    throw new Error("Project file manifest is invalid.");
  }
  return manifest.map((entry) => ({
    relativePath: normalizeRelativePath(entry.relativePath),
    sizeBytes: entry.sizeBytes,
  }));
}

export async function readProjectFileContent(
  projectId: string,
  relativePath: string,
): Promise<string> {
  const normalized = normalizeRelativePath(relativePath);
  if (shouldUseBlobStorage()) {
    return readBlobText(filePath(projectId, normalized));
  }

  const root = path.join(localProjectDir(projectId), "files");
  const absolute = path.resolve(root, normalized);
  if (!absolute.startsWith(`${path.resolve(root)}${path.sep}`)) {
    throw new Error("Invalid project file path.");
  }
  return readFile(absolute, "utf8");
}

async function deleteBlobProjectFiles(projectId: string): Promise<void> {
  let cursor: string | undefined;
  do {
    const page = await list({
      prefix: projectPrefix(projectId),
      limit: 1000,
      ...(cursor ? { cursor } : {}),
    });
    if (page.blobs.length > 0) {
      await del(page.blobs.map((blob) => blob.pathname));
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
}

export async function deleteProjectFiles(projectId: string): Promise<void> {
  if (blobStorageConfigured()) {
    await deleteBlobProjectFiles(projectId);
    return;
  }
  // A production instance without Blob credentials has no durable files to clean up.
  if (process.env.NODE_ENV === "production") return;
  await rm(localProjectDir(projectId), { recursive: true, force: true });
}
