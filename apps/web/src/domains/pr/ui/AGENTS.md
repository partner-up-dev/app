# PR UI Local Rules

This folder owns PR-domain UI surfaces, sections, forms, composites, modals,
and primitives.

## Component Contracts

- `composites/PRPreviewCard.vue`: PR-domain preview card for PR list rows and search results. Accepts `prId`, owns the PR detail query, and supports route override, cover image, contextual time label, and an `actions` slot. Keep canonical PR facts inside the owned detail query; keep call-site props limited to caller context.
- `primitives/PRPreviewCardFrame.vue`: pure presentation frame for PR previews. It accepts projected display values and must not import queries.
- `forms/DateTimeRangePicker.vue`: standalone time-window picker for start/end date-time.
- `forms/PREditor.vue`: unified structured PR create/edit editor using `src/lib/validation`; pass `prId` only for edit mode.

## Boundaries

- PR UI may compose shared primitives from `src/shared/ui`.
- Reusable PR behavior belongs in PR-domain components or composables, not page files.
- Cross-domain PR Discovery/search surfaces should pass PR identity and caller-owned context into PR components instead of duplicating canonical PR facts.
