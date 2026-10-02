"use client";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  ALL_CATEGORIES,
  ALL_SEVERITIES,
  CATEGORY_LABELS,
  SEVERITY_LABELS,
  countBySeverity,
  filterIssues,
  severityVariant,
} from "@/lib/analysis/issue-utils";
import type {
  IssueCategory,
  IssueSeverity,
  ReportIssue,
} from "@/lib/analysis/report-types";
import Link from "next/link";
import { useMemo, useState } from "react";

type SeverityFilter = IssueSeverity | "all";
type CategoryFilter = IssueCategory | "all";

export function IssuesDashboard({
  projectId,
  issues,
}: {
  projectId: string;
  issues: ReportIssue[];
}) {
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const filtered = useMemo(
    () => filterIssues(issues, { severity, category }),
    [issues, severity, category],
  );

  const severityCounts = useMemo(() => countBySeverity(issues), [issues]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {ALL_SEVERITIES.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() =>
              setSeverity((current) => (current === value ? "all" : value))
            }
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              severity === value
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {SEVERITY_LABELS[value]} ({severityCounts[value]})
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="severity-filter">Severity</Label>
          <select
            id="severity-filter"
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={severity}
            onChange={(event) =>
              setSeverity(event.target.value as SeverityFilter)
            }
          >
            <option value="all">All severities</option>
            {ALL_SEVERITIES.map((value) => (
              <option key={value} value={value}>
                {SEVERITY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="category-filter">Category</Label>
          <select
            id="category-filter"
            className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as CategoryFilter)
            }
          >
            <option value="all">All categories</option>
            {ALL_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {issues.length} issue(s). These are
        potential findings to review, not certified vulnerabilities.
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No issues match the current filters.
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((issue, index) => (
            <li
              key={`${issue.title}-${issue.filePath}-${index}`}
              className="rounded-xl border p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h2 className="font-medium">{issue.title}</h2>
                <Badge variant={severityVariant(issue.severity)}>
                  {SEVERITY_LABELS[issue.severity]}
                </Badge>
                <Badge variant="outline">
                  {CATEGORY_LABELS[issue.category]}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {issue.description}
              </p>
              {issue.filePath ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  File:{" "}
                  <Link
                    href={`/projects/${projectId}/explorer?file=${encodeURIComponent(issue.filePath)}`}
                    className="underline"
                  >
                    {issue.filePath}
                  </Link>
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Project-wide finding
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}