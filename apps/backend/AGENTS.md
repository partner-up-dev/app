# AGENTS.md of PartnerUp MVP-HA (Backend)

This file stays backend-operational only. Root request routing, typed input classification, and mode selection are owned by the repository root `AGENTS.md` plus `docs/00-meta/`.

## Tech Stacks

- Runtime: Node.js
- Framework: Hono (v4+)
- ORM: Drizzle ORM
- Validation: Zod + `@hono/zod-validator`
- AI: Vercel AI SDK
- Build: tsup (bundled ESM output to `dist/`)

## Architecture

The backend uses a domain-oriented layered architecture:

```text
Controller  ──►  Domain Use Case  ──►  Domain Service  ──►  Repository  ──►  Entity
                           │
                           ├──►  Job Runner
                           ├──►  Operation Log Service
                           └──►  Telemetry / Analytics
```

Background tasks are managed by a DB-backed JobRunner (delayed jobs plus due-job claiming). In scale-to-0 serverless, execution is driven by internal tick endpoints and request-tail best-effort kicks instead of in-process intervals.

## File Structure

```text
src/
├── entities/             # Drizzle schema definitions
├── repositories/         # Data access layer (pure CRUD)
├── services/             # Legacy service facades and integration-oriented services
├── domains/
│   └── pr-core/          # PartnerRequest lifecycle domain
│       ├── use-cases/    # One function per business action
│       ├── services/     # Domain services
│       ├── services/pr-read.service.ts
│       └── temporal-refresh.ts
├── infra/
│   ├── jobs/             # Unified JobRunner
│   ├── telemetry/        # Raw telemetry event ingestion
│   ├── analytics/        # Product analytics read/export queries
│   └── operation-log/    # Operation log service
├── controllers/          # Hono routes + validation (no business logic)
├── lib/                  # DB engine + utilities
└── index.ts              # Entrypoint, mounts routes, request-tail maintenance, exports AppType
tests/
├── _infra/               # Business-agnostic scenario test mechanics
└── <domain>/
    ├── _kit/             # Domain test language: builders, actions, probes, assertions
    └── *.scenario.test.ts
```

## Documents

Read the smallest useful set and keep durable docs current:

- Root route and mode guidance: `AGENTS.md`, then `docs/00-meta/*`
- Product truth: `docs/10-prd/**/*.md`
- Cross-unit technical truth: `docs/20-product-tdd/*.md`
- Runtime and rollout truth: `docs/40-deployment/*.md`
- `docs/30-unit-tdd/<unit>/*.md` only when a named hard-unit doc exists and is relevant
- Active task-local packets, evidence, and temporary reasoning: `tasks/*`
- Local backend constraints:
  - `src/entities/AGENTS.md`
  - `src/repositories/AGENTS.md`
  - `src/controllers/AGENTS.md`
  - `src/services/AGENTS.md`

## Development Guidelines

- Entity layer (`src/entities`): schema and boundary validation ownership; see `src/entities/AGENTS.md`.
- Repository layer (`src/repositories`): pure CRUD only; see `src/repositories/AGENTS.md`.
- Domain use-cases (`src/domains/*/use-cases`): new business actions should be added here directly rather than through `src/services` facades.
- Domain services (`src/domains/*/services`): domain rules and reusable domain logic belong here.
- Controller layer (`src/controllers`): protocol conversion only; see `src/controllers/AGENTS.md`.
- Infra layer (`src/infra`): job runner, telemetry ingest, analytics read/export queries, notifications, and operation log.
- Unit tests under `src/**/*.test.ts` cover local rules, pure domain services, schema/bounds logic, and isolated error mapping. Scenario tests under `tests/<domain>/**/*.scenario.test.ts` cover cross-module behavior through HTTP APIs with real Postgres migrations, especially persisted state transitions, route/controller/use-case/repository coordination, and user-visible business promises.
- `pnpm check:lint:backend` is the canonical backend source lint slice.
- `pnpm lint:problem-details` enforces the backend API error contract in production source. Expected API failures should use Problem Details helpers from `src/lib/problem-details.ts` or typed domain helpers built on them. `src/index.ts` is the compatibility adapter that may read Hono `HTTPException` and normalize it into Problem Details.
- `pnpm check:type:backend`, `pnpm check:config:backend`, and `pnpm check:build:backend` are the canonical backend type, DB/config, and build-reachability slices used by CI.
- Backend scenario verification should be launched from the repository root with `pnpm test:scenario:backend`. The Vitest project setup loads workspace `.env` files and owns scenario database setup, migration, and cleanup.
- Better not use intervals or in-process background jobs; the backend runs in scale-to-0 serverless.

## Database Workflow

- Drizzle remains the schema source of truth. Generated schema SQL lives in `drizzle/`.
- Hand-authored forward-only data migrations live in `data-migrations/`.
- `pnpm db:migrate` runs the custom migration runner and records applied schema and data migrations in `app_migrations`.
- CI/CD deploys and invokes a dedicated FC migration function inside the VPC, but it still calls the same migration runner as `pnpm db:migrate`.
- `pnpm db:lint` validates migration and seed file naming plus transaction-mode rules before deploy.
- `pnpm db:check` runs `drizzle-kit check`; it complements but does not replace repo-owned migration/seed lint.
- `pnpm db:next-migration <drizzle|data-migrations>` prints the next global numeric prefix shared by both migration folders.
- `pnpm db:reset` is local-only. It drops and recreates the local database, applies all migrations, then runs seeds.
- `pnpm db:seed` reruns all files in `seeds/`, so every seed file must be idempotent.
- If a migration file contains `CONCURRENTLY`, it must include `-- migration: no-transaction`.
- Staging and production are forward-only. Do not add reset logic or env-specific migration folders.
- Production schema changes should follow expand / backfill / contract discipline.

## Best Practice Checklist

1. Strict typing: any `c.req.param()` or `c.req.json()` must be validated via `zValidator`.
2. No logic in controllers: controllers only do HTTP and protocol conversion; domain logic lives in domain use-cases and domain services.
3. JSON response: always return via `c.json()` so RPC can infer types.
4. Error handling: use global `app.onError` to unify error response shapes; throw expected API failures through Problem Details helpers or typed domain helpers.
5. Side effects: durable async work should use explicit job scheduling or domain-specific services with persisted state.
6. Operation logs: use `operationLogService.log()` (fire-and-forget) for audit trail on domain actions.
7. Background jobs: persist delayed jobs through `jobRunner.scheduleOnce()` and drive execution via tick endpoints or request-tail kick; never use raw `setInterval`.

## Product And Runtime Truth Sources

Keep this file operational and avoid using it as a feature-state mirror.

For durable truth, use:

- Product what/why, workflows, rules, and business vocabulary: `docs/10-prd/**/*.md`
- Cross-unit technical truth and contracts: `docs/20-product-tdd/*.md`
- Runtime and rollout truth: `docs/40-deployment/*.md`

For volatile implementation status or migration notes:

- record them in active `tasks/<task>/` packets as task-local workspace state
- keep this file limited to stable backend operating guidance
