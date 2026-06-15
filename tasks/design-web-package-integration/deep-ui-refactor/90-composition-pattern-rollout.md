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
- Active mode: `Explore`.
- Production code status: not started.
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

2. `apps/frontend/src/domains/pr/ui/sections/PRPartnerSection.vue`

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

5. `apps/frontend/src/domains/event/ui/composites/FormModeNoMatchResult.vue`

   Current shape: candidate list, join action slot, local inline messages,
   no-match empty hero, and fallback create command.

   Candidate composition: `PuInlineNotice`, `PuEmptyState`, `PuButton`, and
   card/list composition around `PRPreviewCard`.

   Why medium: useful cleanup, but smaller than the pilot and may not justify
   extraction unless it becomes part of a larger Form Mode surface split.

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

Current recommended first follow-up after Slice 9:

- `InlineNLPRForm.vue`, because it is compact, user-visible, and has a clear
  package composition target.
- `PRPartnerSection.vue`, because it exercises the same content/container
  separation principle at a larger section scale.

## PuChipInput Review

Current Slice 10 candidates should not depend on `PuChipInput`.

- `InlineNLPRForm.vue` is a single natural-language text entry surface:
  use `PuInput`/`PuButton`/`PuInlineNotice`, not chip entry.
- `PRPartnerSection.vue` owns facts, actions, roster, timeline, and reminder
  panels. It may use `PuCard`, `PuBentoItem`, `PuDescriptionList`,
  `PuCellGroup`, and notices, not editable token input.
- `PRFactsCard.vue` uses chip display for preferences and roster preview;
  that is `PuChip`/`PuChipGroup`, not `PuChipInput`.
- `AdminNavigationPanel.vue` is navigation grouping and active-route state,
  not token entry.
- `FormModeNoMatchResult.vue` is candidate/result composition, not token
  entry.

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
