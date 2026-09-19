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
    } catch (failure) {
      setError(messageOf(failure));
    }
  }

  return (
    <main>
      <header>
        <p className="eyebrow">AI CHANGE CONTROL</p>
        <h1>AgentGuard Workbench</h1>
        <p>Turn acceptance criteria and agent-generated diffs into an auditable ship decision.</p>
      </header>
      <section className="grid">
        <EvaluationForm loading={loading} onSubmit={evaluate} />
        <aside>
          {error && <p role="alert" className="error">{error}</p>}
          {evaluation ? (
            <Scorecard evaluation={evaluation} />
          ) : (
            <div className="empty">Submit an agent change to see its scorecard.</div>
          )}
        </aside>
      </section>
      <HistoryPanel runs={history} selectedId={evaluation?.id ?? null} error={historyError} onSelect={openRun} />
    </main>
  );
}
