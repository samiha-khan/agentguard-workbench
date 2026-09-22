import { FormEvent, useState } from "react";

const EXAMPLE_URL = "https://github.com/spring-projects/spring-boot/pull/1";

type Props = { loading: boolean; onSubmit: (prUrl: string) => void };

export function PrForm({ loading, onSubmit }: Props) {
  const [prUrl, setPrUrl] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(prUrl.trim());
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Pull request URL
        <span className="field-hint">
          A public GitHub PR, for example <code>{EXAMPLE_URL}</code>. AgentGuard reads its diff and its latest
          check result directly from GitHub.
        </span>
        <input
          name="prUrl"
          type="url"
          required
          placeholder={EXAMPLE_URL}
          value={prUrl}
          onChange={(event) => setPrUrl(event.target.value)}
        />
      </label>
      <button className="primary" disabled={loading}>{loading ? "Fetching from GitHub…" : "Evaluate pull request"}</button>
    </form>
  );
}
