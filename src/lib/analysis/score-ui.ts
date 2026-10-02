import type { IssueCategory } from "@/lib/analysis/report-types";

export type ScoreTone = "good" | "ok" | "poor" | "neutral";

export function scoreTone(score: number | null | undefined): ScoreTone {
  if (score == null || Number.isNaN(score)) return "neutral";
  if (score >= 75) return "good";
  if (score >= 50) return "ok";
  return "poor";
}

export function scoreTextClass(tone: ScoreTone): string {
  switch (tone) {
    case "good":
      return "text-emerald-600 dark:text-emerald-400";
    case "ok":
      return "text-amber-600 dark:text-amber-400";
    case "poor":
      return "text-rose-600 dark:text-rose-400";
    default:
      return "text-[color:var(--app-muted)]";
  }
}

export function scoreBarClass(tone: ScoreTone): string {
  switch (tone) {
    case "good":
      return "bg-gradient-to-r from-emerald-500 to-teal-400";
    case "ok":
      return "bg-gradient-to-r from-amber-500 to-orange-400";
    case "poor":
      return "bg-gradient-to-r from-rose-500 to-orange-500";
    default:
      return "bg-[color:var(--app-line)]";
  }
}

export function scoreChipClass(tone: ScoreTone): string {
  switch (tone) {
    case "good":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "ok":
      return "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300";
    case "poor":
      return "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300";
    default:
      return "border-[color:var(--app-line)] bg-muted/40 text-[color:var(--app-muted)]";
  }
}

export function scoreLabel(tone: ScoreTone): string {
  switch (tone) {
    case "good":
      return "Healthy";
    case "ok":
      return "Needs attention";
    case "poor":
      return "At risk";
    default:
      return "Unknown";
  }
}

export const CATEGORY_ACCENT: Record<
  IssueCategory,
  { bar: string; soft: string }
> = {
  architecture: {
    bar: "bg-sky-500",
    soft: "border-sky-500/20 bg-sky-500/8",
  },
  security: {
    bar: "bg-violet-500",
    soft: "border-violet-500/20 bg-violet-500/8",
  },
  performance: {
    bar: "bg-cyan-500",
    soft: "border-cyan-500/20 bg-cyan-500/8",
  },
  codeQuality: {
    bar: "bg-fuchsia-500",
    soft: "border-fuchsia-500/20 bg-fuchsia-500/8",
  },
  testing: {
    bar: "bg-indigo-500",
    soft: "border-indigo-500/20 bg-indigo-500/8",
  },
};