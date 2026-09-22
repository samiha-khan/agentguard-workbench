# AgentGuard Workbench

[![CI](https://github.com/samiha-khan/agentguard-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/samiha-khan/agentguard-workbench/actions/workflows/ci.yml)

**Live demo:** https://agentguard-69m4.onrender.com (free hosting, so the first load after a quiet period can take up to a minute)

AgentGuard reviews code changes produced with coding agents. It takes a task, its acceptance criteria, a Git diff, and the test result, then returns one of three outcomes: `PASS`, `REVIEW`, or `BLOCKED`.

I built it to explore a question I kept running into while using coding agents: once an agent finishes a change, what evidence should I check before accepting it? The first version focuses on checks that are predictable and easy to audit instead of asking another model to judge the code.

![AgentGuard Workbench showing a BLOCKED verdict with its findings and run history](docs/screenshot.png)

Paste a public GitHub pull request URL and AgentGuard fetches its diff and its latest check result directly from GitHub, no setup required. You can also paste a diff by hand, using the example buttons to see a clean change, a leaked key, an edited migration, and a failing test run. Every finding is listed with its severity, and every run is saved.

## How it works

1. Describe the task and the conditions that make it complete.
2. Paste the diff produced for the task.
3. Record whether the test suite passed.
4. Run the diff through the configured checks.
5. Save the result so previous runs can be reviewed later.

```mermaid
flowchart TD
  A[Task and acceptance criteria] --> B[Agent-generated diff]
  B --> C[Guardrail engine]
  C --> D{Decision}
  D -->|PASS| E[Ready for review]
  D -->|REVIEW| F[Human judgment]
  D -->|BLOCKED| G[Return to agent]
  E --> H[(MySQL audit trail)]
  F --> H
  G --> H
```

## Checks included

| Rule | Severity | Behavior |
|---|---|---|
| Secret scan | Blocker | Looks for credentials added directly to code |
| Protected path | Blocker | Stops changes to production infrastructure, migrations, or CI configuration |
| Test gate | Blocker | Stops the run when its test suite failed |
| Change size | Warning | Flags changes with more than 300 added lines |
| Test evidence | Warning | Flags a change when the diff contains no test file |

The checks are deterministic. The same input produces the same result, and every score deduction is shown in the response.

## Stack

- Java 17, Spring Boot, and Spring Data JPA
- MySQL with an H2 database for local development and tests
- React and TypeScript, built with Vite
- JUnit, MockMvc, and AssertJ on the backend; Vitest and Testing Library on the frontend
- Docker Compose and GitHub Actions

## Run locally

Backend:

```bash
mvn spring-boot:run
```

Frontend (second terminal):

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:8080`.

To run the API with MySQL instead of H2:

```bash
docker compose up --build
```

## API example

Evaluate a public GitHub pull request by URL. AgentGuard fetches its diff and its latest commit status from GitHub:

```bash
curl -X POST http://localhost:8080/api/evaluations/from-pr \
  -H 'Content-Type: application/json' \
  -d '{"prUrl": "https://github.com/spring-projects/spring-boot/pull/1"}'
```

Or evaluate a diff directly:

```bash
curl -X POST http://localhost:8080/api/evaluations \
  -H 'Content-Type: application/json' \
  -d '{
    "taskTitle": "Add learner progress card",
    "acceptanceCriteria": "Show progress; handle empty state; include tests",
    "diffText": "+++ b/ProgressCard.test.tsx\n+test(\"empty state\", () => {})",
    "testsPassed": true
  }'
```

`/from-pr` only accepts `https://github.com/owner/repo/pull/number` URLs, and only ever contacts `api.github.com`. Unauthenticated requests share GitHub's public rate limit (60/hour per IP); set `GITHUB_TOKEN` to a personal access token to raise that.

## Tests

```bash
mvn verify
cd frontend && npm test && npm run build
```

Backend (37 tests): every guardrail rule and its edge cases (removed lines are not flagged as added secrets, deleted protected files are caught, a test file is recognized by its path and not by the word "test"), the PASS / REVIEW / BLOCKED verdicts and scores, saving a run and reading it back, the 404 for an unknown run, request validation, the CORS allow-list, and the GitHub pull-request client (its diff/title/status parsing and its 400/404/502 error mapping, mocked with `MockRestServiceServer` so the suite never calls the real GitHub API).

Frontend (17 tests): the scorecard and its finding order, the highlighted diff, the history list, the example buttons, the pull-request form, a full submit-and-refresh flow for both the diff and pull-request paths, and the error paths for an unreachable, rejecting, or not-found API response.

The frontend reads its API address from `VITE_API_URL` and defaults to `http://localhost:8080`.

## Deploy a live demo

The Docker image builds the React app and serves it from the Spring Boot server, so the whole application is one service on one URL.

On Render, choose New, then Blueprint, and select this repository. `render.yaml` creates a free Docker web service, and the first build takes a few minutes. Any host that runs a Dockerfile works the same way.

The default H2 database lives in memory, so demo data resets whenever the service restarts. Set `DATABASE_URL`, `DATABASE_USER`, and `DATABASE_PASSWORD` to point at MySQL for persistence. Free instances sleep when idle, so the first request after a pause can take up to a minute. Run history is visible to everyone who opens the demo, so do not paste private code into it.

To run the same image locally, use `docker compose up --build` and open `http://localhost:8080`.

## Decisions and limitations

- Secret detection currently uses regular expressions. It is useful for obvious mistakes, but it does not replace a dedicated secret scanner.
- Test status for a pasted diff is supplied with the request; for a pull request it comes from GitHub's combined commit-status API, which is populated by most CI setups but not one that only publishes check runs with no matching status.
- JPA creates the local schema automatically. A deployed version should use versioned migrations.
- The score represents policy violations. It does not predict whether the code contains a bug.
- `/from-pr` only reads public repositories, since a private one needs the caller's own credentials, which this project does not collect or store.

## What I would add next

- Store policies in a repository configuration file, so protected paths and the size limit are per-repo instead of hard-coded.
- Add rules aimed specifically at agent-shaped mistakes, such as a diff that deletes or disables a test to make it pass.
- Compare acceptance criteria with changed behavior and report uncovered criteria.
- Add per-rule test datasets and regression metrics.
- Ship a GitHub Action so a pull request gets evaluated automatically, not just on request.

## License

MIT
