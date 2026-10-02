"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  oneDark,
  oneLight,
} from "react-syntax-highlighter/dist/esm/styles/prism";

function languageFromPath(filePath: string): string {
  if (filePath.endsWith(".tsx")) return "tsx";
  if (filePath.endsWith(".ts")) return "typescript";
  if (filePath.endsWith(".jsx")) return "jsx";
  if (filePath.endsWith(".js")) return "javascript";
  if (filePath.endsWith(".json")) return "json";
  if (filePath.endsWith(".css")) return "css";
  if (filePath.endsWith(".md")) return "markdown";
  return "text";
}

export function CodeViewer({
  filePath,
  content,
}: {
  filePath: string;
  content: string;
}) {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isDark = mounted ? resolvedTheme === "dark" : true;
  const style = isDark ? oneDark : oneLight;
  const lineCount = content.length === 0 ? 1 : content.split("\n").length;

  return (
    <div className="explorer-code overflow-hidden rounded-2xl border border-[color:var(--app-line)] shadow-[0_18px_48px_rgba(10,18,32,0.08)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 bg-[#0d1828] px-4 py-2.5 dark:bg-[#0a1422]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-[#ff5f57]/90" />
            <span className="size-2.5 rounded-full bg-[#febc2e]/90" />
            <span className="size-2.5 rounded-full bg-[#28c840]/90" />
          </span>
          <p className="truncate font-mono text-[13px] text-sky-100/80">
            {filePath}
          </p>
        </div>
        <p className="shrink-0 font-mono text-[11px] text-sky-100/45">
          {lineCount} lines
        </p>
      </div>

      <div className={cnScroll(isDark)}>
        <SyntaxHighlighter
          language={languageFromPath(filePath)}
          style={style}
          showLineNumbers
          wrapLongLines={false}
          PreTag="pre"
          lineNumberStyle={{
            minWidth: "2.75rem",
            paddingRight: "1rem",
            color: isDark ? "rgba(148, 163, 184, 0.45)" : "#94a3b8",
            fontSize: "13px",
          }}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: "14.5px",
            lineHeight: 1.7,
            padding: "1.1rem 1rem 1.25rem",
            background: isDark ? "#0b1524" : "#f8fafc",
            minHeight: "18rem",
            whiteSpace: "pre",
            overflowX: "auto",
            wordBreak: "normal",
            overflowWrap: "normal",
          }}
          codeTagProps={{
            style: {
              fontFamily:
                "var(--font-jetbrains), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: "14.5px",
              lineHeight: 1.7,
              whiteSpace: "pre",
              display: "block",
            },
          }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

function cnScroll(isDark: boolean) {
  return [
    "max-h-[min(70vh,44rem)] overflow-auto",
    isDark ? "bg-[#0b1524]" : "bg-slate-50",
  ].join(" ");
}