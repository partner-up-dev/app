# Composition Pattern Rollout

## Objective & Hypothesis

Objective: after the `FormModePreferenceControl.vue` pilot, identify other
frontend surfaces where the same migration mode should be applied: package
component composition plus local state/structure decomposition, not isolated
one-to-one component replacement.

Hypothesis: this pattern is most useful when a component mixes product state,
local container markup, local primitive styling, and repeated UI structures in
one file. The maintainability gain comes from moving semantic UI ownership to
package components while leaving product-specific state in domain components
or composables.

## Current Mode

- Input route: `Constraint`.
- Active mode: `Execute`.
- Production code status: first rollout pass implemented and verified.
- Dependency: Slice 9 has provided the first concrete before/after example.

## Pattern Definition

Use this rollout mode when a target has at least two of these traits:

- local UI primitive classes such as `*-card`, `*-panel`, `*-pill`,
  `*-row`, `*-field`, `*-input`, `inline-message`, or repeated item shells
- multiple package components can cooperate naturally, for example
  `PuCard` + `PuDescriptionList`, `PuDrawer` + `PuChipGroup`, or
  `PuForm` + field controls + notices
- product state can be named and separated from rendering shape
- local CSS owns package-covered visual behavior such as selectable chips,
  panel shells, field controls, notices, or icon buttons
- the file is large enough that a direct component swap would leave the
  original complexity mostly intact

Do not use this mode for:

- passive badge/tag cleanup already covered by Slice 8
- simple raw field replacement already covered by Slice 3
- gesture-heavy state machines before topology mapping
- local wrappers around package components

## Pilot Output Expected From Slice 9

The Slice 9 pilot should leave behind a reusable working recipe:

1. map product interaction state before touching markup
2. identify package-owned UI responsibilities
3. replace local primitives with direct package composition
4. remove local CSS that only existed to imitate package primitives
5. only then extract domain logic if the component is still hard to read

This recipe should be recorded from actual implementation evidence, not just
pre-implementation intent.

## Candidate Surfaces

### High-Confidence Candidates

1. `apps/frontend/src/domains/pr/ui/sections/InlineNLPRForm.vue`

   Current shape: native form, custom input shell, custom voice icon button,
   custom send button/spinner, local validation messages, and a package notice
   already mixed into the same surface.

   Candidate composition: `PuForm`, `PuFormItem`, `PuInput`, `PuButton`
   icon buttons, `PuSpinner` or `PuButton` loading, and `PuInlineNotice`.

   Why this matches the pattern: the product behavior is not just fields; it
   includes typewriter fallback text, voice recording, draft persistence,
   submit navigation, and mutation feedback. A one-to-one input swap would not
   remove the real complexity.

2. `apps/frontend/src/domains/event/ui/composites/FormModeNoMatchResult.vue`

   Current shape: candidate list, custom join-error text, a local no-match
   hero, create fallback action, and local create-error text.

   Candidate composition: keep `PRPreviewCard` and `PRJoinAction` as
   domain-owned behavior components, and replace the package-covered local
   empty/error primitives with `PuEmptyState`, `PuInlineNotice`, and existing
   direct `PuButton` usage.

   Why this matches the pattern: it is an active Form Mode route state that
   mixes product handoff events with local UI primitives. The useful split is
   to let package components own empty/error/action feedback while preserving
   the route-level Form Mode state machine.

### Deferred After Investigation

1. `apps/frontend/src/domains/pr/ui/sections/PRPartnerSection.vue`

   Current shape: custom section shell, summary cards, action bar, inline
   error/availability notes, roster panel, timeline panel, reminder panel, and
   many local panel/list styles.

   Candidate composition: `PuCard`, `PuBentoGrid`/`PuBentoItem` or
   `PuDescriptionList`, `PuInlineNotice`, `PuButton`, `PuCellGroup`, and
   existing `PRRosterItem`.

   Why this matches the pattern: the section mixes participant state,
   readiness facts, commands, timeline facts, reminder policy, and local
   container styling. Package composition can make each region's semantic role
   explicit.

   Slice 10 finding: no `<PRPartnerSection>` usage site exists in current
   source. The active PR detail route has already moved through
   `PRFactsCard.vue`, dedicated participation actions, and notification
   subscription sections. Because this component is currently unmounted, it is
   not a good production-code target for the first rollout pass. Do not reconnect
   it to the route as part of package migration.

### Medium-Confidence Candidates

3. `apps/frontend/src/domains/pr/ui/composites/PRFactsCard.vue`

   Current shape: already uses several package components, but still keeps
   local `facts-entry`, custom row action buttons, gallery/map modal state,
   and mixed interactive/read-only fact rendering.

   Candidate composition: deepen `PuDescriptionList`/`PuDescriptionItem`
   usage, replace custom row action buttons with `PuButton`/action slots, and
   split fact derivation from modal presentation.

   Why medium: much of the direct migration is already done, so the next gain
   is architectural cleanup rather than obvious package replacement.

