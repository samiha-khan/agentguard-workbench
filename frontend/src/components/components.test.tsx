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
