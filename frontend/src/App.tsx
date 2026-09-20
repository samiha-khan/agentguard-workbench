import { useCallback, useEffect, useState } from "react";
import {
  fetchHistory,
  fetchRun,
  messageOf,
  submitEvaluation,
  type Evaluation,
  type EvaluationInput,
  type RunSummary,
} from "./api";
import { EvaluationForm } from "./components/EvaluationForm";
import { HistoryPanel } from "./components/HistoryPanel";
import { Scorecard } from "./components/Scorecard";

export default function App() {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [diff, setDiff] = useState<string | null>(null);
  const [history, setHistory] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await fetchHistory());
      setHistoryError(null);
    } catch (failure) {
      setHistoryError(messageOf(failure));
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  async function evaluate(input: EvaluationInput) {
    setLoading(true);
    setError(null);
    try {
      setEvaluation(await submitEvaluation(input));
      setDiff(input.diffText);
      await loadHistory();
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setLoading(false);
    }
  }

  async function openRun(id: number) {
    setError(null);
    try {
      setEvaluation(await fetchRun(id));
      setDiff(null);
    } catch (failure) {
      setError(messageOf(failure));
    }
  }

  return (
    <div className="shell">
      <nav className="topbar">
        <span className="brand">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Zm-1.2 14.2-3.5-3.5 1.4-1.4 2.1 2.1 4.6-4.6 1.4 1.4-6 6Z" />
          </svg>
          AgentGuard <em>Workbench</em>
        </span>
        <a href="https://github.com/samiha-khan/agentguard-workbench">View source</a>
      </nav>
      <main>
        <header className="hero">
          <h1>Know whether an agent's change is safe to ship.</h1>
          <p>
            Paste the task, its acceptance criteria and the diff. Five deterministic checks return PASS, REVIEW or
            BLOCKED, and every run is saved to an audit trail.
          </p>
          <ul className="checks">
            {["Secret scan", "Protected paths", "Test gate", "Change size", "Test evidence"].map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </header>
        <section className="grid">
          <EvaluationForm loading={loading} onSubmit={evaluate} />
          <aside>
            {error && <p role="alert" className="error">{error}</p>}
            {evaluation ? (
              <Scorecard evaluation={evaluation} diff={diff} />
            ) : (
              <div className="empty">
                <strong>No result yet</strong>
                <p>Pick an example or paste your own diff, then evaluate it.</p>
              </div>
            )}
          </aside>
        </section>
        <HistoryPanel runs={history} selectedId={evaluation?.id ?? null} error={historyError} onSelect={openRun} />
      </main>
      <footer>Spring Boot · MySQL · React · TypeScript</footer>
    </div>
  );
}
