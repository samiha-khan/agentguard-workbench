import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { HistoryPanel } from "./HistoryPanel";
import { Scorecard } from "./Scorecard";
import type { Evaluation, RunSummary } from "../api";

afterEach(cleanup);

const blocked: Evaluation = {
  id: 7,
  score: 60,
  verdict: "BLOCKED",
  createdAt: "2026-09-19T21:00:00Z",
  findings: [
    { rule: "secret-scan", severity: "BLOCKER", message: "Possible hard-coded credential found in added code." },
    { rule: "test-gate", severity: "INFO", message: "The submitted test suite passed." },
  ],
};

describe("Scorecard", () => {
  it("shows the verdict, score and every finding", () => {
    render(<Scorecard evaluation={blocked} />);
    expect(screen.getByText("BLOCKED")).toBeTruthy();
    expect(screen.getByText("60")).toBeTruthy();
    expect(screen.getByText("secret-scan")).toBeTruthy();
    expect(screen.getByText("The submitted test suite passed.")).toBeTruthy();
  });
});

describe("HistoryPanel", () => {
  const runs: RunSummary[] = [
    { id: 2, taskTitle: "Fix login", score: 100, verdict: "PASS", createdAt: "2026-09-19T21:00:00Z" },
    { id: 1, taskTitle: "Edit CI", score: 60, verdict: "BLOCKED", createdAt: "2026-09-19T20:00:00Z" },
  ];

  it("lists runs and reports which one was picked", () => {
    const onSelect = vi.fn();
    render(<HistoryPanel runs={runs} selectedId={null} error={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Edit CI"));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it("explains an empty audit trail", () => {
    render(<HistoryPanel runs={[]} selectedId={null} error={null} onSelect={() => {}} />);
    expect(screen.getByText(/No runs yet/)).toBeTruthy();
  });

  it("shows a load error instead of the empty message", () => {
    render(<HistoryPanel runs={[]} selectedId={null} error="Could not reach the API" onSelect={() => {}} />);
    expect(screen.getByRole("alert").textContent).toContain("Could not reach the API");
    expect(screen.queryByText(/No runs yet/)).toBeNull();
  });
});

describe("Scorecard details", () => {
  it("lists blockers first and colors the evaluated diff", () => {
    const shuffled = { ...blocked, findings: [blocked.findings[1], blocked.findings[0]] };
    const { container } = render(<Scorecard evaluation={shuffled} diff={"--- a/x\n+++ b/x\n@@ -1 +1 @@\n+added\n-removed"} />);
    const rules = [...container.querySelectorAll("article h3")].map((heading) => heading.textContent);
    expect(rules).toEqual(["secret-scan", "test-gate"]);
    expect(container.querySelectorAll(".diff-add").length).toBe(1);
    expect(container.querySelectorAll(".diff-del").length).toBe(1);
    expect(container.querySelectorAll(".diff-file").length).toBe(2);
    expect(container.querySelectorAll(".diff-hunk").length).toBe(1);
  });

  it("omits the diff section when no diff is available", () => {
    render(<Scorecard evaluation={blocked} diff={null} />);
    expect(screen.queryByText("Evaluated diff")).toBeNull();
  });
});
