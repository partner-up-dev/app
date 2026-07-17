# Slice 3-2 — PR Discovery Read Owner Consolidation

## Objective & Hypothesis

Consolidate `/prd` catalog/type-detail/directory/view-resolution and route state under one domain read workflow.
The route page assembles the shell; presentation receives a narrow view model. Create, waitlist, OAuth and pending
action behavior remain untouched.

## Owned Paths

- `apps/web/src/pages/PRDiscoveryPage.vue`
- `apps/web/src/domains/pr/ui/PRDiscoveryPanel.vue`
- `apps/web/src/domains/pr/queries/usePRDiscovery.ts`
- `apps/web/src/domains/pr/queries/usePRAuthoringOptions.ts`
- `apps/web/src/domains/pr/model/discovery.ts`
- a possible narrow `domains/pr/use-cases/usePRDiscoveryReadWorkflow.ts`
- focused Web tests and `tests/scenario/pr-discovery/pr-discovery.scenario.test.ts`

## Explicit Non-goals

- `usePRCreate`, waitlist/join, OAuth login/handoff, pending-action schema or Backend endpoints.
- URL, FORM/CARD/LIST membership, telemetry vocabulary, candidate ordering or product fallback changes.
- New design-system/shared wrappers.

## Entry / Exit

- Entry: `3-1` rules available in report mode; current `/prd` behavior and request pattern characterized.
- Exit: one read workflow owner, no Page+Panel duplicate read hooks, route/testid/timeout/fallback unchanged,
  targeted and full gates green.

## Status

Complete from `b674f5ca` on 2026-07-17. One route-scope read workflow now owns all five read hooks; Page/Panel
consume its plain state/actions, command/auth paths are unchanged, and focused/full gates are green. Unrelated
root package/workspace and task-directory dirty paths remain excluded.
