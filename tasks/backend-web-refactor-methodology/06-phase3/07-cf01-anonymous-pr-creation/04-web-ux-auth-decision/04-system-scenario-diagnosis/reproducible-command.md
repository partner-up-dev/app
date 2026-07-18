# Reproducible command

Run from the repository root, with no extra project selector or ad-hoc server:

```bash
pnpm exec vitest run \
  --project system-scenario \
  tests/scenario/pr/pr-create.scenario.test.ts \
  -t 'pr_create_form_requires_authentication_before_create'
```

Expected completion evidence (observed 2026-07-18):

```text
Test Files  1 passed (1)
Tests       1 passed | 2 skipped (3)
```

Useful read-only selector check:

```bash
pnpm exec vitest list \
  --project system-scenario \
  tests/scenario/pr/pr-create.scenario.test.ts
```

It lists the target title plus the two authenticated PR-create titles. For browser progress diagnostics, prepend
`DEBUG=pw:api` (this does not change test behavior). The scenario global setup owns temporary database/server
lifecycle; do not start raw duplicate Web/Backend servers before running it.
