# Discussion Log

## 2026-06-12

- User requested full `@partner-up-dev/design-web` package integration by
  component and asked to discuss the approach before code changes.
- Constraint classification: product behavior should remain unchanged while
  frontend component ownership moves to the package.
- Exploration confirmed current package version is `0.3.0`, style and Uno
  entries are already wired, and named imports are the current consumption
  model.
- Main blocker: frontend `tsconfig.json` still shadows the package root with a
  local runtime shim that exposes only four components.
- Working strategy proposed: each component migration owns one task-packet file;
  production code changes require explicit user start.
- User proposed the first slice as: type entry, `InlineNotice`, `EmptyState`,
  `LoadingIndicator`, `PageScaffold`, and `PageFooter` padding correction.
- Local inspection confirmed `PageFooter` is an app-owned product chrome
  component, not a package component. It is accepted into the first-slice
  candidate only as a bounded one-file padding fix tied to the scaffold footer
  surface.
- `LoadingIndicator` should target `PuLoadingState` in this slice because the
  current local component is a visible region/page loading state with optional
  message text, not a spinner-only inline primitive.
- First slice started after explicit user approval.
- Attempting direct package root declarations failed because package
  `dist/index.d.ts` loads `../types/components`, which imports unpublished
  source dependencies via `../src/components/*`. The local type entry was
  changed from a broad component shim into a bounded typed adapter for the
  package components currently consumed by the frontend.
- `EmptyState` now delegates structure and styling to `PuEmptyState`, preserving
  the local props and `actions` slot.
- `LoadingIndicator` now delegates spinner/status semantics to
  `PuLoadingState`, preserving the `message` prop and adding a default
  accessible label.
- `InlineNotice` and `PageScaffold` were already package-backed facades; no
  call-site migration was needed in this slice.
- Verification passed: frontend build, token lint, frontend unit tests, and
  `git diff --check`. Browser smoke confirmed non-zero brand and minimal footer
  padding on mobile viewport.
- Follow-up registry verification used
  `npm pack --prefer-online @partner-up-dev/design-web@0.3.0` against
  `https://npm.pkg.github.com`. The fresh tarball has package metadata
  `0.3.0`, `dist/index.d.ts` still declares `version = "0.1.0"`, includes
  `src/components`, and does not include `src/types` or `src/composables`.
  The tarball integrity matches the workspace `pnpm-lock.yaml`, confirming the
  current install reflects the published artifact rather than local corruption.

## 2026-06-13

- User reported `@partner-up-dev/design-web@0.4.0` was just published and may
  fix the package type issue.
- Fresh `npm pack --prefer-online @partner-up-dev/design-web@0.4.0` against
  GitHub Packages confirmed the tarball metadata is `0.4.0`, `dist/version.d.ts`
  declares `version = "0.4.0"`, root declarations export `version` from
  `./version`, and root declarations no longer export `../types/components`.
- The `0.4.0` tarball no longer publishes `src/components`; `types/components.d.ts`
  now augments Vue globals through `typeof import('@partner-up-dev/design-web')`
  named exports.
- A temporary minimal consumer installed the `0.4.0` tarball plus Vue,
  TypeScript, vue-tsc, and Sass, then passed `vue-tsc --noEmit` while importing
  root components, `version`, and `@partner-up-dev/design-web/types`.
- No workspace dependency or production code was changed; app-side upgrade still
  requires an explicit execution start.
- User approved upgrading to `@partner-up-dev/design-web@0.4.0` and correcting
  the earlier consumer-side component type workaround.
- Updated `apps/frontend/package.json` to `0.4.0`, refreshed
  `pnpm-lock.yaml`, removed the `@partner-up-dev/design-web` root path alias
  from `apps/frontend/tsconfig.json`, and deleted
  `apps/frontend/src/types/design-web-runtime.d.ts`.
- Verified the app now consumes real package declarations: installed
  `node_modules` reports package version `0.4.0`, `dist/version.d.ts` declares
  `"0.4.0"`, and no source reference to `design-web-runtime` remains.
- Verification passed after the upgrade: frontend build, token lint, frontend
  unit tests, and `git diff --check`.
- Runtime smoke after the upgrade passed on a mobile viewport for `/` and
  `/pr/1`; the PR route rendered the expected no-backend loading state and
  footer. The temporary Vite server was stopped afterward.
- User proposed the second slice: `PuChip`, `PuTag`, `PuCell`,
  `PuDescriptionItem`, `PuImg`, `PuForm`, `PuInput`, `PuTextarea`,
  `PuToggleSwitch`, and `PuSegmented`.
