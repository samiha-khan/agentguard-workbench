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
    throw new Error(describeFailure(response.status));
  }
  return (await response.json()) as T;
}

function describeFailure(status: number): string {
  if (status === 400) return "The API rejected the request. Check that every field is filled in and within its length limit.";
  if (status === 404) return "That run could not be found.";
  return `The API returned an unexpected error (${status}).`;
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
