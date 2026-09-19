import { FormEvent } from "react";
import type { EvaluationInput } from "../api";

const SAMPLE_DIFF = [
  "--- a/ProgressCard.tsx",
  "+++ b/ProgressCard.tsx",
  "+export function ProgressCard() {}",
  "--- a/ProgressCard.test.tsx",
  "+++ b/ProgressCard.test.tsx",
  "+test('empty state', () => {})",
].join("\n");

type Props = { loading: boolean; onSubmit: (input: EvaluationInput) => void };

export function EvaluationForm({ loading, onSubmit }: Props) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSubmit({
      taskTitle: String(form.get("title")),
      acceptanceCriteria: String(form.get("criteria")),
      diffText: String(form.get("diff")),
      testsPassed: form.get("tests") === "on",
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Task title
        <input name="title" required maxLength={200} defaultValue="Add learner progress card" />
      </label>
      <label>
        Acceptance criteria
        <textarea
          name="criteria"
          required
          maxLength={4000}
          defaultValue="Show completion percentage; handle empty state; include tests."
        />
      </label>
      <label>
        Agent diff
        <textarea className="code" name="diff" required maxLength={20000} defaultValue={SAMPLE_DIFF} />
      </label>
      <label className="check">
        <input name="tests" type="checkbox" defaultChecked /> Test suite passed
      </label>
      <button disabled={loading}>{loading ? "Evaluating…" : "Evaluate change"}</button>
    </form>
  );
}
