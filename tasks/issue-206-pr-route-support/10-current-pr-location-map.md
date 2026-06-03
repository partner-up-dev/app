# Current PR Location Map

## Durable Owners

Product truth:

- `docs/10-prd/behavior/capabilities.md`
- `docs/10-prd/behavior/workflows.md`
- `docs/10-prd/behavior/rules-and-invariants.md`

Cross-unit truth:

- `docs/20-product-tdd/cross-unit-contracts.md`
- `docs/20-product-tdd/system-state-and-authority.md`

Backend runtime:

- `apps/backend/src/entities/partner-request.ts`
- `apps/backend/src/repositories/PartnerRequestRepository.ts`
- `apps/backend/src/controllers/partner-request.controller.ts`
- `apps/backend/src/domains/pr-core/use-cases/create-pr-structured.ts`
- `apps/backend/src/domains/pr-core/use-cases/create-pr-natural-language.ts`
- `apps/backend/src/domains/pr-core/use-cases/update-pr-content.ts`
- `apps/backend/src/domains/pr/read-models/get-pr-detail.ts`
- `apps/backend/src/domains/pr/read-models/public-pr-view.service.ts`
- `apps/backend/src/domains/pr/sharing/pr-share-metadata.service.ts`
- `apps/backend/src/entities/anchor-event.ts`
- `apps/backend/src/domains/anchor-event/use-cases/get-form-mode-data.ts`
- `apps/backend/src/domains/anchor-event/use-cases/get-event-detail.ts`

Frontend runtime:

- `apps/frontend/src/pages/PRCreatePage.vue`
- `apps/frontend/src/pages/PRPage.vue`
- `apps/frontend/src/pages/AdminPRPage.vue`
- `apps/frontend/src/lib/validation.ts`
- `apps/frontend/src/domains/pr/model/types.ts`
- `apps/frontend/src/domains/pr/ui/forms/PRForm.vue`
- `apps/frontend/src/domains/pr/ui/composites/PRFactsCard.vue`
- `apps/frontend/src/domains/pr/ui/primitives/PRPreviewCard.vue`
- `apps/frontend/src/domains/pr/use-cases/usePRCreateFlow.ts`
- `apps/frontend/src/domains/pr/use-cases/usePRDetailHead.ts`
- `apps/frontend/src/domains/pr/use-cases/usePRRouteShareDescriptor.ts`
- `apps/frontend/src/domains/event/ui/controls/form-mode/FormModeLocationControl.vue`
- `apps/frontend/src/domains/event/ui/primitives/EventPRCreateCard.vue`
- `apps/frontend/src/domains/event/use-cases/useEventAssistedPRCreateFlow.ts`

## Current Location Shape

Backend entity:

- `partner_requests.location` is nullable text.
- `partnerRequestFieldsSchema.location` is `z.string().nullable()`.
- `createStructuredPRSchema` currently equals `partnerRequestFieldsSchema`.

Frontend form:

- `PRFormFields.location` is inherited from backend `PartnerRequestFields`.
- Empty location input is normalized to `null`.
- `toPartnerRequestFields` and `toUserUpdatePRContentFields` pass `location` through.

## Current Location Effects

Display identity:

- `PRPage.vue` page title fallback is `title -> core.location -> core.type -> fallback`.
- `pr-share-metadata.service.ts` canonical share title fallback is `title -> location -> type -> generic label`.
- Canonical share description includes `type`, `location`, `budget`, first two preferences, and notes.
- Canonical share revision includes `location`.

PR facts:

- `PRFactsCard.vue` renders `core.location`.
- `usePRLocationGallery` resolves gallery images from `core.location` through POI name lookup.
- Meeting-point fallback reads the single `location` string.

Domain behavior:

- POI availability validates PR time windows against the selected location.
- Booking/support resources match location ids.
- Waitlist alternative reminders match exact normalized `type + location`.
- Event-assisted create resolves selected event location into `fields.location`.
- Anchor Event currently owns `locationPool` only; route pool introduces a new event-owned place pool mode.

Admin:

- Admin PR workspace create/edit uses the same content fields.
- Admin PR selection, filters, and preview surfaces display location text.

## Issue 206 Blast Radius

High confidence backend changes:

- Add route schema/type and JSONB column to `PartnerRequest`.
- Add validation for exactly one place mode.
- Update create/update/public read/detail read contracts.
- Update share metadata to use route summary.
- Add Anchor Event `routePool` and enforce `locationPool` / `routePool` mutual exclusion.
- Update event-assisted create to map selected route-pool entries into `fields.route`.
- Clear poster/share cache when route changes.

High confidence frontend changes:

- Extend `PRFormFields` and validation.
- Add route editor model helpers and UI components under `domains/pr`.
- Add place-mode control to PR create/edit/admin forms.
- Add route facts/map display to PR detail.
- Upgrade Anchor Event Form Mode and Card/List creation controls from location-only controls to place selectors.
- Update title/meta/share descriptor consumers through backend canonical share metadata.

Likely follow-up changes:

- Natural-language creation may need parser prompt and schema expansion if route input from text enters scope.
- Route-mode POI availability and meeting-point fallback policy is now explicit: `location = null` makes existing location-driven paths short-circuit.
- Waitlist alternative reminder matching needs a route-mode matching rule before route PRs become waitlistable.

## Collision With Issue 201

`tasks/issue-201-poi-upgrade/` is actively changing POI identity and location matching. Issue 206 should treat current POI changes as live context. Route-mode implementation should avoid assuming final POI lookup surfaces until issue 201 settles or until route-mode avoids POI-backed behavior in the first slice.
