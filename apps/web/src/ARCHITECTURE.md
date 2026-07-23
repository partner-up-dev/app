# Frontend Architecture

## Purpose

This frontend uses a domain-first structure.

Repository-wide objective ordering, module construction and exception rules are owned by
[`docs/20-product-tdd/architecture-objectives-and-decision-rules.md`](../../../docs/20-product-tdd/architecture-objectives-and-decision-rules.md).
This file translates that constitution into Web ownership and dependency rules.

The goal is to keep three axes orthogonal:

- domain ownership
- technical responsibility
- UI composition depth

If a folder mixes those axes at the same level, boundary erosion follows quickly.

## Top-Level Semantics

### `src/app`

Owns application wiring only.

Examples:

- app bootstrapping
- router wiring
- provider setup
- app-level configuration

### `src/shared`

Owns cross-domain code with no single business owner.

Examples:

- generic UI primitives
- styling infrastructure
- browser/platform utilities
- user-telemetry collector, queue, and transport
- generic storage and URL helpers

`shared` must not own domain-specific business semantics.

### `src/domains`

Owns business modules by domain.

Examples:

- `domains/pr` (including Discovery and time-window policy surfaces)
- `domains/share`
- `domains/admin`
- `domains/analytics`
- `domains/auth`

Inside a domain, subfolders encode responsibility, not convenience.

Suggested subfolders:

- `model`
- `queries`
- `commands`
- `use-cases`
- `routing`
- `ui/surfaces`
- `ui/sections`
- `ui/composites`
- `ui/primitives`
- `adapters`

### `src/processes`

Owns cross-domain or platform workflows.

Examples:

- OAuth bootstrap
- session bootstrap
- other app-level workflows

Route-entry platform policy is still a process, not page behavior: app bootstrap installs it once before router
navigation, and a route metadata declaration is its only opt-in surface. An opted-in process may block navigation
until its lifecycle precondition is decided; after an awaited precondition it must revalidate that its navigation is
still current before any persisted or redirect side effect. Pages and domain queries must not duplicate its redirect
or bootstrap mechanics.

### `src/pages`

Owns route entrypoints only.

Pages compose domain UI and app/shared infrastructure. They do not own reusable business logic.

## Workflow, Transport And State Owners

| Owner | Responsibility | Must not own |
| --- | --- | --- |
| `lib/rpc` / `lib/admin-rpc` | Hono client construction, headers, token rotation and transport compatibility | domain decisions, navigation or UI state |
| domain `queries` / `commands` / `adapters` | endpoint invocation, inferred HTTP types, Problem Details mapping, Query cache and invalidation | page assembly or reusable UI interaction state |
| domain `use-cases` | one domain's user sequence, local orchestration, navigation intent and telemetry intent | raw page layout or a second server cache |
| `processes` | cross-domain or browser/platform lifecycle such as session, OAuth and route-share handoff | domain-owned eligibility or persistence truth |
| `pages` | route input, page context, assembly and page-level error aggregation | reusable business workflows or direct ordinary API operations |
| domain `ui` | presentation and local form/modal/selection interaction | durable truth or cross-page server cache ownership |

State follows the same owner rule:

- Router owns route state and navigation history.
- TanStack Query owns server-derived cache and invalidation.
- Domain workflow/UI owns the smallest local draft or interaction state that needs it.
- Browser storage owns only explicit continuity, attribution or pending-action protocols; it is not product truth.
- Backend canonical reads remain authoritative for durable entity facts and eligibility.

`domains/analytics` owns BI query adapters, applied/draft filter state,
presentation models, and dashboard surfaces. `domains/admin` supplies only the
shared operator access, scaffold, and navigation used by those route pages.
User-behavior event collection/queue/transport remains owner-neutral
infrastructure under `shared/telemetry`; it does not own BI meaning.

Instantiate a route workflow once at the narrowest route/domain owner and pass a cohesive view model plus explicit
actions downward. Do not coordinate a one-level parent/child relationship through a global store, broad
provide/inject bag or expanded component refs.

## Boundary Rules

### Ownership

- If a module name uses domain language, it should live under that domain.
- If a module is a true primitive, it may live under `shared/ui`.
- Convenience wrappers for one surface are not shared primitives.

### Dependency Direction

Preferred direction:

1. `app`, `pages`, `processes`
2. `domains`
3. `shared`

Within a domain:

1. `ui/surfaces` -> `ui/sections`, `ui/composites`, `use-cases`, `queries`, `model`
2. `ui/sections` -> `ui/composites`, `use-cases`, `queries`, `model`
3. `ui/composites` -> `ui/primitives`, `model`
4. `ui/primitives` -> `model` only when domain-owned
5. `use-cases` -> `queries`, `commands`, `model`, `shared`
6. `queries` / `commands` -> transport and shared infrastructure
7. `model` -> domain logic and generic shared helpers only

Forbidden:

- `shared` importing domain modules
- UI primitives importing query modules
- model modules importing Vue SFCs
- query modules importing page/widget modules
- model modules importing query adapters or raw RPC transport
- ordinary pages or domain UI invoking `client.api` / `adminClient.api` directly

## HTTP Contract Rules

- `AppType` and the Hono client remain the compile-time origin of request/response inference.
- Import a stable Backend value/input type only through `@partner-up-dev/backend/contracts` and only with
  `import type`. The package root remains for `AppType`; a root value-type import is a named migration
  compatibility edge, not a new default. Do not deep-import Backend implementation paths or turn a local UI model
  into a second HTTP DTO.
- Endpoint invocation stays in a domain query/command/adapter or an explicitly named platform compatibility seam.
- Do not create handwritten response DTO truth or cast around an inferred contract.
- Expected command failures use the shared Problem Details mapping; domain code branches on stable status/type/code,
  while pages/UI own placement and presentation.
- Query keys come from the central key registry rather than page-local arrays.

## Current Compatibility Windows

These are Current exceptions, not examples for new code:

- `pages/WeChatOAuthCallbackPage.vue` performs the OAuth callback exchange at the route boundary.
- `pages/BIEntryPage.vue` performs the current BI admin-session entry exchange.
- `domains/pr/ui/primitives/PRPreviewCard.vue` performs its canonical PR read by id under the focused PR UI contract.
- Historical model-to-query and model-to-RPC edges are captured by the architecture-fitness baseline and migrate
  through their owning slices; they must not widen.

Each exception must remain path-specific, keep its owner/reason/removal condition in the current task baseline,
and be re-reviewed when its surrounding workflow changes. File size, import-edge counts and SCCs remain review
signals rather than standalone reasons to reorganize working code.

## Classification Rules

### Shared Primitive

A shared primitive must satisfy all:

1. reusable across multiple domains or screens
2. stable API
3. no domain-specific copy, state model, or workflow assumptions
4. no dependence on query result types

`Button` can be shared. `SubmitButton` is usually a usage pattern, not a primitive.

### Domain UI

Domain UI belongs to the business area that gives it meaning.

Examples:

- PR hero header
- PR facts card
- PR Discovery surface
- PR time-window policy picker

### Use Case

A use case orchestrates a workflow.

Examples:

- join/exit PR
- PR creation flow
- share flow

### Server-Derived Stateful View Model

If UI state depends on temporal rules, policy windows, or backend-owned domain transitions, prefer a server-derived view model over recomputing the rules in page code.

Examples:

- partner participation availability
- deadline-driven CTA states
- status explanations that depend on participation and confirmation policy

### Model

A model module owns meaning transformation.

Examples:

- types
- selectors
- adapters
- formatting rules
- route/path helpers when domain-owned
