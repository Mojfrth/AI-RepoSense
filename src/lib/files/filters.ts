import {
  ALWAYS_EXCLUDE_DIR_NAMES,
  ALWAYS_EXCLUDE_FILE_NAMES,
  SOURCE_EXTENSIONS,
} from "@/lib/limits";
import ignore from "ignore";
import path from "path";

export type ExtractedFile = {
  relativePath: string;
  content: string;
  sizeBytes: number;
};

function normalizeRelativePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\//, "");
}

function isBinaryOrNonText(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  const binaryExts = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".ico",
    ".svg",
    ".pdf",
    ".zip",
    ".gz",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".mp4",
    ".mp3",
    ".wasm",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
  ]);
  return binaryExts.has(ext);
}

export function isSourceFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return SOURCE_EXTENSIONS.has(ext);
}

export function shouldSkipPath(
  relativePath: string,
  gitignore?: ReturnType<typeof ignore>,
): boolean {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized || normalized.endsWith("/")) return true;

  const parts = normalized.split("/");
  if (parts.some((part) => ALWAYS_EXCLUDE_DIR_NAMES.has(part))) return true;

  const baseName = parts[parts.length - 1] ?? "";
  if (ALWAYS_EXCLUDE_FILE_NAMES.has(baseName)) return true;
  if (isBinaryOrNonText(normalized)) return true;
  if (gitignore?.ignores(normalized)) return true;

  return false;
}

export function createGitignoreFilter(gitignoreContent?: string) {
  const ig = ignore();
  if (gitignoreContent) {
    ig.add(gitignoreContent);
  }
  return ig;
}

export function normalizePath(filePath: string): string {
  return normalizeRelativePath(filePath);
}