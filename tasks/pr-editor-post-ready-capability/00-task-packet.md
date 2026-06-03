# PR Editor Post-Ready Capability

## Objective & Hypothesis

Separate PR field-level post-ready adjustment facts from viewer-specific edit permission.

Hypothesis: `editCapability` should remain viewer-aware and drive PR editing UI availability, while `editPostReadyCapability` should be a PR-level declaration derived from `allowEditAfterReady` and drive PR Facts Card "可调整" markers.

`PREditor` is the unified normal PR create/edit content editor. Its input is only `prId?: number`: absent means normal PR create, present means PR edit. Anchor Event create is intentionally out of scope because it carries event-assisted selection semantics.

## Guardrails Touched

- PR detail read model.
- PR Facts Card field markers.
- PR Page creator edit modal composition.
- PR Create Page structured form composition.
- PR ready-after edit policy semantics.

## Verification

- Passed: `pnpm test:unit:backend -- pr-edit-capability.service.test.ts`
- Passed: `pnpm --filter @partner-up-dev/frontend exec vitest run src/pages/PRPage.creator-actions.test.ts`
- Passed: `pnpm --filter @partner-up-dev/frontend build`
- Passed: `pnpm lint:backend`
- Passed after `PREditor` unification: `pnpm --filter @partner-up-dev/frontend build`
- Passed after `PREditor` unification: `pnpm --filter @partner-up-dev/frontend exec vitest run src/pages/PRPage.creator-actions.test.ts`
- Passed after `PREditor` unification: `pnpm test:unit:backend -- pr-edit-capability.service.test.ts`
- Passed for PR Page READY time-window edit scenario: `pnpm test:scenario:system -- pr-detail-edit.scenario.test.ts` (also repeated twice after stabilizing input sync waits)
- Passed after `pr-editor.form.*` selector migration: `pnpm test:scenario:system -- pr-create.scenario.test.ts`
- Passed after scenario additions: `pnpm --filter @partner-up-dev/frontend build`
- Passed after scenario additions: `pnpm --filter @partner-up-dev/frontend exec vitest run src/pages/PRPage.creator-actions.test.ts`
- Passed after scenario additions: `pnpm test:unit:backend -- pr-edit-capability.service.test.ts`