4. `apps/frontend/src/domains/admin/ui/navigation/AdminNavigationPanel.vue`

   Current shape: collapsible admin nav shell, grouped nav expansion, manual
   icon buttons, group triggers, and package cards as nav items.

   Candidate composition: `PuAccordion`/`PuAccordionItem` for group
   expansion, `PuCellGroup`/`PuCell` or package-backed action cards for items,
   and `PuButton` for collapse/logout actions.

   Why medium: nav semantics and active-route behavior need careful mapping
   before replacing group controls.

### Investigate Before Scheduling

- `apps/frontend/src/domains/admin-commerce/ui/product-management/sections/AdminCommerceSpuEditor.vue`
  is explicitly out of Slice 10 by human constraint. It remains a plausible
  package-composition target in the abstract, especially around plain string
  lists that could map to `PuChipInput`, but it should not be scheduled here.
- `apps/frontend/src/domains/event/ui/surfaces/AnchorEventFormModeSurface.vue`
  is high-value but state-machine heavy. It should wait until Slice 9 clarifies
  the local control pattern and until the Form Mode topology is mapped.
- `apps/frontend/src/pages/AdminAnalyticsPage.vue` is large and still owns
  many analytics panels, but it may fit a separate dashboard-container slice
  better than the interaction-composition rollout.
- `apps/frontend/src/pages/StudySprintPomodoroPage.vue` is visually integrated
  and game-like. Package composition should be conservative there.

## Suggested Slice 10 Shape

Slice 10 should not immediately implement every candidate. It should:

1. compare Slice 9's actual diff against this pattern definition
2. pick two low-to-medium-risk candidates for follow-up implementation
3. create a short per-candidate topology note before editing
4. implement one candidate at a time
5. update this packet with what the pattern did and did not generalize to

Current first rollout pass:

- `InlineNLPRForm.vue`, because it is compact, user-visible, and has a clear
  package composition target.
- `FormModeNoMatchResult.vue`, because it is still on the active Form Mode
  path and lets the rollout apply the same composition principle without
  touching the route state machine.

`PRPartnerSection.vue` was investigated and deferred because it currently has
no usage site.

## Slice 10 Implementation Notes

### `InlineNLPRForm.vue`

- Replaced the native `<form>` with direct `PuForm`.
- Replaced local text input shell with `PuFormItem` + `PuInput`.
- Replaced local voice and submit buttons with direct `PuButton`, including
  native submit/button actions, package loading state, and accessible icon-only
  labels.
- Replaced local voice and submit error text with `PuInlineNotice`.
- Removed local primitive CSS for `nl-input`, `send-button`, `voice-button`,
  `spinner`, and `error-message`.
- Kept draft persistence, typewriter fallback text, WeChat voice transcript
  merging, auth bootstrap, mutation submission, and routing as PR-domain logic.

### `FormModeNoMatchResult.vue`

- Replaced local join and create error text with `PuInlineNotice`.
- Replaced the no-candidate hero markup with `PuEmptyState`.
- Kept `PRPreviewCard`, `PRJoinAction`, candidate telemetry emits, create
  fallback emit, and Form Mode route state ownership unchanged.

## PuChipInput Review

Current Slice 10 candidates should not depend on `PuChipInput`.

- `InlineNLPRForm.vue` is a single natural-language text entry surface:
  use `PuInput`/`PuButton`/`PuInlineNotice`, not chip entry.
- `FormModeNoMatchResult.vue` owns candidate/result composition and local
  empty/error states, not token entry.
- `PRFactsCard.vue` uses chip display for preferences and roster preview;
  that is `PuChip`/`PuChipGroup`, not `PuChipInput`.
- `AdminNavigationPanel.vue` is navigation grouping and active-route state,
  not token entry.
- `PRPartnerSection.vue` is currently unmounted legacy cleanup, not a current
  `PuChipInput` candidate.

The only original Slice 10 candidate with a credible `PuChipInput` path was
`AdminCommerceSpuEditor.vue`, through plain string-list editors such as hero
image asset ids, detail image asset ids, and selling points. Since that target
is out of scope, `PuChipInput` should not drive Slice 10 planning.

## Verification

For candidate selection only:

- source scans and task packet update are enough

For each production implementation:

- `pnpm --filter @partner-up-dev/frontend build`
- `pnpm --filter @partner-up-dev/frontend lint:tokens`
- `pnpm test:unit:frontend`
- targeted scans for removed local primitive class families
- browser screenshot only when layout density or route-level composition
  materially changes
- `git diff --check`

Slice 10 first rollout verification:

- Passed `pnpm --filter @partner-up-dev/frontend build`.
- Passed `pnpm --filter @partner-up-dev/frontend lint:tokens`.
- Passed `pnpm test:unit:frontend`.
- Passed targeted scans for removed `InlineNLPRForm` and
  `FormModeNoMatchResult` local primitive class families.
- Passed source scan showing no current `PRPartnerSection` usage sites.
- Passed `git diff --check`.
