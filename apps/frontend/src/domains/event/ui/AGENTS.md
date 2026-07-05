# Event UI Local Rules

This folder owns event-domain UI surfaces, controls, composites, and primitives.

Read before changing Form Mode:

- Product / cross-unit contract: `docs/20-product-tdd/event-context-contracts.md`
- Frontend-local choreography: `docs/30-unit-tdd/frontend-event-form-mode.md`
- PR preview boundary: `apps/frontend/src/domains/pr/ui/AGENTS.md`

## Local Hazards

- `AnchorEventFormModeSurface.vue` owns the route-level Form Mode flow.
- Form Mode controls should own local interaction state and emit committed values through narrow `v-model` or event contracts.
- Route selections should submit concrete `PR.route` shape, not route-pool entry identity.
- Event UI should pass PR identity and caller-owned context into PR-domain components instead of duplicating canonical PR facts.
- The special long-press animation belongs only to the Form Mode primary CTA.

## Component Contracts

- `composites/AnchorEventRadioCardCarousel.vue`: event-domain carousel selector that centers and enlarges the selected Anchor Event card while keeping event-card content reuse local to the event domain.
