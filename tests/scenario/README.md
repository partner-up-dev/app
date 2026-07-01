# System Scenario Tests

This folder contains cross-unit scenario tests for PartnerUp.

System scenario tests verify a user-visible workflow through:

```text
Playwright browser -> Vite frontend -> real backend HTTP -> temporary Postgres
```

They are root-owned because they coordinate both technical units:

- `apps/frontend`: route rendering, browser workflow orchestration, local session state
- `apps/backend`: HTTP API, auth/session handling, domain transitions, persistence

## Layout

```text
tests/scenario/
├── _infra/                 # cross-unit test mechanics
└── pr-core/                # PR lifecycle system scenarios
```

Dependency direction:

```text
System Scenario -> System Infra -> App Units
System Scenario -> Backend Scenario Kit for Given setup
```

## Run

Prerequisites:

```bash
pnpm install --frozen-lockfile
docker compose up -d postgres
```

Run only system scenarios from the repository root:

```bash
pnpm test:scenario:system
```

Run all scenario suites:

```bash
pnpm test:scenario:all
```

The root Vitest `system-scenario` project loads `apps/frontend/.env` and `apps/backend/.env`. Shell and CI
environment variables have the highest priority. Backend `.env` values override
frontend `.env` values when both files define the same key.

Database modes match backend scenario tests:

```bash
SCENARIO_DATABASE_ADMIN_URL=postgresql://postgres:postgres@localhost:5432/postgres pnpm test:scenario:system
```

```bash
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/partnerup_scenario pnpm test:scenario:system
```

`SCENARIO_DATABASE_ADMIN_URL` creates and drops a unique temporary database.
`TEST_DATABASE_URL` resets the schema inside the named database and leaves the
database in place.

Scenario database preparation explicitly uses
`PARTNERUP_ENVIRONMENT=staging`. Do not rely on development-only data
migrations for scenario fixtures.

Use headed browser mode for local diagnosis:

```bash
HEADED=true pnpm test:scenario:system
```

## Authoring Rule

- Use backend scenario builders for `Given` setup when they already express the business state.
- Use browser actions for `When`.
- Use user-visible assertions for the minimal `Then`.
- Add backend probes only when the scenario needs to prove persistence or hidden side effects.
- Stub non-essential external-adjacent sidecars, such as share text and LLM media generation, inside the browser test when they are not part of the target journey.
- Keep one scenario focused on one user journey.
- Use `data-testid` for stable scenario-owned semantic nodes on user journeys.
- Prefer names shaped as `<route>.<journey>.<node>`, for example `pr-detail.join.open`.
- Put `data-testid` on the real interactive element when the node is an action.
- Use role, label, and visible text for supplementary assertions that intentionally track user-facing copy.

Current PR detail coverage:

- `pr-core/pr-create.scenario.test.ts`: covers structured form draft creation
  for anonymous users and published PR creation for authenticated users.
- `pr-core/pr-detail-join.scenario.test.ts`: a joiner opens a PR detail page,
  joins through the fallback confirmation gate, and reaches the post-join
  confirm action.
- `pr-core/pr-detail-participation.scenario.test.ts`: covers Join Notice
  join gate, participant confirmation, and waitlist promotion after an active
  participant exits.
