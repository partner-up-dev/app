# Chip, Tag, And Badge Audit

## Objective & Hypothesis

Identify local badge, pill, chip, and tag markup that can be replaced by
`PuTag`, `PuChip`, or `PuChipGroup`. Static status and category labels should
move to `PuTag`; token lists, selectable/removable values, and metadata groups
should move to `PuChip`/`PuChipGroup`.

## Component Selection Rule

- Use `PuTag` for compact non-interactive status/category labels.
- Use `PuChip` for token-like labels, selected/removable values, and compact
  metadata chips.
- Use `PuChipGroup` for grouped chips and for fit/overflow behavior where
  complete chips should be measured as a group.

## High-Confidence Candidates

1. `apps/frontend/src/pages/PRPage.vue`
   - `type-badge` in the `PuPageHeader` meta slot should become `PuTag`.
   - `PRStatusBadge` in the same meta slot should become a direct `PuTag`.
   - The `meta` slot should own explicit row composition for spacing:
     `display: flex; flex-direction: row; justify-content: space-between;`
     with a chip/tag group for type and status.

2. `apps/frontend/src/domains/pr/ui/primitives/PRStatusBadge.vue`
   - Local wrapper should be deleted after call sites migrate.
   - Status text resolution can move into a small PR-domain helper or direct
     computed mapping at each remaining usage site.

3. `apps/frontend/src/domains/pr/ui/primitives/PRPreviewCardFrame.vue`
   - Replace `PRStatusBadge size="sm" appearance="pill"` with direct
     `PuTag size="sm" shape="pill"`.

4. `apps/frontend/src/domains/pr/ui/composites/PRHeroHeader.vue`
   - Replace `PRStatusBadge` with direct `PuTag`.

5. `apps/frontend/src/pages/AdminPaymentPage.vue` and
   `apps/frontend/src/pages/AdminRideHailingPage.vue`
   - Provider instance `status-pill` spans should become `PuTag`.
   - `ACTIVE` can use `tone="primary" variant="outline"` or `soft`;
     `DISABLED` should use `tone="neutral" variant="outline"` or `soft`.

6. `apps/frontend/src/pages/AdminAnalyticsPage.vue`
   - Outcome `status-pill--success|blocked|failure` should become `PuTag`
     with `success`, `warning`, and `error` tones.

7. `apps/frontend/src/domains/pr/ui/primitives/PRRosterItem.vue`
   - `pr-roster-item__tag` and card-variant `pr-roster-item__state` should
     become `PuTag`.
   - Plain variant state text may stay text if the desired treatment is not a
     visual label; otherwise use `PuTag variant="plain"` or `soft`.

8. `apps/frontend/src/domains/event/ui/primitives/AnchorEventDemandCard.vue`
   - `demand-card__location-badge` should become `PuTag`.
   - `demand-card__preference-chip` list should become `PuChipGroup` +
     `PuChip`.

9. `apps/frontend/src/domains/pr/ui/composites/PRFactsCard.vue`
   - `roster-chip-overflow` should stop hand-rolling chip styling. Use
     `PuChip` for the overflow marker or evaluate `PuChipGroup fit`.

## Conditional Candidates

- `apps/frontend/src/pages/StudySprintPomodoroPage.vue`
  - `participant-tile__status` is a state label and can use `PuTag`, but it is
    visually integrated into a game-like participant tile. Treat as a small
    product-visual change, not a mechanical sweep.

- Commerce status text:
  - `PaymentCheckoutPage.vue`
  - `CommerceOrderDetailPage.vue`
  - `CommerceBillDetailPage.vue`
  These are not currently badge components, but payment, fulfillment,
  settlement, and line status text would be clearer as `PuTag` if this slice is
  widened from local badge cleanup to general status-label cleanup.

## Not A Simple Badge Sweep

- `apps/frontend/src/domains/event/ui/controls/form-mode/FormModePreferenceControl.vue`
  - `tag-pill` owns selection, custom tag creation, removal, draft input, and
    drawer state. It should migrate in a dedicated interaction slice using
    `PuChip` removable/selected behavior only after checking whether inline
    draft input still needs custom composition.

- `apps/frontend/src/domains/pr/ui/forms/PREditor.vue` and
  `apps/frontend/src/domains/pr/ui/forms/PRForm.scss`
  - `tags-input` and `.tag` are editable preference input behavior. Migrate
    alongside the PR editor form cleanup, not as a passive display badge swap.

## Slice 8 Execution

Status: completed.

Included:

- PR status/type display in `PRPage`, `PRHeroHeader`, and `PRPreviewCardFrame`.
- Deletion of the local `PRStatusBadge` wrapper after usage sites are cleared.
- Admin provider and analytics outcome status pills.
- PR roster display tags and card-variant state label.
- Anchor Event demand card location and preference display labels.
- PR facts roster overflow marker.

Explicitly excluded:

- `FormModePreferenceControl.vue` `tag-pill`.
- `PREditor.vue` / `PRForm.scss` tag editor controls.
- `StudySprintPomodoroPage.vue` participant tile status.
- Commerce status text surfaces.

Verification:

- Passed `pnpm --filter @partner-up-dev/frontend build`.
- Passed `pnpm --filter @partner-up-dev/frontend lint:tokens`.
- Passed `pnpm test:unit:frontend`.
- Passed targeted source scan for `PRStatusBadge`, `type-badge`,
  `status-pill`, `demand-card__location-badge`,
  `demand-card__preference-chip`, and `roster-chip-overflow` in production
  source, excluding the explicitly deferred tag-editor surfaces.
- Passed `git diff --check`.

Implementation notes:

- Added `domains/pr/model/pr-status-tag.ts` for PR status text-key and tag-tone
  resolution.
- Deleted `domains/pr/ui/primitives/PRStatusBadge.vue`.
- Kept package components direct at usage sites; no new local compatibility
  wrappers were introduced.
- Renamed `MePage`'s already-package-backed `status-pill` class to
  `wechat-bound-tag` to keep future local-pill scans cleaner.

## Already Covered Or Acceptable

- `RouteApplicationPage.vue`, `LocationApplicationPage.vue`,
  `PoiReviewSection.vue`, and
  `AnchorEventRouteApplicationsSection.vue` already use `PuTag` for status.
- `EventCard.vue`, `EventHighlightsSection.vue`, and `PRFactsCard.vue`
  already use `PuChip`/`PuChipGroup` for several token-display surfaces.
- `EventCard.vue` still has location-pill class names, but those are on
  direct `PuChip` usage rather than local chip markup.
