# PR Discovery Route And Frontend Target

## Canonical Product Entry

```text
/prd
  -> select/resolve PR.type and discovery criteria
  -> find existing PR candidates
       -> /pr/:prId
     or no match
       -> PR Authoring creates an ordinary PR
       -> /pr/:prId
```

- `/prd` is the public abbreviation for PR Discovery.
- Internal names use `PRDiscoveryPage`, `PRDiscoveryCriteria`, and `PRDiscoveryCandidate`; they do not use the ambiguous acronym `PRD`.
- The route owns discovery navigation, not an Event resource.

## Route State

Recommended canonical query shape:

```text
/prd?type=<existing PR.type>&date=YYYY-MM-DD&date=YYYY-MM-DD&view=list|card|form
```

| Query | Meaning | Constraint |
|---|---|---|
| `type` | Existing `PR.type` value that scopes optimization and matching | Optional at catalog entry; not a new identity or FK. |
| repeated `date` | Product-local calendar dates for discovery | Reuses current search intent; normalize and bound at the route boundary. |
| `view` | Optional retained discovery presentation | Include only if the three current views survive; internal name is `viewMode`. |

Not allowed in canonical route/store/handoff state:

- `eventId`
- `fromEvent`
- `anchorEventContext`
- `assignmentRevision` or any config revision
- Event-shaped hidden state used to recover `PR.type`

Place/time/preference form input remains local/session state unless a separate share/back-resume requirement justifies query serialization. UI workflow state such as selection/loading/results/no-match/error is `uiState`, not URL identity or business `status`.

## Route Disposition

| Current route | Target |
|---|---|
| `/events` | `/prd` catalog/default discovery state |
| `/events/search` | `/prd` with type/date criteria |
| `/events/:eventId` | Removed from canonical frontend |
| `/e/:eventId` | Removed from canonical frontend |

If legacy links require a sunset period, the adapter must be isolated and must never be referenced by canonical business code. Prefer an edge/server redirect that resolves old id to `PR.type`; otherwise a redirect-only router record is temporary infrastructure with a named deletion date. Direct retirement may return `410` with a stable legacy-route Problem code. The final frontend route table contains only `/prd` for discovery.

## Frontend Ownership

### Route Page

`PRDiscoveryPage.vue` is a thin route entry. It parses route state and selects one workflow owner. It does not duplicate surface queries, commands, auth replay, or telemetry.

### PR Discovery

Owns:

- type catalog and selected discovery scope;
- criteria and recommendation;
- existing PR candidate list/card/group projections;
- no-match result and handoff to Authoring;
- discovery view state and discovery telemetry.

### PR Authoring

Owns:

- assisted create controls and validation;
- time/place/preference input models;
- creation suggestion materialization;
- WeChat/auth replay for create;
- creation command and resulting `prId`.

### Other Owners

- location/route helpers move to their actual domains or shared UI;
- the old beta/Event vocabulary retires, while the visible type community entry moves to PR Discovery presentation and keeps community/support content authority separate;
- route applications move to PR Authoring curation keyed by `PR.type`;
- preference submissions move to config curation/Moderation or retire.

## Required Frontend Removal

- remove `apps/web/src/domains/event/**` after each surviving capability has a destination;
- consolidate the old public URLs into `/prd` without replacing the established Plaza/Landing information architecture or FORM/CARD/LIST product behavior;
- remove Event query-key namespace and eventId-based PR search key;
- remove Event props/state from matched-PR handoff, PR join/waitlist context, PR detail routing, and pending WeChat actions;
- remove or replace backend-inferred `anchorEventContext` from the frontend PR detail type surface;
- migrate i18n, testids, CSS classes/data attributes, telemetry unions, and fixtures in the same semantic slice as their owner;
- remove admin Anchor Event frontend vocabulary; surviving controls are split into qualified PR policy/discovery, Route, Moderation, Community, or Analytics owners.

## Candidate Versus Creation Suggestion

The current UI presents real PR cards and not-yet-persisted creation opportunities with similar visual weight. The target preserves that product behavior while making the domain distinction explicit:

```text
PRDiscoveryItem
  - candidate: persisted PartnerRequest with prId/status
  - creationSuggestion: transient type/time/place/preference input with no PR identity/status
```

A creation suggestion is never a durable or system-owned PR. It may keep the established preview-card presentation, but its code/type/test vocabulary must say creation suggestion. A user activation invokes the ordinary PR Authoring command with source `PR_DISCOVERY`, after which navigation uses the returned `prId`.

## Product-Behavior Preservation

The owner migration is not authority to redesign the Landing experience. Under
`/prd?type=<PR.type>` the following former behavior remains required:

- detail title/description header, back semantics, other-type drawer, reveal
  footer, bottom mode switch, page footer, and the platform follow prompt;
- LIST date tabs, complete PR preview cards, creation opportunities, and
  empty/exhausted states;
- CARD swipe deck, stacked previews, skip/detail gestures, keyboard behavior,
  creation opportunities, and empty-deck authoring;
- FORM route/location carousel, route reversal, normal/fuzzy/advanced time
  selection, preferences, long-press recommendation, matched handoff,
  candidate results, and creation fallback;
- type-specific route application and community entry affordances.

Implementation modules and API contracts may become smaller and more precise,
but a different generic card grid or datetime form is not a migration.

## Backend Contract Boundary Needed By Frontend

The frontend cannot become Event-free by wrapping `/api/events` in renamed composables. Before the Event domain is deleted from web code, backend must expose PR-owned contracts selected by `type`, for example under PR Discovery/Authoring routes. Exact endpoint shape belongs to the later technical design.

New frontend contracts must not expose:

- Event DTOs or `anchorEventId`;
- Event-specific Problem codes as the UI's domain vocabulary;
- landing assignment revision;
- hidden Event identity in query keys or telemetry context.

Old backend APIs, telemetry facts, and BI columns may exist only in a temporary compatibility/control-plane layer while the full removal proceeds.
