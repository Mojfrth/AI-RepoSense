"use client";

import type { FileTreeNode } from "@/lib/files/explorer";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
} from "lucide-react";
import { useMemo, useState } from "react";

function FileGlyph({ name, className }: { name: string; className?: string }) {
  if (/\.(tsx?|jsx?|mjs|cjs)$/i.test(name)) {
    return <FileCode2 className={className} aria-hidden />;
  }
  if (/\.json$/i.test(name)) {
    return <FileJson className={className} aria-hidden />;
  }
  return <FileText className={className} aria-hidden />;
}

function fileIconClass(name: string) {
  if (/\.tsx?$/i.test(name)) return "text-sky-500 dark:text-sky-400";
  if (/\.jsx?$/i.test(name)) return "text-amber-500 dark:text-amber-400";
  if (/\.json$/i.test(name)) return "text-emerald-500 dark:text-emerald-400";
  if (/\.css$/i.test(name)) return "text-fuchsia-500 dark:text-fuchsia-400";
  if (/\.md$/i.test(name)) return "text-violet-500 dark:text-violet-400";
  return "text-[color:var(--app-muted)]";
}

function isPathInsideFolder(folderPath: string, filePath: string | null) {
  if (!filePath) return false;
  return filePath === folderPath || filePath.startsWith(`${folderPath}/`);
}

function TreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: FileTreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const containsSelected = isPathInsideFolder(node.path, selectedPath);
  const [manualOpen, setManualOpen] = useState(() => depth < 2);
  const open = containsSelected || manualOpen;
  const pad = 10 + depth * 14;

  if (node.type === "file") {
    const selected = selectedPath === node.path;

    return (
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        className={cn(
          "group flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 text-left text-[13px] transition-colors",
          selected
            ? "bg-[color:var(--app-accent)]/14 font-medium text-[color:var(--app-accent-deep)]"
            : "text-foreground/90 hover:bg-[color:var(--app-accent)]/8",
        )}
        style={{ paddingInlineStart: pad }}
        title={node.path}
      >
        <FileGlyph
          name={node.name}
          className={cn("size-3.5 shrink-0", fileIconClass(node.name))}
        />
        <span className="min-w-0 truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setManualOpen(!open)}
        className={cn(
          "flex w-full items-center gap-1.5 rounded-lg py-1.5 pr-2 text-left text-[13px] font-semibold transition-colors hover:bg-[color:var(--app-accent)]/8",
          containsSelected
            ? "text-[color:var(--app-accent-deep)]"
            : "text-foreground/85",
        )}
        style={{ paddingInlineStart: pad }}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown
            className="size-3.5 shrink-0 text-[color:var(--app-muted)]"
            aria-hidden
          />
        ) : (
          <ChevronRight
            className="size-3.5 shrink-0 text-[color:var(--app-muted)]"
            aria-hidden
          />
        )}
        {open ? (
          <FolderOpen
            className="size-3.5 shrink-0 text-cyan-600 dark:text-cyan-400"
            aria-hidden
          />
        ) : (
          <Folder
            className="size-3.5 shrink-0 text-cyan-700/80 dark:text-cyan-500"
            aria-hidden
          />
        )}
        <span className="min-w-0 truncate">{node.name}</span>
      </button>
      {open
        ? node.children?.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  );
}

export function FileTree({
  tree,
  selectedPath,
  onSelect,
}: {
  tree: FileTreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const isEmpty = useMemo(() => tree.length === 0, [tree]);

  if (isEmpty) {
    return (
      <p className="p-4 text-sm text-[color:var(--app-muted)]">
        No files available.
      </p>
    );
  }

  return (
    <div className="explorer-tree max-h-[min(70vh,44rem)] overflow-auto p-2">
      {tree.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}