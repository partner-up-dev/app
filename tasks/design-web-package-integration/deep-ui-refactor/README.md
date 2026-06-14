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
- Production code status: Slice 1 implemented and verified.
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
  `@partner-up-dev/design-web@0.4.1` under
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
  and route/event editing surfaces. The 0.4.1 package now supports
  `PuInput nativeType="datetime-local"`, so datetime fields can move through
  the normal field-control lane.

## Package API Constraints

- `PuInput` supports `datetime-local` as of `@partner-up-dev/design-web@0.4.1`.
  Datalist-backed inputs still need a separate decision because `list` is not
  part of the documented public `PuInput` props.
- `PuForm` exposes schema/validation structure and a documented `submit`
  event as of `0.4.1`. Use it where the form can adopt package form semantics
  directly, not as a wrapper around old native-form markup.
- `PuPicker` is available for option selection, but migrating native `select`
  or `datalist` inputs requires product-level interaction acceptance.
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
3. Straightforward field cleanup: migrate eligible text, number, password, URL,
   and textarea controls to `PuFormItem` + `PuInput`/`PuTextarea`; leave
   `datetime-local`, native select, and datalist-backed controls in a separate
   decision lane.
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

## Defer By Default

- `FormModeLongPressButton`, `LiquidWaveSplash`, `PeekRadioCarousel`, card
  swipe projection layers, and map rendering.
- `ProductLocalDateCalendarPicker` unless a package calendar/date selector
  exists or the product accepts a different picker interaction.
- Native `select` and datalist-backed controls until the product accepts a
  package picker or the package exposes a matching public field API.

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
- Source scans found no old `PageHeader`/`ErrorToast` usage-site references, no
  package private-path imports, and no raw `type="datetime-local"` in the four
  migrated datetime files.

For route/page structure slices:

- add targeted component tests when state ownership moves
- smoke representative desktop/mobile routes with browser screenshots when
  layout or visual density changes
- escalate to scenario/system tests only when a route workflow changes, not for
  pure component substitution
