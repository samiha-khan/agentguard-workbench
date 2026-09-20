import type { EvaluationInput } from "./api";

export type Sample = { label: string; input: EvaluationInput };

const CLEAN_DIFF = [
  "--- a/ProgressCard.tsx",
  "+++ b/ProgressCard.tsx",
  "+export function ProgressCard() {}",
  "--- a/ProgressCard.test.tsx",
  "+++ b/ProgressCard.test.tsx",
  "+test('empty state', () => {})",
].join("\n");

export const SAMPLES: Sample[] = [
  {
    label: "Clean change",
    input: {
      taskTitle: "Add learner progress card",
      acceptanceCriteria: "Show completion percentage; handle empty state; include tests.",
      diffText: CLEAN_DIFF,
      testsPassed: true,
    },
  },
  {
    label: "Leaked key",
    input: {
      taskTitle: "Add API client for progress sync",
      acceptanceCriteria: "Sync progress to the server; retry on failure; include tests.",
      diffText: [
        "--- a/src/ProgressClient.ts",
        "+++ b/src/ProgressClient.ts",
        '+const api_key = "demo-not-a-real-key-123";',
        "+export const sync = () => fetch(url);",
      ].join("\n"),
      testsPassed: true,
    },
  },
  {
    label: "Edited migration",
    input: {
      taskTitle: "Backfill quiz scores",
      acceptanceCriteria: "Backfill missing scores; do not change existing rows.",
      diffText: [
        "--- a/db/migrations/V3__quiz_scores.sql",
        "+++ b/db/migrations/V3__quiz_scores.sql",
        "+update quiz_scores set score = 0 where score is null;",
        "--- a/QuizScoresTest.java",
        "+++ b/QuizScoresTest.java",
        "+void backfillsNulls() {}",
      ].join("\n"),
      testsPassed: true,
    },
  },
  {
    label: "Failing tests",
    input: {
      taskTitle: "Add learner progress card",
      acceptanceCriteria: "Show completion percentage; handle empty state; include tests.",
      diffText: CLEAN_DIFF,
      testsPassed: false,
    },
  },
];
