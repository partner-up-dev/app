# Targeted Browser/System diagnosis

Date: 2026-07-18

## Findings

| Candidate cause | Evidence | Conclusion |
| --- | --- | --- |
| Wrong project/config selector | `tests/scenario/vitest.config.ts` defines `test.name: "system-scenario"`; `vitest list --project system-scenario tests/scenario/pr/pr-create.scenario.test.ts` listed the target. | Not the cause. |
| Test title mismatch | The list output included `pr_create_form_requires_authentication_before_create` exactly. | Not the cause. |
| Missing Web/Backend availability | Global setup allocates temporary ports, creates/migrates a temporary Postgres database, then starts fake WeChat Pay, fake CaoCao, backend, and Vite frontend. A read-only probe connected to the configured Postgres endpoint (`127.0.0.1:5436`); an isolated setup/teardown probe completed all eleven checkpoints. | No availability defect observed. The long-lived repository Web dev server is not used by this scenario. |
| Missing Playwright browser | `pnpm exec playwright --version` reported 1.59.1 and `chromium.launch({ headless: true })` launched and closed in about 61 ms. | Not the cause. |
| Actual blocking test | With `DEBUG=pw:api`, the test navigated, filled the form, opened/cancelled the auth disclosure, closed the context/browser, and finished in 3.2 s. | No test block observed. |

## Reproduction result

The exact command, without an outer timeout, completed with:

```text
Test Files  1 passed (1)
Tests       1 passed | 2 skipped (3)
Duration    9.27s (transform 290ms, setup 321ms, import 804ms, tests 3.28s, environment 0ms)
```

This is the required final Vitest output; the targeted test passed. A preceding bounded invocation printed only the
Vitest startup banner and left a process chain (`timeout` -> `pnpm` -> `vitest` -> fork worker) running after the shell
wrapper returned. That explains why the caller saw no final result: the wrapper did not provide a reliable lifecycle or
captured completion for the child process. The retained process was terminated after inspection. Do not treat that
startup-only capture as a failing or hanging application test.

## Smallest correct interpretation

The project/title/configuration are correct and the Browser A test is healthy in this worktree. Run the command as a
direct, foreground command and wait for the Vitest summary. If a bounded diagnostic is required, bound the complete
process tree and inspect/clean descendants after termination; an outer timeout that only kills the launcher can mask
the result and leave Vitest workers behind.
