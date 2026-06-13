# Design Web Component Migration

## Objective & Hypothesis

Objective: finish the frontend migration from local reusable UI primitives to
`@partner-up-dev/design-web@0.4.0`, one component-owned migration file at a
time, without changing PRD-level product workflows.

Hypothesis: the right route is to preserve product intent while moving usage
sites directly to package APIs when a local primitive is only a design facade.
Package-native visuals and micro-interactions are acceptable. Local facades
should remain only when they own an app-specific semantic contract that the
design package should not absorb.

## Current Mode

- Input route: `Constraint`.
- Active mode: `Execute`.
- Implementation status: third overlay slice implemented and verified locally.
  Usage sites now consume the relevant package components directly and the
  migrated local facades have been deleted.

## Guardrails Touched

- Root task protocol: keep a task-local packet for non-trivial work and update
  it when exploration, friction, or verification changes state.
- Frontend boundary: `apps/frontend/src/shared/ui/**`,
  `apps/frontend/src/app/**`, `apps/frontend/tsconfig.json`, and package
  consuming configuration.
- Design package boundary: consume only public exports from
  `@partner-up-dev/design-web`; do not edit package internals or rely on story
  helper classes.
- Product invariant: no PRD workflow or routing change. Component-level visual
  parity, DOM parity, density parity, and micro-interaction parity are not
  required. Accessibility must remain valid, but labels and semantic anchors may
  move to package-native structure when tests and usage sites are updated
  intentionally.
- Type invariant: no `any`; restore real package types instead of expanding the
  local broad component shim.

## Current Evidence

- `apps/frontend/package.json` now depends on
  `@partner-up-dev/design-web` `0.4.0`; the lockfile also points to `0.4.0`.
- `apps/frontend/src/main.ts` already imports
  `@partner-up-dev/design-web/styles`.
- `apps/frontend/uno.config.ts` already uses
  `@partner-up-dev/design-web/uno`.
- `apps/frontend/src/app/create-app.ts` does not install the package plugin;
  current consumption is named imports plus the global style and Uno preset.
- `apps/frontend/tsconfig.json` no longer maps `@partner-up-dev/design-web` to
  a local type adapter. Root named imports now resolve through the package
  `exports` and `types` declarations.
- `apps/frontend/src/types/design-web-runtime.d.ts` has been removed.
- The package root exports the full component registry, but its exported
  `version` literal still says `"0.1.0"` even though package metadata is
  `0.3.0`. A fresh `npm pack --prefer-online` download from GitHub Packages
  confirmed the same mismatch, so this is a published package artifact issue,
  not local workspace install corruption. Do not use that runtime constant as
  release truth.
- Directly using the package root declarations is currently blocked:
  `dist/index.d.ts` exports `../types/components`, whose global component
  augmentation imports `../src/components/*`. The published package does not
  include the source-level `src/types` and `src/composables` modules those Vue
  source files import. A fresh registry tarball confirmed the same missing
  directories, so `vue-tsc` fails inside `node_modules`.
- Registry follow-up: `@partner-up-dev/design-web@0.4.0` fixes this publishing
  issue. Fresh tarball inspection shows `dist/version.d.ts` declares `"0.4.0"`,
  the root declarations no longer export `../types/components`,
  `types/components.d.ts` references package root named exports instead of
  `../src/components/*`, and both a temporary Vue/TypeScript consumer
  `vue-tsc --noEmit` and the frontend build passed against real package
  declarations.
- First slice completed: type entry, `InlineNotice`, `EmptyState`,
  `LoadingIndicator`, `PageScaffold`, and a single-file `PageFooter` padding
  correction.
- Second slice completed: first-slice wrappers were cleaned up, and usage sites
  now directly consume `PuChip`, `PuChipGroup`, `PuTag`, `PuCell`,
  `PuDescriptionList`, `PuDescriptionItem`, `PuImg`, `PuFormItem`, `PuInput`,
  `PuTextarea`, `PuToggleSwitch`, `PuSegmented`, and `PuSegmentedItem`.
