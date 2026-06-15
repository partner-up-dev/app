# Form Mode Preference Composition Pilot

## Objective & Hypothesis

Objective: use `FormModePreferenceControl.vue` as the pilot for moving beyond
one-to-one UI replacement into package-component composition plus local state
decomposition.

Hypothesis: this component should become a composed interaction surface:
`PuCell` opens a `PuDrawer`; the drawer renders curated options with
`PuChipGroup` + selectable/removable `PuChip`; custom user-created preferences
are edited with `PuChipInput`; notices and commands use package primitives
instead of local pill, input, and inline-message markup.

## Current Mode

- Input route: `Constraint`.
- Active mode: `Execute`.
- Production code status: implemented and verified.
- Candidate file:
  `apps/frontend/src/domains/event/ui/controls/form-mode/FormModePreferenceControl.vue`.

## Guardrails Touched

- Root task protocol: this packet is volatile planning under `tasks/`.
- Design package boundary: use only public exports and package skill
  references for `@partner-up-dev/design-web@0.4.3`.
- Product invariant: preserve the form-mode preference workflow: users choose
  preset preferences, can add custom preferences, selected values are emitted
  through `update:modelValue`, and newly created labels are submitted to the
  preference-tag submission mutation.
- Interaction invariant: category cells allow at most one selected tag per
  category; uncategorized/all cells allow multiple selected tags.
- Type invariant: no `any`; keep package component types imported from the
  package root when needed.

## Package API Reading

- `PuCell` fits the visible row that opens each preference category drawer.
- `PuDrawer` fits the secondary selection workflow and is already used.
- `PuChipGroup` fits grouped chip option layout and should replace local
  flex-gap wrappers where the children are chips.
- `PuChip` fits selectable and removable option tokens through `selected`,
  `removable`, `click`, and `remove`.
- `PuChipInput` fits editable string-array token entry, but package docs state
  that suggestions and custom option listbox behavior are deferred.
- Therefore `PuChipInput` should not swallow the whole drawer option selector.
  It can own the custom preference entry subset while curated/preset options
  remain `PuChipGroup` + `PuChip`.

## Pre-Implementation Component Topology

Visible summary:

- `PuCell` rows show each category or uncategorized group.
- Cell value is derived from `modelValue`.
- Clicking a cell opens a `PuDrawer`.

Drawer workflow:

- `activeDrawerTags` computes the candidate tags for the active cell.
- Category cells use `drawerSelectedCategoryMap` for single selection.
- Uncategorized/all cells use `drawerSelectedUncategorizedLabels` for multiple
  selection.
- Custom tags are kept in `drawerCustomTags`, merged into effective drawer
  tags, removable through local button markup, then persisted to
  `localCustomTags` on save.
- Submission failures render through local `.inline-message` markup.

Local UI ownership before implementation:

- `.tag-pill`, `.tag-pill__body`, `.tag-pill__remove`,
  `.tag-pill__input`, and add/draft states.
- `.inline-message` error styling.
- Local chip sizing, selected state, remove button, and input shell styling.

## Composition Direction

The target should not be a compatibility wrapper. It should be direct package
composition at the usage site:

- Keep `PuCell` for the row opener.
- Keep `PuDrawer` for the overlay shell, using its title/default/footer slots.
- Replace the preset/candidate list wrapper with `PuChipGroup wrap`.
- Render each preset option as direct `PuChip as="button" type="button"`.
- Use `PuChip selected` for current selection and `PuChip removable` for
  custom values that are still represented in the option list.
- Use `PuChipInput` for the custom preference entry lane. This may replace the
  local plus-chip + draft-input mode with a persistent compact custom-entry
  field if that produces simpler state and acceptable UX.
- Replace local error paragraphs with `PuInlineNotice tone="error"`.
- Keep drawer footer actions as direct `PuButton`.

## Refactor Direction

After the package-composition pass, split logic by responsibility if the diff
remains readable:

- tag normalization and category-prefix formatting
- visible cell summary derivation
- drawer selection state and save/cancel lifecycle
- custom tag draft/add/remove/submission behavior

The likely extraction target is a composable beside the component, not a new
shared UI wrapper. This is domain behavior, not generic design-system surface.

## Open Design Question

`PuChipInput` can be used in two reasonable ways:

1. Custom-entry lane only: display existing custom values as editable chips in
   a separate input lane, while preset options stay in the main chip group.
2. Add-only helper: keep custom values in the main chip group and use
   `PuChipInput` only to commit draft labels.

The first option uses `PuChipInput` more honestly as a string-array field and
removes more local UI state. It changes the drawer layout more. The second
option changes less visually but risks treating `PuChipInput` like a hidden
text input with extra ceremony.

Current recommendation: prefer option 1 unless implementation evidence shows
that category-prefix normalization or submission bookkeeping becomes harder
than the removed local markup is worth.

## Proposed Execution Slice

1. Implement the direct composition pass inside
   `FormModePreferenceControl.vue`.
2. Remove local `tag-pill*` and `inline-message*` CSS.
3. Keep the public component contract unchanged:
   `eventId`, `modelValue`, `presetTags`, and `update:modelValue`.
4. Add or update focused tests only if state ownership moves out of the
   component or an existing test covers the behavior through brittle markup.
5. Reassess whether a composable extraction is still needed after package
   composition reduces the template and CSS.

## Implementation Notes

Status: completed.

Implemented in
`apps/frontend/src/domains/event/ui/controls/form-mode/FormModePreferenceControl.vue`.

- Kept `PuCell` for visible preference rows and `PuDrawer` for the secondary
  selection workflow.
- Replaced the local preset option pill list with direct `PuChipGroup` +
  selectable `PuChip` usage.
- Moved custom preference entry into a `PuFormItem` + `PuChipInput` lane.
  Custom chips use the `PuChipInput` `chip` slot so they can remain
  selectable and removable through direct `PuChip`.
- Replaced submission failure text with `PuInlineNotice tone="error"`.
- Deleted the local draft-input state:
  `drawerCustomTagEditing`, `drawerCustomTagInput`, and
  `drawerCustomTagMessage`.
- Deleted the local `tag-pill*` and `inline-message*` CSS families.
- Kept category-prefix formatting, category single-selection, uncategorized
  multi-selection, custom label normalization, and submission bookkeeping in
  domain-owned component logic. No local wrapper was introduced.

The pilot showed that package composition can remove most local primitive UI
ownership, but the product-specific selection topology still belongs in the
domain component or a future domain composable.

## Pilot Role

This is Slice 9, but it is also a pilot for the broader composition rollout.
The implementation should record what actually generalized:

- which local UI primitive classes disappeared cleanly
- which package component combinations reduced template or CSS complexity
- which product-state responsibilities still needed domain-owned logic
- which interactions could not be represented by package APIs without custom
  composition

Slice 10 should use that evidence to choose follow-up candidates instead of
assuming every remaining local UI surface fits the same pattern.

## Verification

- Passed `pnpm --filter @partner-up-dev/frontend build`.
- Passed `pnpm --filter @partner-up-dev/frontend lint:tokens`.
- Passed `pnpm test:unit:frontend`.
- Passed targeted source scan:
  `rg -n "tag-pill|inline-message" apps/frontend/src/domains/event/ui/controls/form-mode`
- Passed `git diff --check`.