- Exploration mapped those package components to local wrappers:
  `Chip`, `Cell`, `InfoRow`/`InfoRowAction`, `Avatar`, `FormField`,
  `TextInput`, `TextareaInput`, `ToggleSwitch`, and `SegmentedControl`.
- No shared local `Tag.vue` or `Form.vue` exists today. `PuTag` should be
  introduced only for non-interactive status/category labels, while `PuChip`
  continues to own selectable/removable/token semantics. `PuForm` is gated:
  package declarations expose `schema` and `validate()` but no documented
  submit event, so native form containers should not be mechanically replaced.
- Risk notes: local `Chip` currently treats `outline`, `surface`, and `warning`
  as tones, while package components split tone from variant; `TextareaInput`
  exposes `rows` and `minHeight`, which `PuTextarea` does not expose; and
  `InfoRow` may require a `PuDescriptionList` parent for correct
  `PuDescriptionItem` semantics.
- User clarified the second-slice migration must not preserve local design
  wrappers such as `Chip`, `Tag`, `InfoRow`, form controls, or segmented
  controls. Usage sites should import and compose `Pu*` package components
  directly, then delete local primitives once call sites clear. `Avatar` is an
  allowed exception because it owns app identity fallback semantics.
- User also requested broader `PuImg` application beyond `Avatar`, including
  Anchor Event cards and PR preview card image surfaces. The packet now treats
  `PuImg` as an expanded usage-site migration file and records initial targets:
  `PRPreviewCardFrame.vue`, `AnchorEventDemandCard.vue`, `EventCard.vue`, and
  the `Avatar` image branch only if identity fallback behavior remains intact.
- Corrected the Avatar assumption: current `PuImg` public references expose
  general image props and loading/error slots, not avatar-specific
  `fallbackInitial`, `name`, `shape`, or `bordered` props. The local Avatar
  fallback branch should remain app-owned unless the package API changes.
- Later installed-package inspection superseded this note: `0.4.0`
  declarations do expose avatar-capable `PuImg` props, so the local Avatar
  fallback branch was removed in the executed slice.
- User clarified that first-slice local wrappers are not exempt. If the first
  slice left a local wrapper around a package component, the second slice should
  also migrate those usage sites directly to package components and remove the
  local facade when call sites clear.
- First-slice wrapper cleanup targets are now `InlineNotice`, `EmptyState`,
  `LoadingIndicator`, and `PageScaffold*`. `PageFooter` is not a package
  wrapper; it remains an app chrome component with the padding fix from the
  first slice.
- User emphasized that migration does not require 1:1 visual or behavioral
  parity. Do not wrap `Pu*` components to preserve old local-component visuals,
  DOM, spacing, density, emitted event shape, keyboard micro-interactions, or
  compatibility props. Adopt package-native composition directly at usage
  sites.
- Exception rule: if an extremely rare wrapper seems necessary, stop and
  discuss before implementing. Acceptable exception candidates must be based on
  product/app semantics, not visual or behavior parity. `Avatar` remains only a
  candidate because identity fallback derivation is app-owned semantics.
- Second slice started after explicit user approval.
- Installed `@partner-up-dev/design-web@0.4.0` package declarations show
  `PuImg` now exposes `name`, `fallbackInitial`, `shape`, and `bordered`; the
  earlier Avatar exception was no longer needed. `MePage.vue` and
  `UserProfilePage.vue` now use `PuImg` directly, and local `Avatar.vue` was
  deleted.
- First-slice local wrappers were cleaned up directly at usage sites:
  `InlineNotice`, `EmptyState`, `LoadingIndicator`, and `PageScaffold*` imports
  were replaced by package components, and the local wrapper files were
  deleted.
- Second-slice primitives were migrated directly at usage sites:
  `Chip`/`ChipGroup`/`FitChipGroup` to `PuChip`/`PuChipGroup`, read-only status
  labels to `PuTag`, `Cell` to `PuCell`, `InfoRow`/`InfoRowAction` to
  `PuDescriptionList`/`PuDescriptionItem`, form fields to `PuFormItem`,
  `PuInput`, `PuTextarea`, and `PuToggleSwitch`, and segmented controls to
  `PuSegmented`/`PuSegmentedItem`.
- Expanded `PuImg` scope was applied to `EventCard.vue`,
  `AnchorEventDemandCard.vue`, and `PRPreviewCardFrame.vue`; domain overlays,
  swipe roots, fallback copy, and routing remain app-owned.
