# Test Platform

## Role

The repository test platform is a cross-unit technical substrate. It must make
backend-local, frontend-local, backend scenario, and root-owned system scenario
verification discoverable through one runner model while preserving each test
layer's runtime authority.

## Target Runner Contract

- Vitest v4 is the primary test runner and reporting surface.
- Test execution is organized as Vitest projects:
  - `backend-unit`
  - `frontend-unit`
  - `backend-scenario`
  - `system-scenario`
- Vitest owns discovery, filtering, project scheduling, default reporter output,
  and machine-readable CI artifacts.
- The root `vitest.config.ts` owns project orchestration only. It must not load
  unit-specific Vite plugins, browser transforms, package aliases, CSS
  preprocessors, or design-system runtime styling.
- Project-specific Vitest config files own their unit's toolchain:
  - backend projects are Node-only and must not load frontend-only dependencies
    such as Vue plugins, JSONC loaders, UnoCSS, Sass, or
    `@partner-up-dev/design-web`
  - the frontend project owns Vue plugin setup, JSONC loading, frontend aliases,
    and `@partner-up-dev/design-web` Sass `additionalData`
  - the system scenario project owns only the cross-unit test runner contract;
    frontend and backend servers are started by scenario runtime infra
- Backend-only test commands use `vitest.backend.config.ts`, which may only
  orchestrate backend projects and shared reporter settings. This keeps backend
  CI compatible with backend-only dependency installs and prevents frontend
  project config initialization in backend gates.
- Unit tests run in the Node environment during the first migration. Frontend
  unit tests do not require `happy-dom` or `jsdom` unless a later component-test
  slice introduces a browser-like environment.
- Playwright remains the browser automation engine for root-owned system
  scenarios.

## Scenario Runtime Contract

Backend scenario tests verify backend behavior through HTTP-facing scenario
helpers and an isolated Postgres state.

System scenario tests verify user journeys through:

```text
Playwright browser -> Vite frontend -> real backend HTTP -> isolated Postgres
```

Scenario runtime ownership stays outside Vitest's assertion API:

- scenario infra owns temporary database creation, migration, and cleanup
- system scenario infra owns backend server and Vite frontend server startup
- Playwright helpers own browser context and page behavior
- domain scenario kits own builders, actions, probes, and business language
- scenario helpers own `ctx.record()` diagnostic context

Vitest project lifecycle owns when those runtime fixtures are started and
stopped.

## Scenario Scheduling Contract

Scenario projects run serially by default because their runtime fixtures are
shared within a project run.

Required scenario project constraints:

- `fileParallelism: false`
- `maxWorkers: 1`
- `isolate: false`

Project `globalSetup` owns project-level resources such as database setup,
migrations, backend server startup, and Vite server startup. Worker-owned
objects, especially Playwright browser singletons, are cleaned up from
worker-side lifecycle.

## Reporter And Artifact Contract

- The default terminal reporter should be compact enough for human and agent
  workflows.
- Full success logs should not be printed to the terminal by default.
- Failure output should include failing project, file, test name, assertion
  detail, compact scenario context, and a path to detailed artifacts.
- Detailed outputs live under each package or suite `.result` directory:
  - `apps/backend/.result/`
  - `apps/frontend/.result/`
  - `tests/scenario/.result/`
- CI may publish JSON or JUnit outputs from those `.result` directories.

Scenario records should be persisted as artifact JSON. Terminal output should
show only bounded context and the artifact path.

## Cutover Contract

The migration intentionally cuts over commands to the Vitest-backed shape rather
than preserving the old runner commands as long-term compatibility aliases.

Durable docs may describe this target platform before every package command has
been cut over, but operational docs and CI command references must reflect the
commands that are actually live on the current branch.
