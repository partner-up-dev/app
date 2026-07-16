# Frontend Product Regression — 2026-07-16

## Observation

The implemented `/prd?type=RIDE_HAILING` experience is not behaviorally
equivalent to the former Anchor Event Landing Page. The regression was reported
directly against the running product and is independently visible in the source
comparison.

The current page is a generic scaffold with a top view switch, static candidate
buttons/cards, and a conventional datetime form. The former Landing experience
owned a reveal-footer shell, type-specific header and back behavior, an
other-types drawer, a sticky bottom view switch, date-grouped list cards, a
swipeable card deck, a route-aware place carousel, the normal/fuzzy/advanced
time control, preference selection, long-press recommendation, matched-PR
handoff, no-match candidate actions, creation affordances, and the platform
footer/follow prompt.

## Evidence

| Product area | Former behavior in `HEAD` | Regressed working-tree behavior |
|---|---|---|
| Page shell | `AnchorEventLandingPage.vue` uses `PuPageScaffold` with `footer-placement="reveal"`, detail header, back action, other-events drawer, sticky footer mode switch, `PageFooter`, and follow nudge. | `PRDiscoveryPage.vue` renders a static header and `PRDiscoveryPanel` only. |
| View selection | LIST / CARD_RICH / FORM live in the footer and each owns a distinct product interaction. | LIST / CARD / FORM are exposed as a top toolbar around generic slots. |
| LIST | Product-local date tabs, full `PRPreviewCard` facts, creation suggestions/action card, empty/exhausted states, and type support affordances. | Plain text buttons with title and place only. |
| CARD | Swipe deck, stacked previews, skip/detail gestures, creation suggestions, and an empty-deck create state. | Static location-group `PuCard` grid. |
| FORM | Route/location carousel, route direction reversal, normal/fuzzy/advanced time selection, preferences, long-press CTA, matched handoff, candidate result page, and creation fallback. | Native datetime fields, a generic place editor, and inline notices/buttons. |
| RIDE_HAILING | Route-only configuration initially renders the route carousel and preserves route geometry/direction. | The empty generic place model initially renders a location input even when only routes are configured. |

The primary historical sources are:

- `apps/web/src/pages/AnchorEventLandingPage.vue`
- `apps/web/src/domains/event/ui/surfaces/AnchorEventFormModeSurface.vue`
- `apps/web/src/domains/event/ui/surfaces/AnchorEventListModeSurface.vue`
- `apps/web/src/domains/event/ui/surfaces/AnchorEventCardModeSurface/**`
- `tests/scenario/anchor-event/anchor-event-landing-distribution.scenario.test.ts`
- `tests/scenario/anchor-event/anchor-event-form-mode-participation.scenario.test.ts`

## Cause

The removal design crossed the intended boundary. It correctly removed Event
identity and authority, but then treated frontend product capabilities as
replaceable projections. The task packet encoded retirement or replacement of
several user-visible behaviors without sufficient product authority. That made
the implementation a product redesign rather than an owner migration.

## Corrected Invariant

AnchorEvent removal may change capability ownership, data selection, endpoint
names, route identity, telemetry vocabulary, and implementation structure. It
must not change the established product behavior or visual interaction merely
because the old code lived under an Event namespace.

The correction therefore preserves or migrates the former Landing behavior
under PR-type-scoped owners while still enforcing all explicit removal
constraints:

- `/prd?type=<PR.type>` remains canonical;
- no `AnchorEvent`, Event DTO, `eventId`, `fromEvent`, or old Event route;
- no Event lifecycle or replacement config lifecycle;
- no assignment/config revision or configuration-version mechanism;
- `PR.type` remains the direct selection key;
- all persisted collaboration remains an ordinary `PartnerRequest`;
- `CARD_RICH` becomes the precise view name `CARD`, without replacing its
  swipe/deck behavior;
- transient creation suggestions are not durable or system-owned PRs, but keep
  their established presentation and create an ordinary PR through PR
  Authoring when activated.

## Recurrence Guard

The migrated tests must assert product behavior, not only endpoint reachability:

1. the reveal-footer shell, detail header, back/type switch, and footer mode
   control;
2. all three configured views and all-zero-to-LIST fallback;
3. RIDE_HAILING route-only selection and direction reversal;
4. LIST date tabs, complete current cards, and the bounded CLOSED-history groups;
5. CARD swipe/skip/detail and empty/create states;
6. FORM long-press, matched handoff, no-match candidate/create behavior, and
   stale-result reset;
7. ordinary `/pr/:id` creation/detail/join outcomes without Event identity.

## Resolution Evidence

The corrected implementation restores the former behavior under PR-owned
components rather than retaining the regressed generic substitutes.

- The page again uses the reveal-footer scaffold, detail header, other-type
  drawer, sticky footer mode switch, platform footer, and follow prompt.
- The unscoped `/prd` catalog again uses a type-level discovery card rather
  than generic cards and nested open buttons. It preserves the former catalog
  header/back action, vertical shuffled card list, cover fallback order,
  title/description, and POI-name/place-label chips before routing to
  `/prd?type=<PR.type>`.
- Home again presents the discovery-highlight rail and catalog entry using the
  same type cards; About again exposes per-type community QR access; Support,
  PR detail, and successful join regain their equivalent discovery/community
  entries. These surfaces resolve only PR Discovery type data and canonical
  `/prd` routes, not Event ids, Event DTOs, or Event lifecycle state.
- FORM again owns the route/location carousel, direction reversal,
  normal/fuzzy/advanced time selection, preferences, long-press search,
  matched handoff, candidate results, and ordinary-create fallback.
- LIST again owns product-local date tabs, complete candidate previews,
  transient creation suggestions, and the established bottom affordances.
- CARD again owns the stacked swipe deck, local skip, detail/create actions,
  and the established empty-deck ordinary-create surface.

Two behavior bugs found during browser verification were fixed rather than
accepted as migration differences: the outer route carousel now captures a
pointer only after horizontal dragging is established, so ordinary route-card
clicks reach their target; and FORM result state is cleared when leaving FORM,
so a prior recommendation cannot leak through a later view switch. LIST now
preserves the former status/time policy: current and future groups show
OPEN/READY/ACTIVE records, at most the three most recent ended groups containing
CLOSED records remain available, and expired OPEN or EXPIRED records stay
hidden.

The final comparison also recovered the former view-resolution failure policy.
A view decision that does not resolve within 500 ms falls back locally to LIST
without persisting that fallback; a real server failure remains visible and
offers an explicit escape to the unscoped `/prd` catalog. Real-browser
verification caught and fixed a zero-width error surface that component tests
could not expose.

Verification after the correction:

- `pnpm test:unit:web`: 39 files, 130 tests passed;
- focused real-browser PR Discovery scenario: 1 file, 10 tests passed against
  the real Web client, backend HTTP server, and isolated database;
- `pnpm check:static`: passed, including type, lint/policy, configuration,
  report-first dead-code/security layers, and backend/Web builds;
- 390 x 844 captures were inspected for RIDE_HAILING FORM, LIST, and CARD.