- Local wrappers deleted in this slice: `Cell.vue`, `Chip.vue`,
  `ChipGroup.vue`, `FitChipGroup.vue`, `InfoRow.vue`, `InfoRowAction.vue`,
  `FormField.vue`, `TextInput.vue`, `TextareaInput.vue`, `ToggleSwitch.vue`,
  `EmptyState.vue`, `InlineNotice.vue`, `LoadingIndicator.vue`,
  `PageScaffold.vue`, `PageScaffoldFlow.vue`, `PageScaffoldCentered.vue`,
  `FullScreenPageScaffold.vue`, `FooterRevealPageScaffold.vue`,
  `DesktopPageScaffold.vue`, `SegmentedControl.vue`, and `Avatar.vue`.
- `PuForm` remains gated. The slice adopted `PuFormItem` and package controls
  but did not mechanically replace native `<form>` containers because package
  submit/validation ownership needs a specific form contract.
- Final verification passed: `pnpm --filter @partner-up-dev/frontend build`,
  `pnpm --filter @partner-up-dev/frontend lint:tokens`,
  `pnpm test:unit:frontend` (26 files / 117 tests), target wrapper import scan,
  and `git diff --check`.
- User requested adding `WheelPicker` migration before committing the second
  slice, then using the third slice for `Modal`, `Dialog`, and `Drawer`.
- `FormModeTimeControl.vue` now imports `PuWheelPicker` directly from the
  package for both date and time wheels. The old
  `shared/ui/forms/WheelPicker.vue` implementation was deleted after its only
  call site was cleared.
- The slice index now treats `WheelPicker` as a completed second-slice item and
  moves overlay primitives into the selected third slice.
- Post-`WheelPicker` verification passed: frontend build, token lint, frontend
  unit tests (26 files / 117 tests), migrated wrapper import scan, and
  `git diff --check`.
- User rejected hand-editing the stale global Agent Skill copy under
  `~/.codex/skills/design-web` and asked for the TanStack Intent upgrade path.
- Investigation confirmed `@partner-up-dev/design-web@0.4.0` is
  intent-enabled and publishes `skills/design-web` inside the package. The
  package-shipped skill includes `PuDialog`, `PuLoadingState`, `PuSpinner`,
  `PuSnackbar`, and updated overlay guidance; the stale global copy does not.
- Durable docs now record the package-update workflow: update the package,
  then use `pnpm dlx @tanstack/intent@latest list --json`, `pnpm dlx
@tanstack/intent@latest load @partner-up-dev/design-web#design-web`, and
  `pnpm dlx @tanstack/intent@latest validate
apps/frontend/node_modules/@partner-up-dev/design-web/skills/design-web`.
  The repository does not add an `intent-skills` managed block.
- Third overlay slice started after explicit user approval.
- Package-shipped `design-web` skill and references identify `PuDialog`,
  `PuModal`, and `PuDrawer` as the correct public overlay APIs. Local
  `~/.codex/skills/design-web` remains stale and is not used as source of
  truth for component availability.
- Decision: confirmation usage sites migrate directly to `PuDialog`; no local
  `ConfirmDialog` wrapper remains. Because `PuDialog` tone is
  `"neutral" | PuStatusTone`, destructive confirmations map to `tone="error"`.
- Decision: `PuDrawer` usage sites adopt `visible` / `update:visible` directly.
  The form-mode preference drawer maps `close.reason === "overlay"` to the old
  backdrop auto-save behavior at the usage site.
- Third overlay slice completed. Usage sites now import `PuModal`, `PuDialog`,
  and `PuDrawer` directly from `@partner-up-dev/design-web`; local
  `Modal.vue`, `ConfirmDialog.vue`, `BottomDrawer.vue`,
  `useBodyScrollLock.ts`, and `lib/body-scroll-lock.ts` were deleted.
- WeChat OAuth keeps its non-dismissible workflow by setting
  `closeOnOverlay=false` and `closeOnEscape=false` directly on `PuModal`.
- Verification passed: frontend build, token lint, frontend unit tests (26
  files / 117 tests), migrated overlay and scroll-lock reference scan,
  package-prop vocabulary scan for `PuDialog`/`PuDrawer`, and `git diff
--check`.
- Third overlay slice was committed as
  `95b383d1 refactor(frontend): migrate overlay primitives to design package`.
- Fourth slice started for `ActionLink` and `ChoiceCard`. Package docs and
  declarations identify `PuButton` with structured `action` as the correct
  target for action-looking route/href CTAs, and `PuCard` with `action` or
  `selectable` as the correct target for choice cards.
- Current `ActionLink` usage includes ineffective `variant="outline"` attrs
  because the local component has no `variant` prop. The fourth slice should
  treat those as author intent and map them to real `PuButton` variants instead
  of preserving the old no-op.