- Second-slice direction clarified: do not keep `Chip`, `Tag`, `Cell`,
  `InfoRow`, `FormField`, `TextInput`, `TextareaInput`, `ToggleSwitch`, or
  `SegmentedControl` as local wrappers just to preserve old import sites.
  Migrate usage sites to package components and remove local primitives once
  their call sites are cleared. Installed `0.4.0` `PuImg` supports identity
  fallback props (`name`, `fallbackInitial`, `shape`, `bordered`), so the local
  `Avatar` exception was not needed and `Avatar.vue` was deleted.
- Second-slice scope expanded again: first-slice local wrappers must be cleaned
  up in the same direct-migration style. This includes `InlineNotice`,
  `EmptyState`, `LoadingIndicator`, and `PageScaffold*` usage sites. The first
  slice proved package compatibility; the second slice should remove those
  local facades where they do not own product semantics.
- Second-slice adoption rule clarified: do not wrap `Pu*` components merely to
  keep old visual or behavioral parity. Direct package composition is the
  default even when spacing, shape, density, DOM structure, emitted event shape,
  or keyboard/micro-interaction details differ from the old local component.
  Stop and discuss before creating any exception wrapper.
- Second slice evidence: local wrappers deleted in this slice are `Chip`,
  `ChipGroup`, `FitChipGroup`, `Cell`, `InfoRow`, `InfoRowAction`, `Avatar`,
  `FormField`, `TextInput`, `TextareaInput`, `ToggleSwitch`,
  `SegmentedControl`, `WheelPicker`, `InlineNotice`, `EmptyState`,
  `LoadingIndicator`, and `PageScaffold*`. There is no current shared `Tag` or
  `Form` primitive. `PuTag` was introduced at read-only status-label usage
  sites. `PuForm` remains gated because the package public API exposes
  `schema`/`validate()` but no documented submit event.
- `PuImg` scope was broader than avatar: `EventCard.vue`,
  `AnchorEventDemandCard.vue`, `PRPreviewCardFrame.vue`, `MePage.vue`, and
  `UserProfilePage.vue` now consume `PuImg` directly. Domain overlays and
  gesture roots remain app-owned.
- `PuWheelPicker` was added to the second slice after the user asked to include
  it before committing. `FormModeTimeControl.vue` now imports the package
  component directly and the local wheel picker implementation was deleted.
- Agent Skill source clarified: the up-to-date `design-web` TanStack Intent
  skill is shipped inside `@partner-up-dev/design-web@0.4.0` under
  `skills/design-web`. Agents should load it with `pnpm dlx
@tanstack/intent@latest load @partner-up-dev/design-web#design-web` after
  package updates instead of hand-editing or relying on stale local copies under
  `~/.codex/skills`.
- Third slice completed: migrated overlay primitives directly to package
  components: `Modal` -> `PuModal`, `ConfirmDialog` -> `PuDialog`, and
  `BottomDrawer` -> `PuDrawer`. Do not keep local overlay wrappers for visual,
  DOM, close-event, or animation parity. Usage sites own any product-specific
  semantic mapping, such as treating `PuDrawer` close reason `overlay` as the
  former preference-drawer `backdrop` auto-save path.
- Third slice evidence: local wrappers deleted in this slice are `Modal`,
  `ConfirmDialog`, `BottomDrawer`, and `useBodyScrollLock`. The old
  `lib/body-scroll-lock.ts` helper was also deleted after overlay call sites no
  longer needed parent-managed scroll locking.

## First Slice Candidate

Execution order completed:

1. Remove the package-root type shim so named imports use real package types.
2. Migrate the already-close feedback/layout facades:
   `InlineNotice`, `EmptyState`, `LoadingIndicator`, and `PageScaffold`.
3. Apply the `PageFooter` padding correction as a bounded chrome fix tied to
   the `PuPageScaffold` footer slot surface.

Adjustment from evidence: step 1 was initially blocked by `0.3.0` package
publishing defects. After `0.4.0`, the consumer-side adapter was removed and
the app now uses real package declarations.

