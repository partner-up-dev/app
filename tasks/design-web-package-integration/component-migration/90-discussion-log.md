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
