export type Severity = "INFO" | "WARNING" | "BLOCKER";
export type Verdict = "PASS" | "REVIEW" | "BLOCKED";

export type Finding = { rule: string; severity: Severity; message: string };

export type EvaluationInput = {
  taskTitle: string;
  acceptanceCriteria: string;
  diffText: string;
  testsPassed: boolean;
};

export type Evaluation = {
  id: number;
  score: number;
  verdict: Verdict;
  findings: Finding[];
  createdAt: string;
};

export type RunSummary = {
  id: number;
  taskTitle: string;
  score: number;
  verdict: Verdict;
  createdAt: string;
};

const BASE_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/evaluations${path}`, init);
  } catch {
    throw new Error(`Could not reach the API${BASE_URL ? ` at ${BASE_URL}` : ""}. Is the backend running?`);
  }
  if (!response.ok) {
    throw new Error(await describeFailure(response));
  }
  return (await response.json()) as T;
}

async function describeFailure(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string" && body.error) {
      return body.error;
    }
  } catch {
    // The body wasn't JSON; fall through to a generic message for the status code.
  }
  if (response.status === 400) return "The API rejected the request. Check that every field is filled in and within its length limit.";
  if (response.status === 404) return "That could not be found.";
  if (response.status === 502) return "GitHub could not be reached. Try again in a moment.";
  return `The API returned an unexpected error (${response.status}).`;
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function submitEvaluation(input: EvaluationInput): Promise<Evaluation> {
  return request<Evaluation>("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function fetchHistory(): Promise<RunSummary[]> {
  return request<RunSummary[]>("");
}

export function fetchRun(id: number): Promise<Evaluation> {
  return request<Evaluation>(`/${id}`);
}

export function evaluatePullRequest(prUrl: string): Promise<Evaluation> {
  return request<Evaluation>("/from-pr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prUrl }),
  });
}
