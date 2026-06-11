# Issue 249 - Concrete Route Place Control Contract

## Objective & Hypothesis

- GitHub issue: https://github.com/partner-up-dev/mvp-HA/issues/249
- Classification: `Intent`
- Active mode: `Execute`.
- Product decision: Anchor Event Place Control must be able to reverse a route locally. The reversed direction may not exist as a route-pool entry.
- Product decision: Place Control emits a concrete selected place. For route mode, the emitted value carries `PR.route`.
- Product decision: recommendation, Form Mode auto-create, and event-assisted create must not submit route-pool entry identity as route selection authority.

## Confirmed Contract

```text
Route pool source material:
  route: A -> B

Place Control selected value:
  forward: { kind: "route", route: A -> B }
  reverse: { kind: "route", route: B -> A }

Recommendation request:
  place: { kind: "route", route }

Form Mode auto-create request:
  place: { kind: "route", route }

Event-assisted PR create:
  fields.route = route
  fields.location = null
```

Route-pool entry ids may remain only as internal rendering keys for source
options. They must not be part of the submitted route selection contract.

## Coupling Removed In This Slice

- `AnchorEventCarouselPlaceSelector.vue` no longer commits option ids as selected place state.
- `AnchorEventFormModeSurface.vue` stores the committed concrete selected place.
- Form Mode recommendation submits `{ kind: "route", route }`.
- Form Mode auto-create submits `{ kind: "route", route }`.
- Backend recommendation, auto-create, and dummy materialization route branches consume the submitted route directly.
- Event-assisted create, pending WeChat replay, and telemetry no longer carry route-pool sidecars.
- Dummy PR materialization route selection submits the concrete route.

## Target Topology

```text
GET form-mode data
  -> route pool options include source route payloads
  -> Place Control derives forward/reverse concrete routes
  -> Place Control emits concrete selected place
  -> Form Mode state stores concrete selected place
  -> recommendation / create requests submit concrete place
  -> PR create persists concrete route
```

## Recommendation Route Rule

Recommendation candidate matching uses the submitted concrete route. It does
not broaden route-mode selection to other route-pool alternatives.

## UI Decisions

- Keep the swap affordance in the selected route caption/description area.
- Use `PuButton` ghost icon button.
- Rotate the swap icon by 90 degrees so the arrows read vertically.
- The map and route description always reflect the active concrete route.

## Durable Docs To Update

- `docs/10-prd/behavior/workflows.md`
- `docs/10-prd/behavior/rules-and-invariants.md`
- `docs/20-product-tdd/cross-unit-contracts.md`
- `apps/frontend/src/domains/event/ui/AGENTS.md` if the Form Mode topology note still talks about id-based selection.

## Implementation Boundary

- Frontend model:
  - define concrete selected-place route contract without route-pool entry id
  - add route reversal helpers
  - keep route option ids only for internal carousel identity
- Place Control:
  - expose concrete selected place through `v-model` or a dedicated update event
  - switch active route by reversing route payload
  - rotate swap icon 90 degrees
- Form Mode:
  - store and submit concrete selected place
  - build recommendation and auto-create request bodies from concrete route
  - remove route-pool sidecars from create fallback and replay paths
- Backend:
  - change recommendation and auto-create schemas to accept `route: PRRoute`
  - match route candidates against submitted concrete route
  - remove route-pool entry id from operation-log details where it represented submitted selection
- Tests:
  - frontend unit tests for reverse route emission
  - query body tests for route payload submission
  - backend use-case tests for concrete forward and reverse route inputs
  - scenario updates replacing route-pool entry id assertions with concrete route assertions

## Verification Plan

- `pnpm exec vitest run --project frontend-unit apps/frontend/src/domains/event/model/place-options.test.ts apps/frontend/src/domains/event/queries/useCreateFormModeAutoPR.test.ts apps/frontend/src/domains/event/queries/useMaterializeDummyPR.test.ts apps/frontend/src/domains/event/queries/useCreateEventAssistedPR.test.ts` - passed
- `pnpm exec vitest run --project backend-unit apps/backend/src/domains/anchor-event/use-cases/create-form-mode-auto-pr.test.ts apps/backend/src/domains/anchor-event/use-cases/materialize-dummy-pr.test.ts` - passed
- `pnpm --filter @partner-up-dev/frontend build` - passed
- `pnpm exec vitest run --project backend-scenario apps/backend/tests/anchor-event/anchor-event-route-pool.scenario.test.ts` - passed
- `pnpm exec vitest run --project system-scenario tests/scenario/anchor-event/anchor-event-form-mode-participation.scenario.test.ts` - passed, including the route-direction toggle path where the submitted recommendation, auto-create body, and created PR detail use the reversed concrete route.
- `pnpm exec vitest run --project system-scenario tests/scenario/anchor-event/anchor-event-landing-distribution.scenario.test.ts` - failed in pre-existing/adjacent UI scenario interaction points: Card mode empty surface visibility timeouts and List mode create button click interception by the other-event expandable card. No route contract assertion failed in that run.

## Execution Notes

- Place Control stores source route option identity only for carousel rendering.
- The committed selected place is now concrete: location id or `PR.route`.
- Recommendation, Form Mode auto-create, dummy materialization, event-assisted
  create, and pending WeChat replay no longer submit route-pool entry identity.
- Backend route branches consume the submitted route directly and do not validate
  it against the Anchor Event route pool.

## Next Step

Decide separately whether to harden the unrelated landing distribution scenario
click/visibility waits.
