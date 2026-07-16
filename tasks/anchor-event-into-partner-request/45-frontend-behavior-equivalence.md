# Frontend Behavior-Equivalence Target

## Boundary

`/prd?type=<PR.type>` replaces the old Event identity, not the old product
experience. UI state and capability ownership change names and dependencies;
the established Landing information architecture and interaction remain.

```text
/prd route page
  ├─ PR Discovery catalog / selected type presentation
  ├─ current type view selection (FORM | CARD | LIST)
  ├─ joinable candidate projection plus LIST browse/history projection
  ├─ PR Authoring options and transient creation suggestions
  ├─ PR Authoring preference/route curation affordances
  └─ community/support presentation

FORM
  ├─ place carousel (location-only or route-only by current config)
  ├─ normal / fuzzy / advanced time selection
  ├─ preference selection
  ├─ recommend existing PRs
  │   ├─ matched -> matched handoff -> ordinary join/detail
  │   └─ candidates -> candidate result actions
  └─ no candidate / create fallback -> ordinary PR structured create

LIST
  ├─ product-local date tabs
  ├─ current/future OPEN, READY, and ACTIVE preview cards
  ├─ up to three recent past date groups containing CLOSED cards
  ├─ transient creation-suggestion preview cards
  └─ explicit create/community/other-type affordances

CARD
  ├─ the former persisted demand-card projection plus creation suggestions
  ├─ stacked swipe deck
  ├─ left = skip locally
  ├─ right/detail = candidate detail or ordinary suggestion create
  └─ empty deck = the established ordinary-create surface
```

## Page Sequence

```text
browser -> /prd?type=RIDE_HAILING
page -> Discovery: type detail + current weighted view
page -> Discovery: persisted OPEN candidate feed
page -> Authoring: current type options
Authoring --> page: route pool + start options + preferences + defaults
Authoring --> page: POI presentation + per-start availability/quota + default selection
page -> user: former Landing shell and selected view

user -> footer mode switch: CARD
page -> route: replace ?view=card
page -> local preference: write CARD under PR.type
page -> user: swipe deck (not a static card grid)
```

There is no configuration revision in this sequence. An explicit query choice
wins, then a user's per-type view preference, then the current server-weighted
view; invalid or all-zero configuration resolves to LIST.
Server view resolution also preserves the established 500 ms timeout fallback
to LIST. A non-timeout type or view-resolution failure provides an explicit
return to the unscoped `/prd` catalog.

## Authoring Sequence

```text
user -> FORM: select route, time, preferences; long press
FORM -> Discovery: recommend(type, route, time windows, preferences)

matched:
  Discovery --> FORM: persisted PR candidate
  FORM -> matched handoff: preview / join
  matched handoff -> /pr/:id: ordinary PR participation

no persisted candidate:
  Discovery --> FORM: no candidate
  FORM -> Authoring: structured create(fields, source=PR_DISCOVERY)
  Authoring --> FORM: ordinary persisted PR id
  FORM -> /pr/:id?entry=create: canonical detail
```

The second branch preserves the former user journey without recreating an
Event-assisted, dummy-materialization, or system-PR command.

The owner split must preserve the old projection semantics as well as the
visible controls: location selection keeps POI gallery/geometry, available
start keys and per-window quota/disabled reasons; recommendation may still
rank same-type candidates at another configured location as near matches; and
CARD keeps its former grouping and representative-card rules rather than
silently becoming a second LIST projection.

## Semantic Mapping

| Former frontend term | Corrected term |
|---|---|
| Anchor Event Landing | PR Discovery type experience |
| other events | other PR types |
| `CARD_RICH` | `CARD` view mode |
| Event demand card | PR Discovery candidate card |
| dummy PR | PR Authoring creation suggestion |
| Event-assisted create | PR Discovery-sourced ordinary Authoring create |
| Event place/time defaults | current PR Authoring options selected by `PR.type` |
| beta group QR | type community entry |
| Event route application | PR type route application |

## Explicit Non-equivalence

The following implementation details intentionally do not survive because they
are the removed concept rather than product behavior:

- Event ids and Event-shaped URLs/query parameters;
- Event DTOs/repositories/endpoints;
- ACTIVE/PAUSED/ARCHIVED;
- assignment revision and revision-scoped storage;
- Event telemetry names and Event BI facts;
- a durable object pretending a transient creation suggestion is a PR.
