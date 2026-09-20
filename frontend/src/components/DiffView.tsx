function lineClass(line: string): string {
  if (line.startsWith("+++") || line.startsWith("---")) return "diff-file";
  if (line.startsWith("@@")) return "diff-hunk";
  if (line.startsWith("+")) return "diff-add";
  if (line.startsWith("-")) return "diff-del";
  return "diff-ctx";
}

export function DiffView({ diff }: { diff: string }) {
  return (
    <pre className="diff" aria-label="Evaluated diff">
      {diff.split("\n").map((line, index) => (
        <span key={index} className={lineClass(line)}>{line || " "}</span>
      ))}
    </pre>
  );
}
