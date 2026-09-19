import type { Evaluation } from "../api";

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function Scorecard({ evaluation }: { evaluation: Evaluation }) {
  return (
    <>
      <div className={`score ${evaluation.verdict.toLowerCase()}`}>
        <span>{evaluation.score}</span>
        <strong>{evaluation.verdict}</strong>
      </div>
      <p className="meta">
        Run #{evaluation.id} · {formatTime(evaluation.createdAt)}
      </p>
      <h2>Guardrail findings</h2>
      {evaluation.findings.map((finding) => (
        <article key={finding.rule}>
          <b>{finding.severity}</b>
          <h3>{finding.rule}</h3>
          <p>{finding.message}</p>
        </article>
      ))}
    </>
  );
}
