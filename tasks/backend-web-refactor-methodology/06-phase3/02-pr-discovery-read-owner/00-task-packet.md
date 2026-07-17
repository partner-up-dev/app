# Slice 02 — PR Discovery Read Owner Consolidation

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

- Entry: Slice 01 rules available in report mode; current `/prd` behavior and request pattern characterized.
- Exit: one read workflow owner, no Page+Panel duplicate read hooks, route/testid/timeout/fallback unchanged,
  targeted and full gates green.

## Status

Planned; first application pilot. No application mutation started.
