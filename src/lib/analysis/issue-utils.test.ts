import {
  countBySeverity,
  filterIssues,
  severityVariant,
  sortIssues,
} from "@/lib/analysis/issue-utils";
import type { ReportIssue } from "@/lib/analysis/report-types";
import { describe, expect, it } from "vitest";

const issues: ReportIssue[] = [
  {
    title: "Low issue",
    description: "d",
    severity: "low",
    category: "testing",
    filePath: null,
  },
  {
    title: "Critical security",
    description: "d",
    severity: "critical",
    category: "security",
    filePath: "a.ts",
  },
  {
    title: "Medium arch",
    description: "d",
    severity: "medium",
    category: "architecture",
    filePath: "b.ts",
  },
  {
    title: "High quality",
    description: "d",
    severity: "high",
    category: "codeQuality",
    filePath: "c.ts",
  },
];

describe("sortIssues", () => {
  it("orders by severity then category", () => {
    const sorted = sortIssues(issues);
    expect(sorted.map((i) => i.severity)).toEqual([
      "critical",
      "high",
      "medium",
      "low",
    ]);
  });
});

describe("filterIssues", () => {
  it("filters by severity", () => {
    const filtered = filterIssues(issues, { severity: "critical" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.title).toBe("Critical security");
  });

  it("filters by category", () => {
    const filtered = filterIssues(issues, { category: "architecture" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.title).toBe("Medium arch");
  });

  it("returns all when filters are all", () => {
    expect(
      filterIssues(issues, { severity: "all", category: "all" }),
    ).toHaveLength(4);
  });
});

describe("countBySeverity / severityVariant", () => {
  it("counts severities", () => {
    expect(countBySeverity(issues)).toEqual({
      critical: 1,
      high: 1,
      medium: 1,
      low: 1,
    });
  });

  it("maps badge variants", () => {
    expect(severityVariant("critical")).toBe("destructive");
    expect(severityVariant("high")).toBe("destructive");
    expect(severityVariant("medium")).toBe("secondary");
    expect(severityVariant("low")).toBe("outline");
  });
});