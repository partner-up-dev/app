# Deep UI Refactor Packet

## Objective & Hypothesis

Objective: deepen the frontend adoption of `@partner-up-dev/design-web` beyond
the first component facade migrations by separating content from containers,
using package-owned components where their intent matches, and reducing
page/domain component complexity without changing PRD-level workflows.

Hypothesis: the next maintainability gains are no longer mostly in
`src/shared/ui`; they are in large page/domain surfaces that still mix data
orchestration, layout containers, field rendering, local cards, local rows,
and product interaction state in one file.

## Current Mode

- Input route: `Constraint`.
- Active mode: `Execute`.
- Production code status: Slice 1 implemented and verified; Slice 3 0.4.3
  implementation pass implemented and verified; Slice 9 composition pilot
  implemented and corrected for the 0.4.4 chip-editor boundary.
- Task scope: frontend UI structure and package component composition.

## Guardrails Touched

- Root task protocol: keep volatile exploration under `tasks/`.
- Frontend architecture: pages assemble; domain UI owns product meaning;
  shared UI stays for true primitives only.
- Design package boundary: consume only public package exports and package
  skill references. Do not use package source internals or story helpers.
- Product invariant: do not change PRD-level workflows, routing, backend
  mutations, or policy semantics while changing component structure.
- Type invariant: no `any`; do not add local type shims for package APIs.

## Current Understanding

- The up-to-date design package skill is shipped with
  `@partner-up-dev/design-web@0.4.4` under
  `apps/frontend/node_modules/@partner-up-dev/design-web/skills/design-web`.
- The previous component-migration packet has completed direct migrations for
  local facades such as button, card choice, tabs, overlays, cells, chips,
  tags, fields, image, loading, empty, notice, and page scaffold wrappers.
- `src/shared/ui` is now small. Slice 1 removed the local `PageHeader` and
  `ErrorToast` facades; remaining shared UI files are mostly product chrome or
  app-specific composites: `PageFooter`, notification subscription cards,
  `MultiStopToggle`, `TimelinePolicyPicker`, and
  `ProductLocalDateCalendarPicker`.
- The largest complexity hotspots are now page/domain files, especially:
  `AdminAnalyticsPage.vue`, `AnchorEventFormModeSurface.vue`,
  `AnchorEventLandingPage.vue`,
  `AnchorEventCardModeSurface/AnchorEventCardModeSurface.vue`,
  `AdminPRBasicView.vue`, `StudySprintPomodoroPage.vue`,
  `AnchorEventListModeSurface.vue`, `AnchorEventDemandCard.vue`,
  `FormModePreferenceControl.vue`, and `MePage.vue`.
- Raw form controls remain concentrated in admin, commerce, PR editor, POI,
  and route/event editing surfaces. The 0.4.3 package supports
  `PuNumberInput`, `PuSelect`, native `PuInput list` forwarding,
  `PuTextarea rows`, and documented `PuForm` native form attributes. The
  0.4.4 package corrects chip editing: `PuChipInput` is one editable chip
  value, and `PuChipsEditor` owns string-array tag/chip collection editing.
  Slice 3 can move beyond text/textarea cleanup with those corrected
  boundaries.
- The bounded 0.4.3 Slice 3 implementation pass is recorded in
  `46-slice3-0.4.3-implementation.md`; it covers select/datalist, a focused
  Anchor Event numeric group, small form boundaries, a dynamic join-gate field
  group, and the plain PR preferences chip input.
- `FormModePreferenceControl.vue` is now tracked as a dedicated composition
  pilot in `80-form-mode-preference-composition.md`: it should move beyond
  one-to-one replacement into `PuCell` + `PuDrawer` + `PuChipGroup` +
  `PuChip` + `PuChipInput` composition and local state decomposition.
- Slice 9 completed the pilot by migrating `FormModePreferenceControl.vue` to
  direct package composition while keeping category selection and custom tag
  submission as domain-owned logic.
- The post-pilot rollout is tracked in
  `90-composition-pattern-rollout.md`: Slice 10 should use the Slice 9
  evidence to identify and implement similar composition-plus-refactor
  candidates, not treat this as a broad mechanical sweep.
