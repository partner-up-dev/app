# AGENTS.md for Frontend Components

This file is the global component entrypoint. Keep detailed primitive catalogs
and domain-specific component contracts in nearer `AGENTS.md` files.

## Global Rules

- Use the architecture rules in `src/ARCHITECTURE.md` for ownership.
- True cross-domain UI primitives live under `src/shared/ui/*`; read
  `src/shared/ui/AGENTS.md` before adding or extending one.
- Domain-owned UI belongs under `src/domains/<domain>/ui/*`; read the nearest
  domain `AGENTS.md` when it exists.
- Component and class naming follows `src/AGENTS.naming.md`.
- All component styling follows `src/styles/AGENTS.md`.
- Data fetching local rules live in `src/queries/AGENTS.md`.

## Data And Types

- Import backend-owned types from `@partner-up-dev/backend`; do not redeclare
  API return or entity shapes in components.
- Let Hono RPC client and Vue Query infer API return types where possible.
- In components, destructure Vue Query returns such as `data`, `isLoading`,
  and `error`.
- Prefer `async` / `await` over raw Promise chains.
- Do not use `any`.

## Preview Data Ownership

When a reusable domain component renders canonical facts for an entity, prefer
an id-based API and let the component own the canonical detail query. Callers may
provide caller-owned context such as route override, cover image, contextual time
label, analytics surface, or action slots.

Add snapshot or fallback props only when that fallback is an explicit product
contract with meaningful user-visible value.

## Splitting And State Ownership

- Split large Vue components along behavior ownership, not only template shape.
- Child components should own fully local interaction state, derived values,
  validation, and handlers.
- Parent surfaces should own cross-control flow, route coordination, backend
  query/mutation orchestration, analytics, and handoff behavior.
- Prefer explicit `v-model` / event contracts. Avoid child components that need
  sibling state or parent internals.
- When a child gathers draft input through a drawer, modal, picker, or editor,
  keep that draft state inside the child and emit the committed value.
- Keep backend-authoritative writes in the parent or a domain composable when
  writes affect cross-section flow, cache invalidation, routing, or telemetry.

## Component Index Locations

- Shared primitives: `src/shared/ui/AGENTS.md`
- Shared upload helpers: `src/shared/upload/AGENTS.md`
- PR UI: `src/domains/pr/ui/AGENTS.md`
- Event UI: `src/domains/event/ui/AGENTS.md`
- Route UI: `src/domains/route/ui/AGENTS.md`
- Location UI: `src/domains/location/ui/AGENTS.md`
- Share UI: `src/domains/share/ui/AGENTS.md`
