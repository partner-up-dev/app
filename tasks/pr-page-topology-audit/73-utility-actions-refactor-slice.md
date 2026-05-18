# Utility Actions Refactor Slice

Status: implemented.

## Objective & Hypothesis

Delete `PRUtilityActions` as an umbrella controller and replace it with peer PR detail utility components placed directly by `PRPage`.

Hypothesis:

- Utility capabilities have different owners and side effects, so one mixed section component keeps eroding boundaries.
- `PRPage` should own placement and canonical route/share context.
- Each utility component should own its own visibility, button, modal/drawer state, navigation, and telemetry.

## Guardrails Touched

- `apps/frontend/src/pages/PRPage.vue`
- `apps/frontend/src/domains/pr/ui/sections/PRUtilityActions.vue`
- PR-domain utility sections under `apps/frontend/src/domains/pr/ui/sections/`
- `apps/frontend/src/shared/telemetry/events.ts`
- Existing PR Page unit tests and new focused utility component tests.

## Target Component Split

- `PRBetaGroupAction.vue`
  - owns beta group button, QR modal, and `JOIN_BETA_GROUP` click telemetry
- `PRMessageThreadAction.vue`
  - owns participant-only message thread entry and route navigation
- `PRShareAction.vue`
  - owns share button and share drawer
  - receives canonical share context from `PRPage`
- `PRPageEventPlazaEntry.vue`
  - owns event plaza link visibility and PR-detail-origin click telemetry
- `PRNotificationSubscriptionsSection.vue`
  - owns notification subscription section visibility and shared subscription panel

## Verification

- `pnpm exec vitest run --project frontend-unit apps/frontend/src/domains/pr/ui/sections/PRUtilityComponents.test.ts apps/frontend/src/pages/PRPage.creator-actions.test.ts`
- `pnpm test:unit:frontend`
- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/frontend lint:tokens`
- `git diff --check`
- `rg -n "PRUtilityActions" apps/frontend/src tests tasks/pr-page-topology-audit`
  - Source and tests have no remaining references.
  - Remaining matches are historical task-packet references.

## Implementation Notes

- `PRPage` now computes share context once through `usePRShareContext` and passes `shareUrl`, `spmRouteKey`, and `prShareData` into `PRShareAction`.
- `PRPageEventPlazaEntry` emits `pr_secondary_action_click` with `actionType: "EVENT_PLAZA_ENTRY"` when clicked.
- `pr-detail.beta-group.open` remains stable for scenario coverage.
- `PRUtilityComponents.test.ts` covers beta group, message thread, share drawer, event plaza click telemetry, and notification subscription visibility.
