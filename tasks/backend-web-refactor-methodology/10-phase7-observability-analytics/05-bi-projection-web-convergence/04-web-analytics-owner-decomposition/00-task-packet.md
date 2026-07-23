# `7-4D` — Web Analytics Owner Decomposition

## Status

**Complete on 2026-07-23.** `domains/analytics` now owns query adapters,
filter/presentation models, use cases, and the three dashboard surfaces.
Three thin pages compose the Admin shell; the former Admin-owned query module
and 1,206-line route-switching page are deleted. Focused tests preserve query
contracts, inactive-query behavior, refresh, route assembly, and semantic
test IDs.

## Objective

Make `domains/analytics` the single Web owner of BI query, filter,
presentation and panel behavior, leaving pages as route assembly and Admin as
access shell/navigation.

## Concrete Work

1. Create Analytics-owned response aliases/query hooks from Hono inferred
   responses.
2. Move the draft/applied date and Discovery-dimension filter state into one
   Analytics model/use-case.
3. Move number/percent/time formatting and derived panel models out of pages.
4. Extract the filter rail and three route surfaces.
5. Add three route-only pages:
   - Overview;
   - PR Create/Join funnels;
   - PR Discovery.
6. Point existing route names/paths/role metadata to those pages.
7. Preserve existing query keys and per-route `enabled` behavior.
8. Preserve loading, error, empty, refresh, apply/reset and stable test-ID
   behavior.
9. Keep Admin scaffold/navigation reuse without importing BI semantics back
   into Admin.
10. Delete `AdminAnalyticsPage.vue` and old Admin query ownership only after
    all three routes pass.

## Extraction Rule

Create a reusable table/metric component only after two surfaces share the
same behavior, not merely similar markup. The target is deep owner modules,
not a forest of one-use wrappers.

## Exit

- no BI query/model/panel remains Admin-owned;
- all three pages are route assembly;
- inactive dashboards do not fetch;
- roles, routes, query keys, filters, states and test IDs are compatible; and
- focused Web tests plus the existing access scenario pass.

See [`rehearsal.md`](./rehearsal.md).