- Fourth slice completed. `ActionLink.vue` was deleted after all usage sites
  moved to direct `PuButton :action` composition. `ChoiceCard.vue` was deleted
  after all usage sites moved to direct `PuCard` composition.
- `ChoiceCard` usages were split by semantics: button-like rail/status choices
  use `PuCard selectable`, admin navigation route choices use `PuCard
:action="{ to: ... }"`, and the time-window preview list uses non-interactive
  `PuCard`.
- Verification passed: frontend build, token lint, frontend unit tests (26
  files / 117 tests), source reference scan, `PuButton`/`PuCard` old-prop
  vocabulary scan, and `git diff --check`.
- Fourth slice was committed as
  `5b2635ec refactor(frontend): migrate action cards to design package`.
- User selected the next exploration order: fifth slice for `Button` and
  `FeedbackButton`, sixth slice for `PuTabs`, plus an audit that old `InfoRow`
  migrated to `PuDescriptionItem` rather than `PuCell`.
- Fifth-slice inventory found 220 local `<Button>` tags, 97 local button
  imports, and 2 `<FeedbackButton>` tags. Because the user already rejected
  compatibility wrappers, the fifth slice must migrate usage sites directly to
  `PuButton` and delete `Button.vue` / `FeedbackButton.vue` after call sites
  clear.
- `PuButton` package docs expose `action`, `shape`, `tone`, `variant`, `size`,
  `feedback`, `loading`, `disabled`, and `block`. Current inventory found no
  local `<Button form=...>` usage, so the missing package `form` prop is not a
  current blocker; submit buttons still need explicit native actions.
- Sixth-slice inventory found 2 local `<TabBar>` tags. The target is `PuTabs`
  with value-based tab items. Existing `tabClass` should be treated as a visual
  escape hatch to retire, not as a reason to wrap `PuTabs`.
- InfoRow audit confirmed all former production `InfoRow` / `InfoRowAction`
  usage was in `PRFactsCard.vue` and now uses `PuDescriptionList` /
  `PuDescriptionItem`. Current `PuCell` usage is unrelated
  `FormModePreferenceControl.vue` usage.
- Fifth slice started after explicit user approval.
- All local `Button` and `FeedbackButton` usage sites were migrated directly to
  `PuButton`. Static old `appearance`, local `tone`, `full-width`, and
  native `type` props were mapped at usage sites to package `shape`,
  `tone`/`variant`, `block`, and `action.native`.
- `FeedbackButton` state usage moved to the package `feedback` prop in
  `ShareAsLink.vue` and `ShareToXiaohongshu.vue`; no feedback wrapper remains.
- The dynamic APR notification action tone was changed from old local tone
  values (`outline` / `primary-outline`) to package `tone` plus
  `variant="outline"`.
- Old `.ui-button` and `.ui-button__label` layout selectors were removed or
  retargeted to package `.pu-button` and `.pu-button__content` classes where
  the selector only owned local layout constraints.
- `apps/frontend/src/shared/ui/actions/Button.vue` and
  `FeedbackButton.vue` were deleted. `shared/ui` and frontend style guidance
  now identify `PuButton` as the action primitive instead of local action
  wrappers.
- Fifth-slice verification passed: frontend build, token lint, frontend unit
  tests (26 files / 117 tests), old local action reference scan, old
  `PuButton` prop vocabulary scan, and `git diff --check`.
- Fifth slice was committed as
  `c0ba0968 refactor(frontend): migrate action buttons to design package`.
- Sixth tabs slice started after the user asked to commit the fifth slice and
  continue. `PRCreatePage.vue` and `AnchorEventListModeSurface.vue` now import
  `PuTabs` directly from `@partner-up-dev/design-web`.
- `TabBar` items were mapped from `{ key, label }` to package value-based
  `{ value, label }` tab items. The Anchor Event list-mode `tabClass` escape
  hatch for expired-date dashed tabs was retired instead of recreated around
  `PuTabs`.
- Current `PuTabs` public API does not expose a way to label its internal
  `role="tablist"` with the old `ariaLabel` prop. This is recorded as a package
  API follow-up, not a reason to keep a local wrapper.
- `apps/frontend/src/shared/ui/navigation/TabBar.vue` was deleted after its
  usage sites cleared.
- Follow-up correction: `AnchorEventListModeSurface.vue` now gives the package
  tabs and `date-panel` spacing through the parent `.date-section` flex `gap`
  instead of relying on `PuTabs customClass` plus a deep selector.
- Sixth-slice verification passed: frontend build, token lint, frontend unit
  tests (26 files / 117 tests), old `TabBar` / `tabClass` source reference
  scan, and `git diff --check`.
