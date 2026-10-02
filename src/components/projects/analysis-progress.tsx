"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import { ANALYSIS_STEPS } from "@/lib/analysis/progress-steps";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type ProgressState = {
  id: string;
  name: string;
  status: "queued" | "processing" | "completed" | "failed";
  progressStep: string | null;
  progressPercent: number;
  errorMessage: string | null;
  framework: string | null;
  fileCount: number;
  report: { healthScore: number } | null;
};

export function AnalysisProgress({
  projectId,
  initial,
}: {
  projectId: string;
  initial: ProgressState;
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const startedRef = useRef(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const response = await fetch(`/api/projects/${projectId}/status`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as ProgressState;
        if (!cancelled) setState(data);
      } catch {
        // ignore transient poll errors
      }
    }

    const timer = window.setInterval(() => {
      void poll();
    }, 1500);

    void poll();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [projectId]);

  useEffect(() => {
    if (startedRef.current) return;
    if (state.status === "completed" || state.status === "failed") return;
    if (state.status === "processing" && state.progressPercent >= 30) return;

    startedRef.current = true;

    void (async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/analyze`, {
          method: "POST",
        });
        const data = (await response.json()) as {
          error?: string;
          status?: ProgressState["status"];
          progressStep?: string;
          progressPercent?: number;
        };
        if (!response.ok && data.error) {
          setStartError(data.error);
          return;
        }
        if (data.status) {
          setState((current) => ({
            ...current,
            status: data.status ?? current.status,
            progressStep: data.progressStep ?? current.progressStep,
            progressPercent: data.progressPercent ?? current.progressPercent,
          }));
        }
      } catch (error) {
        setStartError(
          error instanceof Error ? error.message : "Failed to start analysis",
        );
      }
    })();
  }, [projectId, state.progressPercent, state.status]);

  useEffect(() => {
    if (state.status === "completed") {
      const timer = window.setTimeout(() => {
        router.push(`/projects/${projectId}/report`);
      }, 1200);
      return () => window.clearTimeout(timer);
    }
  }, [state.status, projectId, router]);

  async function retry() {
    setStartError(null);
    startedRef.current = true;
    setState((current) => ({
      ...current,
      status: "processing",
      progressStep: "Starting analysis",
      progressPercent: Math.max(current.progressPercent, 30),
      errorMessage: null,
    }));

    const response = await fetch(`/api/projects/${projectId}/analyze`, {
      method: "POST",
    });
    const data = (await response.json()) as {
      error?: string;
      status?: ProgressState["status"];
      progressStep?: string;
      progressPercent?: number;
    };
    if (!response.ok && data.error) {
      setStartError(data.error);
      return;
    }
    if (data.status) {
      setState((current) => ({
        ...current,
        status: data.status ?? current.status,
        progressStep: data.progressStep ?? current.progressStep,
        progressPercent: data.progressPercent ?? current.progressPercent,
      }));
    }
  }

  return (
    <div className="space-y-5">
      <div className="app-panel p-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="app-kicker">Current step</p>
            <p className="mt-2 text-lg font-semibold tracking-tight">
              {state.progressStep ?? "Waiting to start..."}
            </p>
          </div>
          <p className="app-title text-4xl tabular-nums text-[color:var(--app-accent-deep)]">
            {state.progressPercent}%
          </p>
        </div>

        <div className="h-2.5 overflow-hidden rounded-full bg-[color:var(--app-line)]/60">
          <div
            className="app-progress-fill h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, state.progressPercent)}%` }}
          />
        </div>

        <ul className="mt-7 space-y-3">
          {ANALYSIS_STEPS.filter((step) => step.id !== "done").map((step) => {
            const complete =
              state.status === "completed" ||
              state.progressPercent >= step.percent;
            const active =
              !complete &&
              state.status !== "failed" &&
              state.progressPercent >= step.percent - 20 &&
              state.progressPercent < step.percent;

            return (
              <li key={step.id} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border text-xs",
                    complete &&
                      "border-[color:var(--app-accent)] bg-[color:var(--app-accent)] text-white",
                    active &&
                      "border-[color:var(--app-accent)] text-[color:var(--app-accent-deep)]",
                    !complete &&
                      !active &&
                      "border-[color:var(--app-line)] text-[color:var(--app-muted)]",
                  )}
                >
                  {complete ? "✓" : active ? "…" : ""}
                </span>
                <span
                  className={cn(
                    complete || active
                      ? "font-medium text-foreground"
                      : "text-[color:var(--app-muted)]",
                  )}
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="app-panel space-y-1.5 p-5 text-sm text-[color:var(--app-muted)]">
        <p>
          Framework:{" "}
          <span className="text-foreground">
            {state.framework ?? "Detecting..."}
          </span>
        </p>
        <p>
          Source files:{" "}
          <span className="text-foreground">{state.fileCount || "—"}</span>
        </p>
        {state.report ? (
          <p>
            Health score:{" "}
            <span className="font-semibold text-[color:var(--app-accent-deep)]">
              {state.report.healthScore}/100
            </span>
          </p>
        ) : null}
      </div>

      {state.status === "failed" || startError ? (
        <div className="app-panel space-y-3 border-destructive/30 p-5">
          <p className="text-sm text-destructive">
            {startError ?? state.errorMessage ?? "Analysis failed."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void retry()}
              className="bg-[linear-gradient(135deg,#06b6d4_0%,#0e7490_100%)] text-white hover:opacity-90"
            >
              Retry analysis
            </Button>
            <Link
              href={`/projects/${projectId}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Open overview
            </Link>
          </div>
        </div>
      ) : null}

      {state.status === "completed" ? (
        <div className="app-panel p-5 text-sm">
          Analysis complete. Redirecting to the health report...
          <div className="mt-3">
            <Link
              href={`/projects/${projectId}/report`}
              className={cn(
                buttonVariants(),
                "bg-[linear-gradient(135deg,#06b6d4_0%,#0e7490_100%)] text-white hover:opacity-90",
              )}
            >
              View report now
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}