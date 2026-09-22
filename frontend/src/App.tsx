import { useCallback, useEffect, useState } from "react";
import {
  evaluatePullRequest,
  fetchHistory,
  fetchRun,
  messageOf,
  submitEvaluation,
  type Evaluation,
  type EvaluationInput,
  type RunSummary,
} from "./api";
import { EvaluationForm } from "./components/EvaluationForm";
import { PrForm } from "./components/PrForm";
import { RULES } from "./rules";
import { HistoryPanel } from "./components/HistoryPanel";
import { Scorecard } from "./components/Scorecard";

type Mode = "diff" | "pr";

export default function App() {
  const [mode, setMode] = useState<Mode>("pr");
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [diff, setDiff] = useState<string | null>(null);
  const [prUrl, setPrUrl] = useState<string | null>(null);
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
      setPrUrl(null);
      await loadHistory();
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setLoading(false);
    }
  }

  async function evaluateFromPr(url: string) {
    setLoading(true);
    setError(null);
    try {
      setEvaluation(await evaluatePullRequest(url));
      setDiff(null);
      setPrUrl(url);
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
      setPrUrl(null);
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
            Paste a GitHub pull request, or a task and its diff. Five deterministic checks return PASS, REVIEW or
            BLOCKED, and every run is saved to an audit trail.
          </p>
          <ul className="checks">
            {RULES.map((rule) => (
              <li key={rule.name}>
                <details>
                  <summary>{rule.name}</summary>
                  <p>{rule.explanation}</p>
                </details>
              </li>
            ))}
          </ul>
        </header>
        <section className="grid">
          <div className="panel">
            <div className="tabs" role="tablist" aria-label="How to submit a change">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "pr"}
                className={mode === "pr" ? "active" : ""}
                onClick={() => setMode("pr")}
              >
                GitHub pull request
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "diff"}
                className={mode === "diff" ? "active" : ""}
                onClick={() => setMode("diff")}
              >
                Paste a diff
              </button>
            </div>
            {mode === "pr" ? (
              <PrForm loading={loading} onSubmit={evaluateFromPr} />
            ) : (
              <EvaluationForm loading={loading} onSubmit={evaluate} />
            )}
          </div>
          <aside>
            {error && <p role="alert" className="error">{error}</p>}
            {evaluation ? (
              <Scorecard evaluation={evaluation} diff={diff} prUrl={prUrl} />
            ) : (
              <div className="empty">
                <strong>No result yet</strong>
                <p>Paste a public GitHub PR link, or switch to pasting a diff, then evaluate it.</p>
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
