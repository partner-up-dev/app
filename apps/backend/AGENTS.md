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

Repository-wide architecture objectives, module construction and exception rules are owned by
[`docs/20-product-tdd/architecture-objectives-and-decision-rules.md`](../../docs/20-product-tdd/architecture-objectives-and-decision-rules.md).

```text
Controller  ──►  Domain Use Case  ──►  Domain Service  ──►  Repository  ──►  Entity
                           │
                           ├──►  Job Runner
                           ├──►  Operation Log Service
                           └──►  Telemetry / Analytics
```

Background tasks are managed by a DB-backed JobRunner (delayed jobs plus due-job claiming). In scale-to-0 serverless, execution is driven by internal tick endpoints and request-tail best-effort kicks instead of in-process intervals.

### Domain Public Surfaces

Target rule: another domain may consume only a curated owner surface containing:

1. commands;
2. canonical queries/read projections;
3. stable contracts, value types and problem codes;
4. events/ports when a real async, transaction, replacement or provider boundary exists.

Repositories, entities/Drizzle rows, internal services, test kits and transport adapters are not cross-domain
APIs. Put new public symbols in the owning domain root `index.ts` or a category-named root entrypoint
(`commands.ts`, `queries.ts`, `contracts.ts`, `events.ts`, or `ports.ts`); do not use wildcard barrels to make
internal paths convenient for callers.

Controllers consume domain commands/queries/contracts and remain protocol conversion only. A controller must not
start a new direct repository or cross-domain internal-service dependency. A domain may use its own persistence
internals; another domain must ask through the owner's public surface.

Current compatibility windows are baselined rather than described as compliant architecture:

- `src/domains/pr` is the canonical PR surface while `src/domains/pr-core` still contains lifecycle implementation;
  `pr-core` gains no new consumers and retires through the named migration slice.
- Existing controller-to-repository and cross-domain deep imports are architecture-fitness findings. They migrate
  with their owning behavior slices and do not authorize another edge.
- Exceptions stay path-specific and record owner, reason, removal condition and verification; do not widen an
  allowlist to make a rule pass.

## File Structure

```text
src/
├── entities/             # Drizzle schema definitions
├── repositories/         # Data access layer (pure CRUD)
├── services/             # Legacy service facades and integration-oriented services
├── domains/
│   ├── pr/               # Canonical PR surface, reads, messages and sharing
│   ├── pr-core/          # PR lifecycle compatibility implementation; no new consumers
│   ├── pr-authoring/     # Authoring options and handoff
│   ├── pr-discovery/     # Catalog, view, directory and recommendation reads
│   └── admin-pr-type-config/ # Current operator adapter for PR Type Configuration
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

Follow root `AGENTS.md` for request routing, typed input classification, and durable doc ownership.

Backend-local entrypoints:

- `docs/30-unit-tdd/backend-migration-ledger.md` for migration ledger, prefix, environment, seed, and reset rules.
- `docs/30-unit-tdd/wechat-oauth-handoff.md` before changing WeChat OAuth callback, handoff cookie, or callback redirect behavior.
- `src/entities/AGENTS.md`
- `src/repositories/AGENTS.md`
- `src/controllers/AGENTS.md`
- `src/services/AGENTS.md`
- active task-local packet under `tasks/` for volatile implementation state.

## Development Guidelines

- Entity layer (`src/entities`): schema and boundary validation ownership; see `src/entities/AGENTS.md`.
- Repository layer (`src/repositories`): pure CRUD only; see `src/repositories/AGENTS.md`.
- Domain use-cases (`src/domains/*/use-cases`): new business actions should be added here directly rather than through `src/services` facades.
- Domain services (`src/domains/*/services`): domain rules and reusable domain logic belong here.
- Controller layer (`src/controllers`): protocol conversion only; see `src/controllers/AGENTS.md`.
- Infra layer (`src/infra`): job runner, telemetry ingest, analytics read/export queries, notifications, and operation log.
- Unit tests under `src/**/*.test.ts` cover local rules, pure domain services, schema/bounds logic, and isolated error mapping. Scenario tests under `tests/<domain>/**/*.scenario.test.ts` cover cross-module behavior through HTTP APIs with real Postgres migrations, especially persisted state transitions, route/controller/use-case/repository coordination, and user-visible business promises.
- `pnpm check:lint:backend` is the canonical backend source lint slice.
- The backend API error contract is enforced by the canonical lint slices: Oxlint rejects imports from `hono/http-exception` (with `src/index.ts` as the compatibility adapter exception), while ast-grep rejects `new HTTPException(...)` in backend production source. Expected API failures should use Problem Details helpers from `src/lib/problem-details.ts` or typed domain helpers built on them.
- `pnpm check:type:backend`, `pnpm check:config:backend`, and `pnpm check:build:backend` are the canonical backend type, DB/config, and build-reachability slices used by CI.
- Backend scenario verification should be launched from the repository root with `pnpm test:scenario:backend`. The Vitest project setup loads workspace `.env` files and owns scenario database setup, migration, and cleanup.
- Better not use intervals or in-process background jobs; the backend runs in scale-to-0 serverless.

## Database Workflow

For the full local ledger model, read `docs/30-unit-tdd/backend-migration-ledger.md`.

Immediate rules:

- Use `pnpm db:next-migration <drizzle|data-migrations>` before creating a migration.
- Run `pnpm db:lint` when migration or seed files change.
- Run `pnpm db:check` when generated Drizzle schema SQL changes.
- Use `pnpm db:migrate:dev` or `pnpm db:reset:dev` for development-only data migrations; do not hand-type the environment variable for routine local work.
- Staging and production are forward-only. Do not add reset logic or environment-specific migration folders.

## Best Practice Checklist

1. Strict typing: any `c.req.param()` or `c.req.json()` must be validated via `zValidator`.
2. No logic in controllers: controllers only do HTTP and protocol conversion; domain logic lives in domain use-cases and domain services.
3. JSON response: always return via `c.json()` so RPC can infer types.
4. Error handling: use global `app.onError` to unify error response shapes; throw expected API failures through Problem Details helpers or typed domain helpers.
5. Side effects: durable async work should use explicit job scheduling or domain-specific services with persisted state.
6. Operation logs: use `operationLogService.log()` (fire-and-forget) for audit trail on domain actions.
7. Background jobs: persist delayed jobs through `jobRunner.scheduleOnce()` and drive execution via tick endpoints or request-tail kick; never use raw `setInterval`.
