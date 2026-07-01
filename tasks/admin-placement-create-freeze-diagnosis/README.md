# Admin Placement Create Freeze Diagnosis

## Objective & Hypothesis

- Objective: diagnose why clicking `新建 Placement` on `/admin/commerce/placements` makes the page unresponsive.
- Confirmed hypothesis: the click toggles create mode, then a page watcher repeatedly writes an empty `bindingRules` array back into its own reactive source.

## Guardrails Touched

- Frontend admin commerce page only during exploration.
- No durable product or source mutation without explicit user confirmation.
- `@partner-up-dev/design-web#design-web` skill loaded because the trigger is a `PuButton` interaction.

## Verification

- Static trace: `prepareNewPlacement -> isCreatingPlacement -> placementForm -> PlacementMatchingRulesEditor -> JsonLogicRuleEditor`.
- Runtime reproduction with Playwright on `https://partner-up.local/admin/commerce/placements`.
- Browser error: `Maximum recursive updates exceeded in component <AdminCommercePlacementPage>`.
- Workspace data at reproduction time:
  - first offer: `id=3`, `productType=RIDE_HAILING`, `status=ACTIVE`
  - rental offer: `id=1`, `productType=RENTAL`, `status=ACTIVE`
- Fix verification:
  - `pnpm check:type:frontend`
  - `pnpm check:format`
  - `pnpm check:lint:frontend`
  - Playwright click path: after `新建 Placement`, page shows `创建 Placement`, `Offer ID` is empty, binding row count is `0`, and no browser warning/error is emitted.

## Current Understanding

- `PuButton @click` is a documented public event and does not look like the direct cause.
- The local `JsonLogicRuleEditor` watcher was a candidate but is not the root cause.
- `emptyPlacementForm()` picks `offers.value[0]?.id`, which is currently the ride-hailing offer.
- `bindingRulesForOfferId(3)` returns `[]` because only `RENTAL` gets default binding rules.
- The watcher at `AdminCommercePlacementPage.vue:431` watches a freshly returned array containing `bindingRules.length`.
- In create mode with zero binding rules, it assigns `placementForm.value.bindingRules = []`.
- That assignment invalidates the watched dependency while the next computed tuple is still `[true, 3, 0]`, and the new returned array makes the watcher run again.

## Resolution

- `emptyPlacementForm()` now creates a blank draft with `offerId: null` and `bindingRules: []`.
- The page no longer auto-selects `offers[0]`.
- The page no longer derives or auto-fills binding rules from offer type.
- The recursive binding-rule auto-fill watcher was removed.
- Save now fails locally with an explicit message when `Offer ID` is missing.
