# Phase 3 Target State

## Decision 1 — Domain Topology

- Keep two technical units: Backend and Web. Backend remains a modular monolith.
- Treat PR as one business context with explicit modules: Lifecycle, PR Type Configuration, Authoring and
  Discovery. Messaging/sharing remain PR capabilities unless later evidence proves independent ownership.
- PR Type Configuration owns current type policy. Admin is an operator adapter, not the policy owner.
- Authoring prepares transient input and calls the ordinary PR command; Discovery reads/ranks canonical PRs
  and never creates synthetic PR state.
- POI and Feedback Questionnaire remain independent owners.
- Commerce preserves Merchandising, Trade, Fulfillment, Bill, Payment and provider-specific Ride Hailing
  authority. A generic `ecommerce` orchestration dumping ground is forbidden.
- Anchor Event is retired; no target slice restores its identity, route or persistence.

## Decision 2 — Backend Public Surface

Each domain public surface may expose only:

1. commands;
2. canonical queries/read projections;
3. stable contract/value types and problem codes;
4. events/ports when a real async or provider boundary exists.

Controllers own auth, validation and HTTP mapping. Internal services, repositories and Drizzle schema are not
cross-domain APIs. Persistence adapters move behind their owner incrementally; interfaces are introduced only
for a real replacement, transaction or provider seam. `domains/pr` becomes canonical; `pr-core` and
`PartnerRequestService` have an explicit compatibility window and no new consumers.

## Decision 3 — Web Workflow And API Boundary

| Owner | Responsibility |
| --- | --- |
| `lib/rpc` / `admin-rpc` | Hono transport, headers, token rotation, raw client construction |
| domain query/command adapter | endpoint invocation, inferred types, Problem Details, Query cache/invalidation |
| domain use-case/workflow | user sequence, local orchestration, navigation, telemetry, pending/replay |
| `processes` | cross-domain OAuth/session/share lifecycle |
| page | route parsing, page context, assembly and page-level error aggregation |
| domain UI | local form/modal/selection state and presentation |

Raw `client.api` is forbidden in ordinary pages/components. OAuth callback and other compatibility seams require
an explicit allowlist and owner. TanStack Query owns server cache; route state belongs to Router; local drafts
remain closest to their UI/workflow and do not become a second durable truth.

## Cross-unit Contract Decision

- Retain `AppType`; do not create a handwritten DTO package or universal API wrapper.
- Narrow selected stable Web-facing types behind a types-only contract surface after domain public surfaces
  stabilize. Runtime output validation is not implied by TypeScript inference.
- Expected failures remain Problem Details; Web branches on status/code, Backend owns detail text.
- Session rotation remains `x-access-token`/explicit auth endpoints; domain response bodies do not synchronize
  session state.

## Rejected Alternatives

- Big-bang directory rewrite, microservice split or universal DI/service layer.
- Restoring Anchor Event because an old task snapshot still mentions it.
- Pinia/global store as server truth, caller snapshots replacing canonical reads, or automatic DTO duplication.
- File-size or cycle counts as standalone acceptance gates.
