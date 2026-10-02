import {
  createGitignoreFilter,
  isSourceFile,
  normalizePath,
  shouldSkipPath,
  type ExtractedFile,
} from "@/lib/files/filters";
import {
  MAX_FILE_COUNT,
  MAX_FILE_SIZE_BYTES,
  MAX_REPO_SIZE_BYTES,
} from "@/lib/limits";
import JSZip from "jszip";

export type ExtractionResult =
  | {
      ok: true;
      sourceFiles: ExtractedFile[];
      allRelativePaths: string[];
      totalBytes: number;
      skippedLargeFiles: string[];
    }
  | {
      ok: false;
      error: string;
    };

function stripZipRoot(entryPath: string): string {
  const normalized = normalizePath(entryPath);
  const parts = normalized.split("/");
  // GitHub zipballs wrap contents in a single root folder
  if (parts.length > 1) {
    return parts.slice(1).join("/");
  }
  return normalized;
}

export async function extractFromZipBuffer(
  buffer: Buffer,
  options?: { stripRoot?: boolean },
): Promise<ExtractionResult> {
  if (buffer.byteLength > MAX_REPO_SIZE_BYTES) {
    return {
      ok: false,
      error: `Repository exceeds the ${MAX_REPO_SIZE_BYTES / (1024 * 1024)} MB size limit.`,
    };
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    return { ok: false, error: "Invalid or corrupted ZIP file." };
  }

  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  const rawPaths = entries.map((entry) =>
    options?.stripRoot ? stripZipRoot(entry.name) : normalizePath(entry.name),
  );

  const gitignoreEntry = entries.find((entry) => {
    const relative = options?.stripRoot
      ? stripZipRoot(entry.name)
      : normalizePath(entry.name);
    return relative === ".gitignore";
  });

  const gitignoreContent = gitignoreEntry
    ? await gitignoreEntry.async("string")
    : undefined;
  const gitignore = createGitignoreFilter(gitignoreContent);

  const keptEntries: { entry: JSZip.JSZipObject; relativePath: string }[] = [];
  let totalBytes = 0;
  const skippedLargeFiles: string[] = [];

  for (const entry of entries) {
    const relativePath = options?.stripRoot
      ? stripZipRoot(entry.name)
      : normalizePath(entry.name);

    if (!relativePath || shouldSkipPath(relativePath, gitignore)) continue;

    // Approximate size from uncompressed size when available
    const size =
      (entry as JSZip.JSZipObject & { _data?: { uncompressedSize?: number } })
        ._data?.uncompressedSize ?? 0;

    if (size > MAX_FILE_SIZE_BYTES) {
      skippedLargeFiles.push(relativePath);
      continue;
    }

    totalBytes += size;
    if (totalBytes > MAX_REPO_SIZE_BYTES) {
      return {
        ok: false,
        error: `Repository exceeds the ${MAX_REPO_SIZE_BYTES / (1024 * 1024)} MB size limit after filtering.`,
      };
    }

    keptEntries.push({ entry, relativePath });
    if (keptEntries.length > MAX_FILE_COUNT) {
      return {
        ok: false,
        error: `Repository exceeds the ${MAX_FILE_COUNT} file limit.`,
      };
    }
  }

  const allRelativePaths = keptEntries.map((item) => item.relativePath);
  const sourceFiles: ExtractedFile[] = [];

  // Also keep package.json for framework detection even if not a source file
  for (const item of keptEntries) {
    const isPackageJson =
      item.relativePath === "package.json" ||
      item.relativePath.endsWith("/package.json");
    if (!isSourceFile(item.relativePath) && !isPackageJson) continue;

    const content = await item.entry.async("string");
    const sizeBytes = Buffer.byteLength(content, "utf8");

    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      skippedLargeFiles.push(item.relativePath);
      continue;
    }

    sourceFiles.push({
      relativePath: item.relativePath,
      content,
      sizeBytes,
    });
  }

  const analyzable = sourceFiles.filter((file) =>
    isSourceFile(file.relativePath),
  );

  if (analyzable.length === 0) {
    return {
      ok: false,
      error:
        "No JavaScript/TypeScript source files found. Only JS/TS projects are supported.",
    };
  }

  return {
    ok: true,
    sourceFiles,
    allRelativePaths: rawPaths.length > 0 ? allRelativePaths : rawPaths,
    totalBytes,
    skippedLargeFiles,
  };
}