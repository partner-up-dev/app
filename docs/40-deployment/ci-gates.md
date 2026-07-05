# CI Gates

## CI Validation Gates

Hosted PR validation is split by gate owner:

- backend gate: `.github/workflows/backend-gate.yml`; backend typecheck,
  backend unit tests, DB artifact lint, and backend scenario tests
- frontend gate: `.github/workflows/frontend-gate.yml`; frontend unit tests,
  frontend build, and frontend-owned static quality checks
- E2E gate: `.github/workflows/e2e-gate.yml`; root-owned system scenario tests
  through `pnpm test:scenario:system`

Backend and frontend gates run for PRs targeting `develop` or `master` when
their owned surfaces or workspace install inputs change.

## Install Boundaries

Install boundaries follow gate ownership:

- backend-only gates install the backend dependency graph instead of the whole
  frontend workspace graph; they must not require GitHub Packages credentials
  for frontend-only packages such as `@partner-up-dev/design-web`
- backend gate installs root test tooling plus the backend dependency graph
  through
  `pnpm --filter . --filter @partner-up-dev/backend... install --frozen-lockfile`
- frontend and E2E gates may install the full workspace graph because they
  build or execute the frontend; they require GitHub Packages read auth through
  `NODE_AUTH_TOKEN`

E2E gate runs for PRs targeting `master`. It is also available through
`workflow_dispatch` for release qualification and diagnosis. The E2E gate uses
GitHub Actions Postgres service state via `SCENARIO_DATABASE_ADMIN_URL`,
installs Chromium through Playwright, and lets the system scenario Vitest
project start the Vite frontend server, backend HTTP server, and isolated
temporary database.

## DB Artifact Validation

PR validation workflow: `.github/workflows/backend-db-validate.yml`

This workflow:

1. installs the backend dependency graph with
   `pnpm --filter @partner-up-dev/backend... install --frozen-lockfile`
2. runs `pnpm --filter @partner-up-dev/backend db:lint`
3. regenerates Drizzle SQL artifacts
4. fails on artifact drift under `apps/backend/drizzle` and
   `apps/backend/drizzle/meta`
