# AnchorEvent removal characterization tests

This evidence records behavior that must survive the AnchorEvent-to-PartnerRequest owner migration. The assertions intentionally describe current public/service boundaries; they do not preserve `ACTIVE`, `PAUSED`, or `ARCHIVED` as target lifecycle behavior.

## Locked unit behavior

- `apps/backend/src/domains/anchor-event/landing-config.test.ts` verifies that a normalized landing override with `FORM`, `CARD_RICH`, and `LIST` all set to zero resolves to `LIST` for boundary and interior assignment values.
- `apps/backend/src/domains/pr-core/services/event-default-materialization.service.test.ts` verifies that configuration discovery without an explicit event id uses the trimmed `PartnerRequest.type`, then materializes confirmation offsets, default notes, merged join gates, and questionnaire instance id onto the ordinary PR. It also verifies that an unconfigured type preserves an explicit PR join-gate config.
- `apps/backend/src/domains/anchor-event/use-cases/create-form-mode-auto-pr.test.ts` and `materialize-dummy-pr.test.ts` verify that FORM and CARD/LIST assisted creation pass the event-derived partner bounds and an explicit PR-owned `notes: null` through the ordinary structured PR creation boundary, alongside `type`, time, place, and preferences.
- `apps/backend/tests/anchor-event/anchor-event-recommendation-participation.scenario.test.ts` verifies that CARD demand discovery returns `detailPrId` for the ordinary PR and that joining that id succeeds through `/api/pr/:id/join`.

## Existing ordinary-PR surface flow

The current system scenarios already show the same id flow for the remaining surfaces:

- FORM matched and candidate paths in `tests/scenario/anchor-event/anchor-event-form-mode-participation.scenario.test.ts` navigate to `/pr/:id` and complete the ordinary PR join flow; unmatched create paths verify the created id through `/api/pr/:id`.
- CARD and LIST assisted-create paths in `tests/scenario/anchor-event/anchor-event-landing-distribution.scenario.test.ts` verify the created `/pr/:id` and read it through the ordinary PR detail endpoint.
- LIST discovery and join in `tests/scenario/anchor-event/anchor-event-analytics-funnel.scenario.test.ts` navigate from the list item to `/pr/:id`, then complete ordinary PR joining.

These are characterization anchors for later test relocation. They are not claims that the AnchorEvent route or DTO should remain after migration.

## Verification

Targeted backend unit run:

```text
Test Files  4 passed (4)
Tests       13 passed (13)
```

The new materialization unit run independently passed 2 tests. The focused CARD backend scenario also passed 2 tests with the repository's isolated Postgres scenario runtime.
