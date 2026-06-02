# Admin UI Foundation Protocol Draft

## First Principle

Admin UI is an operating surface for object state changes. The foundation protocol should not start from "page looks", but from the loop an operator repeats:

```text
orient -> select -> inspect -> edit -> validate -> act -> confirm result -> continue
```

The UI foundation should make this loop local, predictable, and recoverable.

## Layer 1: Shell And Workspace Protocol

The existing two-column shell remains directionally correct, but its contract should become stricter.

```text
AdminPageShell
|-- LeftOperatorColumn
|   |-- GlobalNavigation
|   `-- ContextRail
`-- Workspace
    |-- WorkspaceHeader
    |-- WorkspaceFeedbackRegion
    `-- ActiveWorkspaceBody
        |-- ActiveEntityEditor
        |-- ContextualActionBar
        `-- OptionalInspector
```

Protocol claims:

- Global navigation changes route.
- Context rail changes active object or filter context.
- Workspace owns the active object workflow.
- Page-level actions are only for route-wide commands, not for object-local create/save operations.
- Object-local create/save/delete/publish actions belong near the active editor or in a sticky contextual action bar.

## Layer 2: State Ownership Protocol

Candidate controller shape:

```text
WorkspaceController owns:
- selected object ids
- loaded object snapshots
- draft state
- dirty state
- validation state
- command availability
- mutation pending/success/error state
- recovery actions

Rail emits:
- select object intent
- create object intent
- filter/search intent

Field components emit:
- typed value change
- blur/touched signal

Action bars emit:
- named commands
```

This means rail, forms, and action bars are not equal peers passing arbitrary data. They are children of a workspace workflow contract.

## Layer 3: Form Component Family

The unified form field strategy should become a governed Admin form component family.

Candidate primitives:

- `AdminForm`: draft boundary, submit contract, validation summary, dirty guard integration.
- `AdminField`: common label, help, error, disabled reason, required marker, layout density.
- `AdminTextField`
- `AdminTextAreaField`
- `AdminNumberField`
- `AdminMoneyField`
- `AdminPercentField`
- `AdminDateTimeField`
- `AdminTimeField`
- `AdminSelectField`
- `AdminEnumField`
- `AdminToggleField`
- `AdminEntitySelectField`
- `AdminRepeatedGroup`
- `AdminStringListField`
- `AdminJsonField` only for exceptional power-user or migration surfaces.

Field protocol:

- Type decides component, not local page preference.
- Parse/format behavior lives with the field primitive or model adapter.
- Errors are displayed at the field and summarized at the form boundary.
- Disabled state must have an explainable reason when it blocks a likely action.
- Date/time, money, percentage, count, duration, and enum fields need consistent display and input conventions.

## Layer 4: Container Protocol

Containers should encode workflow boundaries, not just decoration.

Candidate components:

- `AdminSection`: logical form section with title, description, local actions, empty/error affordance.
- `AdminPanel`: generic bounded content container when there is no edit workflow.
- `AdminEntityEditor`: object draft and command boundary.
- `AdminObjectRail`: selection/filter rail with count, empty state, create action, and selected state.
- `AdminMutationFeedback`: success/error/pending display tied to a command target.
- `AdminDirtyActionBar`: sticky local save/reset/destructive action zone.

Container rules:

- Do not put important object-local commands only in page-top actions.
- Repeated item controls live inside the repeated group.
- Save/reset/destructive commands live at the editor boundary.
- Page-level containers should not duplicate section-level headings and actions unless the hierarchy is clear.

## Layer 5: Feedback Protocol

Every Admin mutation should answer:

- What is happening now?
- Did it succeed?
- If it failed, why?
- What changed?
- Can I retry, undo, or continue?

Minimum mutation states:

```text
idle -> pending -> success
              `-> failure -> retry or edit
```

Feedback placement:

- Field validation errors: field and form summary.
- Mutation errors: editor or command boundary.
- Route loading errors: workspace boundary.
- Successful save: local confirmation near action boundary, not only implicit data refresh.
- Async or bulk operations: task/status surface, not transient toast only.

## Layer 6: Responsive Density Protocol

Admin responsive behavior should preserve workflow, not merely stack layout.

Desktop:

- Dense two-column operator surface.
- Left rail remains useful for selection.
- Active editor can use multi-column field grids when fields are short and related.
- Local action bar should stay reachable for long forms.

Medium:

- Keep selection and workspace visible when possible.
- Collapse lower-priority panels before hiding actions.
- Avoid full-width cards that waste horizontal space for simple fields.

Narrow:

- Navigation and context rail become explicit panels or drawers.
- Active workflow remains single-column.
- Primary command remains visible near the current editor.

## Product Admin Pilot Interpretation

Product Admin should likely evolve from:

```text
page actions + rail + stacked SPU/SKU/policy editors
```

to:

```text
product workspace controller
|-- product/SKU rail
`-- active editor surface
    |-- SPU editor when SPU is active
    |-- SKU editor when SKU is active or being created
    |-- Cancellation policy editor when SKU policy is active
    `-- local action/feedback boundary
```

The pilot should test whether the protocol removes the current top/bottom travel, field inconsistency, and implicit feedback.

## Open Decisions

1. Should `AdminForm` live under `domains/admin/ui/forms` as Admin-specific infrastructure, or under `shared/ui/forms` with Admin adapters?
2. Should Product Admin show SPU, SKU, and policy as simultaneous stacked editors, tabs, or an active-object editor with side inspector?
3. Should create actions live in the rail, the workspace action bar, or both when the action depends on current selection?
4. Should success feedback be inline-only, toast-only, or a combined protocol by operation criticality?
5. How much of the current `BentoItem` pattern should survive after `AdminSection` and `AdminEntityEditor` exist?