- Slice 10 first rollout pass migrated `InlineNLPRForm.vue` and
  `FormModeNoMatchResult.vue` on active product paths. `PRPartnerSection.vue`
  was investigated and deferred because current source has no usage site.
- Slice 11 is planned in `95-slice11-upload-select-toggle.md`: it should
  migrate direct user upload controls to `PuFileUpload`/`PuFilesUpload`, delete
  the local `ImageUrlInput` UI wrapper, replace local `MultiStopToggle` with
  `PuMultiStopToggle`, and migrate a bounded non-Commerce `PuSelect` group.
  This slice is now implemented and verified. Remaining raw selects are
  Commerce-owned follow-up candidates or the deferred
  `AnchorEventInlinePlaceSelector.vue` picker/composition candidate.
  `PuPicker` remains deliberately deferred because it changes interaction
  model rather than merely replacing native selects.

## Package API Constraints

- `PuInput` supports `datetime-local` as of `@partner-up-dev/design-web@0.4.1`
  and documents native `list` forwarding as of `0.4.3`.
- `PuNumberInput` covers `number | null` app state and native numeric
  constraints as of `0.4.3`.
- `PuSelect` covers dense web-native single selection as of `0.4.3`.
- `PuChipInput` is a single editable chip input as of `0.4.4`; use
  `PuChipsEditor` for plain editable string-array token input.
- `PuForm` exposes schema/validation structure, a documented `submit` event,
  native form attribute fallthrough, and external submit support. Use it where
  the form can adopt package form semantics directly, not as a wrapper around
  old native-form markup.
- `PuPicker` remains available for option selection when a picker/drawer
  interaction is desired.
- `PuSnackbar` and `PuSnackbarHost` are available for transient feedback.
  Persistent embedded error states should usually become `PuInlineNotice`.

## Candidate Slice Order

Detailed slice planning lives in `20-slice-plan.md`.

1. Platform residuals: migrate `PageHeader` usage sites to `PuPageHeader`, and
   replace `ErrorToast` with either `PuSnackbar`/`PuSnackbarHost` or
   `PuInlineNotice` according to feedback scope.
2. Admin container primitives: replace local `BentoLayout`/`BentoItem` with
   `PuBentoGrid`/`PuBentoItem` at usage sites; evaluate `AdminRailPanel` as
   direct `PuCard` or `PuCellGroup` usage. Keep `AdminPageScaffold` only if it
   remains a real admin layout container over `PuPageScaffold`.
3. Field cleanup: continue migrating text/password/URL/textarea controls, and
   use package APIs for numeric fields (`PuNumberInput`), dense single selects
   (`PuSelect`), datalist-backed free text (`PuInput list`), real submit
   boundaries (`PuForm`), and plain tag inputs (`PuChipsEditor`) in small
   sub-slices.
4. Read-only/data display cleanup: replace local KPI cards, summary grids,
   row groups, and status badges with `PuBentoItem`, `PuCard`,
   `PuDescriptionList`, `PuDescriptionItem`, `PuCellGroup`, `PuCell`, or
   `PuTag` when the semantic fit is direct.
5. Content/container split for PR editor and admin PR editor: move repeated
   field groups and policy sections into domain-owned components while keeping
   backend-authoritative writes and cache/routing orchestration in parents.
6. Anchor Event low-risk states: migrate remaining local loading/error/empty
   states in list/card modes before touching gesture-heavy or state-machine
   areas.
7. Anchor Event high-risk surfaces: map the Form Mode and Card Mode state
   machines before splitting. Long press, carousel, splash handoff, and route
   handoff animation are product interaction contracts, not simple package
   substitutions.
8. Form Mode preference composition pilot: use
   `80-form-mode-preference-composition.md` to migrate the preference drawer
   from local pill/input markup to package component composition while keeping
   category selection and custom preference submission semantics explicit.
9. Composition pattern rollout: use
   `90-composition-pattern-rollout.md` to compare the Slice 9 pilot against
   other mixed UI/state surfaces, then schedule follow-up candidates one at a
   time.
10. Upload/select/toggle control cleanup: use
    `95-slice11-upload-select-toggle.md` to migrate file upload controls,
    the local multi-stop toggle, and a bounded native-select group to direct
    package components. First pass completed.

## Defer By Default

