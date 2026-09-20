import type { EvaluationInput } from "./api";

export type Sample = { label: string; input: EvaluationInput };

function newFile(path: string, body: string[]): string[] {
  return ["--- /dev/null", `+++ b/${path}`, `@@ -0,0 +1,${body.length} @@`, ...body.map((line) => `+${line}`)];
}

const CLEAN_DIFF = [
  "--- a/src/components/CourseHeader.tsx",
  "+++ b/src/components/CourseHeader.tsx",
  "@@ -1,5 +1,11 @@",
  ' import { Course } from "../types";',
  '+import { ProgressCard } from "./ProgressCard";',
  " ",
  " export function CourseHeader({ course }: { course: Course }) {",
  "-  return <h1>{course.title}</h1>;",
  "+  return (",
  "+    <header>",
  "+      <h1>{course.title}</h1>",
  "+      <ProgressCard completed={course.lessonsCompleted} total={course.lessonCount} />",
  "+    </header>",
  "+  );",
  " }",
  ...newFile("src/components/ProgressCard.tsx", [
    "type Props = { completed: number; total: number };",
    "",
    "export function ProgressCard({ completed, total }: Props) {",
    "  if (total === 0) {",
    "    return <p>No lessons in this course yet.</p>;",
    "  }",
    "  const percent = Math.round((completed / total) * 100);",
    "  return (",
    '    <section aria-label="Course progress">',
    "      <strong>{percent}% complete</strong>",
    "      <progress value={completed} max={total} />",
    "    </section>",
    "  );",
    "}",
  ]),
  ...newFile("src/components/ProgressCard.test.tsx", [
    'import { render, screen } from "@testing-library/react";',
    'import { ProgressCard } from "./ProgressCard";',
    "",
    'test("shows the completion percentage", () => {',
    "  render(<ProgressCard completed={3} total={4} />);",
    '  expect(screen.getByText("75% complete")).toBeTruthy();',
    "});",
    "",
    'test("shows an empty state for a course with no lessons", () => {',
    "  render(<ProgressCard completed={0} total={0} />);",
    "  expect(screen.getByText(/No lessons/)).toBeTruthy();",
    "});",
  ]),
].join("\n");

const LEAKED_KEY_DIFF = newFile("src/api/progressClient.ts", [
  'const API_KEY = "sk_test_not_a_real_key_0123456789";',
  "",
  "export async function syncProgress(courseId: string, completed: number) {",
  "  const response = await fetch(`/api/courses/${courseId}/progress`, {",
  '    method: "PUT",',
  '    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },',
  "    body: JSON.stringify({ completed }),",
  "  });",
  '  if (!response.ok) throw new Error("Could not sync progress");',
  "}",
]).join("\n");

const MIGRATION_DIFF = [
  "--- a/db/migrations/V3__quiz_scores.sql",
  "+++ b/db/migrations/V3__quiz_scores.sql",
  "@@ -1,6 +1,6 @@",
  " CREATE TABLE quiz_scores (",
  "   id BIGINT PRIMARY KEY AUTO_INCREMENT,",
  "   learner_id BIGINT NOT NULL,",
  "   quiz_id BIGINT NOT NULL,",
  "-  score INT",
  "+  score INT NOT NULL DEFAULT 0",
  " );",
  "--- a/src/test/java/com/example/quiz/QuizScoreRepositoryTest.java",
  "+++ b/src/test/java/com/example/quiz/QuizScoreRepositoryTest.java",
  "@@ -20,3 +20,8 @@ class QuizScoreRepositoryTest {",
  "   }",
  " ",
  "+  @Test",
  "+  void missingScoresDefaultToZero() {",
  "+    var saved = repository.save(new QuizScore(1L, 2L, null));",
  "+    assertThat(saved.getScore()).isZero();",
  "+  }",
  " }",
].join("\n");

const SCORE_DIFF = [
  "--- a/src/main/java/com/example/quiz/ScoreCalculator.java",
  "+++ b/src/main/java/com/example/quiz/ScoreCalculator.java",
  "@@ -8,5 +8,5 @@ public class ScoreCalculator {",
  "   public int percent(int correct, int total) {",
  "-    return (int) Math.round(100.0 * correct / total);",
  "+    return correct * 100 / total;",
  "   }",
  " ",
  "   public boolean passed(int percent) {",
].join("\n");

export const SAMPLES: Sample[] = [
  {
    label: "Clean change",
    input: {
      taskTitle: "Add learner progress card",
      acceptanceCriteria:
        "Show the completion percentage on the course page; handle a course with no lessons; include tests.",
      diffText: CLEAN_DIFF,
      testsPassed: true,
    },
  },
  {
    label: "Leaked key",
    input: {
      taskTitle: "Sync course progress to the server",
      acceptanceCriteria: "Send the learner's completed lesson count to the API; include tests.",
      diffText: LEAKED_KEY_DIFF,
      testsPassed: true,
    },
  },
  {
    label: "Edited migration",
    input: {
      taskTitle: "Make quiz scores non-null",
      acceptanceCriteria: "Existing learners get a score of 0 instead of null; add a test.",
      diffText: MIGRATION_DIFF,
      testsPassed: true,
    },
  },
  {
    label: "Failing tests",
    input: {
      taskTitle: "Simplify quiz score calculation",
      acceptanceCriteria: "Percentages must stay identical to the current results.",
      diffText: SCORE_DIFF,
      testsPassed: false,
    },
  },
];
