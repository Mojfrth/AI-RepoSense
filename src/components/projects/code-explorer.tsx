"use client";

import { CodeViewer } from "@/components/projects/code-viewer";
import { FileAiPanel } from "@/components/projects/file-ai-panel";
import { FileTree } from "@/components/projects/file-tree";
import type { FileTreeNode } from "@/lib/files/explorer";
import { useState } from "react";

export function CodeExplorer({
  projectId,
  tree,
  initialFile,
  initialContent,
}: {
  projectId: string;
  tree: FileTreeNode[];
  initialFile: string | null;
  initialContent: string | null;
}) {
  const [selectedPath, setSelectedPath] = useState<string | null>(initialFile);
  const [content, setContent] = useState<string | null>(initialContent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadFile(path: string) {
    setSelectedPath(path);
    setLoading(true);
    setError(null);

    // Keep the URL shareable without remounting the explorer tree.
    window.history.replaceState(
      null,
      "",
      `/projects/${projectId}/explorer?file=${encodeURIComponent(path)}`,
    );

    try {
      const response = await fetch(
        `/api/explorer/file?projectId=${encodeURIComponent(projectId)}&file=${encodeURIComponent(path)}`,
      );
      const data = (await response.json()) as {
        content?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load file");
      }
      setContent(data.content ?? "");
    } catch (err) {
      setContent(null);
      setError(err instanceof Error ? err.message : "Failed to load file");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)_minmax(0,300px)]">
      <section className="app-panel min-w-0 overflow-hidden">
        <div className="flex items-center justify-between border-b border-[color:var(--app-line)] px-3.5 py-2.5">
          <p className="text-xs font-semibold tracking-wide text-[color:var(--app-muted)] uppercase">
            Files
          </p>
          <span className="rounded-full bg-[color:var(--app-accent)]/12 px-2 py-0.5 text-[10px] font-semibold text-[color:var(--app-accent-deep)]">
            {countFiles(tree)}
          </span>
        </div>
        <FileTree
          tree={tree}
          selectedPath={selectedPath}
          onSelect={(path) => {
            void loadFile(path);
          }}
        />
      </section>

      <section className="min-w-0">
        {loading ? (
          <div className="app-panel flex min-h-[18rem] items-center justify-center border-dashed p-8 text-sm text-[color:var(--app-muted)]">
            Loading file...
          </div>
        ) : error ? (
          <div className="app-panel flex min-h-[18rem] items-center justify-center border-dashed p-8 text-sm text-destructive">
            {error}
          </div>
        ) : selectedPath && content != null ? (
          <CodeViewer filePath={selectedPath} content={content} />
        ) : (
          <div className="app-panel flex min-h-[18rem] items-center justify-center border-dashed p-8 text-sm text-[color:var(--app-muted)]">
            Select a file to view its code.
          </div>
        )}
      </section>

      <section className="min-w-0">
        <FileAiPanel projectId={projectId} filePath={selectedPath} />
      </section>
    </div>
  );
}

function countFiles(nodes: FileTreeNode[]): number {
  let total = 0;
  for (const node of nodes) {
    if (node.type === "file") total += 1;
    else if (node.children) total += countFiles(node.children);
  }
  return total;
}