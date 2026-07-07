# Backend Scenario Tests

This folder contains backend scenario integration tests scheduled by the root Vitest `backend-scenario` project.

## Layout

```text
tests/
├── _infra/                 # business-agnostic test mechanics
└── pr-core/
    ├── _kit/               # PR Core domain test language
    └── *.scenario.test.ts  # executable PR Core scenarios
```

Dependency direction:

```text
Scenario Tests -> Domain Test Kit -> Core Test Infra
```

## Run

Prerequisites:

```bash
pnpm install --frozen-lockfile
docker compose up -d postgres
```

Canonical backend-suite command, from the repository root:

```bash
pnpm test:scenario:backend
```

The Vitest project setup loads `apps/web/.env` and `apps/backend/.env`, then creates the requested scenario runtime. Shell and CI environment variables have the highest priority; for backend scenario runs, `apps/backend/.env` has priority over `apps/web/.env` when both files define the same key.

Run all scenario suites:

```bash
pnpm test:scenario:all
```

If your local Docker compose uses a custom `POSTGRES_PORT`, put the matching `SCENARIO_DATABASE_ADMIN_URL` or `TEST_DATABASE_URL` in `apps/backend/.env`, or pass it in the shell environment before `pnpm test:scenario:backend`.

Internal package script: `@partner-up-dev/backend` exposes `test:scenario` as a package-local alias to the root Vitest `backend-scenario` project.

The backend scenario project creates a unique temporary database from `SCENARIO_DATABASE_ADMIN_URL`, maps it to `DATABASE_URL`, runs migrations, imports `*.scenario.test.ts`, closes backend DB clients after the test run, then drops the temporary database.

Full scenario records are written under `apps/backend/.result/scenario-records/` on failure. Terminal output stays compact and includes the artifact path.

Persistent debug database mode:

```bash
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/partnerup_scenario pnpm test:scenario:backend
```

`TEST_DATABASE_URL` and `SCENARIO_DATABASE_ADMIN_URL` are alternatives. `TEST_DATABASE_URL` has priority when both are set. In that mode the runner resets the schema inside the named database and leaves the database itself in place.

## Authoring Rule

- Use builders for `Given`.
- Use HTTP actions for `When`.
- Use probes for `Actual`.
- Use assertions for `Then`.
- Keep load-bearing business facts explicit in scenario files.
- Import production domain types and schemas where practical.
- Update scenario expectations only when PRD/Product TDD semantics changed or an old test expectation was wrong.
