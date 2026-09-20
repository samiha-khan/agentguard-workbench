import type { Evaluation, Severity, Verdict } from "../api";
import { DiffView } from "./DiffView";

const HINTS: Record<Verdict, string> = {
  PASS: "Ready for human review.",
  REVIEW: "Needs a human judgment call.",
  BLOCKED: "Return it to the agent.",
};
const SEVERITY_ORDER: Severity[] = ["BLOCKER", "WARNING", "INFO"];
const RING_RADIUS = 42;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function ScoreRing({ score, verdict }: { score: number; verdict: Verdict }) {
  const offset = RING_LENGTH * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <div className={`ring ${verdict.toLowerCase()}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ring-track" cx="50" cy="50" r={RING_RADIUS} />
        <circle
          className="ring-value"
          cx="50"
          cy="50"
          r={RING_RADIUS}
          strokeDasharray={RING_LENGTH}
          strokeDashoffset={offset}
        />
      </svg>
      <span>{score}</span>
    </div>
  );
}

export function Scorecard({ evaluation, diff }: { evaluation: Evaluation; diff?: string | null }) {
  const findings = [...evaluation.findings].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
  return (
    <>
      <div className="score">
        <ScoreRing score={evaluation.score} verdict={evaluation.verdict} />
        <div>
          <strong className={`verdict ${evaluation.verdict.toLowerCase()}`}>{evaluation.verdict}</strong>
          <p className="hint">{HINTS[evaluation.verdict]}</p>
        </div>
      </div>
      <p className="meta">
        Run #{evaluation.id} · {formatTime(evaluation.createdAt)}
      </p>
      <h2>Guardrail findings</h2>
      {findings.map((finding) => (
        <article key={finding.rule} className={finding.severity.toLowerCase()}>
          <b>{finding.severity}</b>
          <h3>{finding.rule}</h3>
          <p>{finding.message}</p>
        </article>
      ))}
      {diff && (
        <>
          <h2>Evaluated diff</h2>
          <DiffView diff={diff} />
        </>
      )}
    </>
  );
}