Slice invariant: preserve PRD-level workflow intent and accessibility validity
while replacing local design facades at usage sites. A second-slice package
component is not considered complete while old local imports/call sites remain,
unless the task packet records a concrete semantic blocker. Visual and
component-level behavioral differences are acceptable and should not be hidden
behind compatibility wrappers.

## Verification

Baseline per component slice:

- `pnpm --filter @partner-up-dev/frontend build` - passed.
- `pnpm --filter @partner-up-dev/frontend lint:tokens` - passed.
- `pnpm test:unit:frontend` - passed, 26 files / 117 tests.
- `git diff --check` - passed.
- Second-slice final verification on 2026-06-13: frontend build passed; token
  lint passed; frontend unit tests passed, 26 files / 117 tests; migrated
  wrapper import scan returned no usage-site references; `git diff --check`
  passed.
- Second-slice post-`WheelPicker` verification on 2026-06-13: frontend build
  passed; token lint passed; frontend unit tests passed, 26 files / 117 tests;
  migrated wrapper import scan returned no usage-site references; `git
diff --check` passed.
- Third-slice verification on 2026-06-13: frontend build passed; token lint
  passed; frontend unit tests passed, 26 files / 117 tests; migrated overlay
  and scroll-lock scan returned no usage-site references; package API scan found
  no old `PuDialog` or `PuDrawer` prop vocabulary; `git diff --check` passed.
- Agent Skill verification on 2026-06-13: `pnpm dlx
@tanstack/intent@latest list --json` found
  `@partner-up-dev/design-web#design-web` from the installed `0.4.0` package;
  `pnpm dlx @tanstack/intent@latest load @partner-up-dev/design-web#design-web`
  returned the updated skill with `PuDialog`; `pnpm dlx
@tanstack/intent@latest validate
apps/frontend/node_modules/@partner-up-dev/design-web/skills/design-web`
  passed.
- Browser smoke with Edge through Playwright on `http://localhost:4001/` and
  `/pr/1` - passed. Evidence:
  `evidence/home-footer-mobile.png` and `evidence/pr-footer-mobile.png`.
- After the `0.4.0` upgrade, browser smoke with Edge through Playwright on
  `http://127.0.0.1:4002/` and `/pr/1` - passed. Evidence:
  `evidence/home-040-mobile.png` and `evidence/pr-040-mobile.png`.

Escalate verification when the touched component owns workflow risk:

- PR action or overlay slices: targeted PR UI tests such as
  `PRParticipationActions.test.ts`, `PRUtilityComponents.test.ts`, and
  `PRPage.creator-actions.test.ts`.
- Cross-page or route workflow slices: relevant scenario/system tests and a
  browser smoke pass on desktop and mobile viewport widths.
- Visual primitive slices: screenshot or browser smoke on representative PR,
  Anchor Event, Me, Admin, and Commerce surfaces to catch broken layout,
  unreadable content, and unusable interactions, not to enforce 1:1 visual
  parity.

## Open Decisions

- Direct package imports at usage sites are the default for migrated
  primitives. Keep a local component only when it owns an app contract the
  package should not know about.
- Do not create compatibility wrappers, local CSS shells, or adapter components
  solely to keep old local-component visuals or behavior. Extremely rare
  exceptions must pause execution and be discussed before implementation.
- Decide whether to install the package plugin for global components. Proposed
  rule: stay with named imports; plugin registration adds broad global surface
  without solving migration risk.
- Delete local design facades aggressively after their usage sites are migrated.
  Do not leave compatibility wrappers for `Chip`, `Tag`, `Cell`, `InfoRow`,
  form controls, toggles, or segmented controls.
- First-slice wrappers are not grandfathered. After this second slice, there
  should be no usage-site imports of `InlineNotice`, `EmptyState`,
  `LoadingIndicator`, or local `PageScaffold*` wrappers unless a concrete
  product-owned semantic blocker is recorded.
- Upstream package follow-up: `0.4.0` resolved the root declaration and version
  literal blocker for current frontend consumption.
- Second-slice follow-up: `PuForm` is still gated; use it only when a specific
  form container can adopt package schema/validation semantics directly.
