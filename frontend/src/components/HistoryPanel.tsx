import type { RunSummary } from "../api";
import { formatTime } from "./Scorecard";

type Props = {
  runs: RunSummary[];
  selectedId: number | null;
  error: string | null;
  onSelect: (id: number) => void;
};

export function HistoryPanel({ runs, selectedId, error, onSelect }: Props) {
  return (
    <section className="history">
      <h2>Previous runs</h2>
      {error && <p role="alert" className="error">{error}</p>}
      {!error && runs.length === 0 && <p className="meta">No runs yet. Evaluate a change to start the audit trail.</p>}
      <ul>
        {runs.map((run) => (
          <li key={run.id}>
            <button
              type="button"
              className={run.id === selectedId ? "selected" : undefined}
              onClick={() => onSelect(run.id)}
            >
              <span className={`pill ${run.verdict.toLowerCase()}`}>{run.verdict}</span>
              <span className="title">{run.taskTitle}</span>
              <span className="meta">
                {run.score} · {formatTime(run.createdAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
