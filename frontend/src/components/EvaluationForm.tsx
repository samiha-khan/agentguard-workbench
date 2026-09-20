import { FormEvent, useState } from "react";
import type { EvaluationInput } from "../api";
import { SAMPLES } from "../samples";

type Props = { loading: boolean; onSubmit: (input: EvaluationInput) => void };

export function EvaluationForm({ loading, onSubmit }: Props) {
  const [values, setValues] = useState<EvaluationInput>(SAMPLES[0].input);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  function update<K extends keyof EvaluationInput>(key: K, value: EvaluationInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="samples">
        <span>Try an example</span>
        {SAMPLES.map((sample) => (
          <button type="button" key={sample.label} onClick={() => setValues(sample.input)}>
            {sample.label}
          </button>
        ))}
      </div>
      <label>
        Task title
        <input
          name="title"
          required
          maxLength={200}
          spellCheck={false}
          value={values.taskTitle}
          onChange={(event) => update("taskTitle", event.target.value)}
        />
      </label>
      <label>
        Acceptance criteria
        <textarea
          name="criteria"
          required
          maxLength={4000}
          value={values.acceptanceCriteria}
          onChange={(event) => update("acceptanceCriteria", event.target.value)}
        />
      </label>
      <label>
        Agent diff
        <textarea
          className="code"
          name="diff"
          wrap="off"
          required
          maxLength={20000}
          spellCheck={false}
          value={values.diffText}
          onChange={(event) => update("diffText", event.target.value)}
        />
      </label>
      <label className="check">
        <input
          name="tests"
          type="checkbox"
          checked={values.testsPassed}
          onChange={(event) => update("testsPassed", event.target.checked)}
        />
        Test suite passed
      </label>
      <button className="primary" disabled={loading}>{loading ? "Evaluating…" : "Evaluate change"}</button>
    </form>
  );
}
