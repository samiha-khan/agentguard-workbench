import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const evaluation = {
  id: 3,
  score: 100,
  verdict: "PASS",
  createdAt: "2026-09-19T21:00:00Z",
  findings: [{ rule: "test-gate", severity: "INFO", message: "The submitted test suite passed." }],
};
const summary = { id: 3, taskTitle: "Add learner progress card", score: 100, verdict: "PASS", createdAt: evaluation.createdAt };

function json(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

function switchToDiffTab() {
  fireEvent.click(screen.getByRole("tab", { name: "Paste a diff" }));
}

describe("App: pull request tab (the default view)", () => {
  it("evaluates a pull request by URL and refreshes the history", async () => {
    let saved = false;
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        saved = true;
        return json(evaluation, 201);
      }
      return json(saved ? [summary] : []);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await screen.findByText(/No runs yet/);
    fireEvent.change(screen.getByLabelText(/Pull request URL/), {
      target: { value: "https://github.com/acme/widgets/pull/7" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Evaluate pull request" }));

    expect(await screen.findByText("PASS", { selector: "strong" })).toBeTruthy();
    expect(await screen.findByText("Add learner progress card", { selector: ".title" })).toBeTruthy();
    expect(screen.getByText("View the pull request on GitHub ↗").closest("a")).toHaveProperty(
      "href",
      "https://github.com/acme/widgets/pull/7",
    );

    const post = fetchMock.mock.calls.find(([url, init]) => init?.method === "POST" && String(url).includes("from-pr"))!;
    expect(JSON.parse(String(post[1]!.body))).toEqual({ prUrl: "https://github.com/acme/widgets/pull/7" });
  });

  it("shows the message GitHub-related failures come back with", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) =>
        init?.method === "POST"
          ? json({ error: "GitHub has no pull request at that URL" }, 404)
          : json([]),
      ),
    );

    render(<App />);
    await screen.findByText(/No runs yet/);
    fireEvent.change(screen.getByLabelText(/Pull request URL/), {
      target: { value: "https://github.com/acme/widgets/pull/999" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Evaluate pull request" }));

    expect((await screen.findByRole("alert")).textContent).toContain("no pull request");
  });
});

describe("App: diff tab", () => {
  it("submits a change, shows its scorecard, and refreshes the history", async () => {
    let saved = false;
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        saved = true;
        return json(evaluation, 201);
      }
      return json(saved ? [summary] : []);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await screen.findByText(/No runs yet/);
    switchToDiffTab();
    fireEvent.click(screen.getByRole("button", { name: "Evaluate change" }));

    expect(await screen.findByText("PASS", { selector: "strong" })).toBeTruthy();
    expect(await screen.findByText("Add learner progress card", { selector: ".title" })).toBeTruthy();

    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    const body = JSON.parse(String(post[1]!.body));
    expect(body.taskTitle).toBe("Add learner progress card");
    expect(body.testsPassed).toBe(true);
  });

  it("shows an error and re-enables the button when the API is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))));

    render(<App />);
    switchToDiffTab();
    const button = screen.getByRole("button", { name: "Evaluate change" }) as HTMLButtonElement;
    fireEvent.click(button);

    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(screen.getAllByRole("alert")[0].textContent).toContain("Could not reach the API");
    await waitFor(() => expect(button.disabled).toBe(false));
  });

  it("explains a rejected request", async () => {
    vi.stubGlobal("fetch", vi.fn((_url: string, init?: RequestInit) =>
      init?.method === "POST" ? json({}, 400) : json([])));

    render(<App />);
    await screen.findByText(/No runs yet/);
    switchToDiffTab();
    fireEvent.click(screen.getByRole("button", { name: "Evaluate change" }));

    expect((await screen.findByRole("alert")).textContent).toContain("rejected the request");
  });

  it("opens an earlier run from the history list", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) =>
      url.endsWith("/3") ? json(evaluation) : json([summary])));

    render(<App />);
    fireEvent.click(await screen.findByText("Add learner progress card", { selector: ".title" }));

    expect(await screen.findByText("Run #3", { exact: false })).toBeTruthy();
  });

  it("puts an example into the form", async () => {
    vi.stubGlobal("fetch", vi.fn(() => json([])));

    render(<App />);
    await screen.findByText(/No runs yet/);
    switchToDiffTab();
    fireEvent.click(screen.getByRole("button", { name: "Leaked key" }));

    expect((screen.getByLabelText(/Agent diff/) as HTMLTextAreaElement).value).toContain("API_KEY");
  });

  it("sends the failing-tests example with the tests unchecked", async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
      init?.method === "POST" ? json(evaluation, 201) : json([]));
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    await screen.findByText(/No runs yet/);
    switchToDiffTab();
    fireEvent.click(screen.getByRole("button", { name: "Failing tests" }));
    fireEvent.click(screen.getByRole("button", { name: "Evaluate change" }));

    await screen.findByText("Run #3", { exact: false });
    const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!;
    expect(JSON.parse(String(post[1]!.body)).testsPassed).toBe(false);
  });
});