- `FormModeLongPressButton`, `LiquidWaveSplash`, `PeekRadioCarousel`, card
  swipe projection layers, and map rendering.
- `ProductLocalDateCalendarPicker` unless a package calendar/date selector
  exists or the product accepts a different picker interaction.
- Multi-select, option-group, async-option, or custom-rendered selects until
  the package exposes a matching public API.
- Rich option/tag editors, such as Form Mode preferences, until their
  interaction contracts are explicitly mapped.

## Verification Baseline

For low-risk package substitution slices:

- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/frontend lint:tokens`
- `pnpm test:unit:frontend`
- targeted source scans for deleted local facades and old prop vocabulary
- `git diff --check`

Slice 1 verification:

- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/frontend lint:tokens`
- `pnpm test:unit:frontend`
- old facade source scan for `PageHeader` / `ErrorToast`
- `git diff --check`

0.4.1 uplift verification:

- Package dependency and lockfile updated from `0.4.0` to `0.4.1`.
- TanStack Intent package skill found by `list --json`, loaded by
  `load @partner-up-dev/design-web#design-web`, and validated by
  `validate apps/frontend/node_modules/@partner-up-dev/design-web/skills/design-web`.
- `dist/version.d.ts` declares `version = "0.4.1"`.
- `PuInputNativeType` includes `datetime-local`; `PuForm` declares a typed
  `submit` event.
- First low-risk datetime usage sites migrated to direct `PuInput`.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
- `pnpm test:unit:frontend` passed.
- `git diff --check` passed.
- `git diff --check` passed.
- Source scans found no old `PageHeader`/`ErrorToast` usage-site references, no
  package private-path imports, and no raw `type="datetime-local"` in the four
  migrated datetime files.

0.4.3 uplift verification:

- Registry query confirmed `@partner-up-dev/design-web@0.4.3` is available.
- Package dependency and lockfile updated from `0.4.1` to `0.4.3`.
- TanStack Intent package skill found by `list --json`, loaded by
  `load @partner-up-dev/design-web#design-web`, and validated by
  `validate apps/frontend/node_modules/@partner-up-dev/design-web/skills/design-web`.
- `dist/version.d.ts` declares `version = "0.4.3"`.
- 0.4.3 skill references document `PuNumberInput`, `PuSelect`, `PuChipInput`,
  `PuInput list`, `PuTextarea rows`, and native `PuForm` attribute/external
  submit support.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
- `pnpm test:unit:frontend` passed.
- `git diff --check` passed.
- Slice 3 0.4.3 implementation verification is recorded in
  `46-slice3-0.4.3-implementation.md`.

0.4.4 uplift verification:

- Package dependency and lockfile updated from `0.4.3` to `0.4.4`.
- TanStack Intent package skill found by `list --json`, loaded by
  `load @partner-up-dev/design-web#design-web`, and validated by
  `validate apps/frontend/node_modules/@partner-up-dev/design-web/skills/design-web`.
- 0.4.4 skill references document the corrected split: `PuChipInput` for one
  editable chip value and `PuChipsEditor` for string-array chip collection
  editing.
- `PREditor.vue` preferences corrected from old array-style `PuChipInput`
  usage to `PuChipsEditor`.
- `FormModePreferenceControl.vue` corrected to the 0.4.4 `PuChipInput`
  composition: one editable chip per custom preference plus one draft chip for
  new custom labels.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
- `pnpm test:unit:frontend` passed.

Slice 11 verification:

- `PuFileUpload`/`PuFilesUpload` replaced direct user upload controls while
  backend upload transports and persisted URL shapes remained app-owned.
- Local `ImageUrlInput.vue` and `MultiStopToggle.vue` were deleted.
- Bounded non-Commerce native select targets migrated to `PuSelect`.
- Deferred selects are limited to Commerce page/editor follow-up work and
  `AnchorEventInlinePlaceSelector.vue`.
- `pnpm --filter @partner-up-dev/frontend build` passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` passed.
- `pnpm test:unit:frontend` passed.
- `git diff --check` passed.

For route/page structure slices:

- add targeted component tests when state ownership moves
- smoke representative desktop/mobile routes with browser screenshots when
  layout or visual density changes
- escalate to scenario/system tests only when a route workflow changes, not for
  pure component substitution
