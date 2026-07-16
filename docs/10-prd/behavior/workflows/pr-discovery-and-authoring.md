# PR Discovery And Authoring Workflows

This workflow owns the `/prd` discovery journey and its handoff into ordinary
PR Authoring.

## 1. Enter PR Discovery

1. The user opens `/prd`; optional `type`, repeated product-local `date`, and `view=list|card|form` query values scope discovery.
2. Without `type`, `/prd` presents the discoverable PR types as cards. Each card shows the current type title, description, cover, and up to three published POI names (falling back to configured place labels), then opens `/prd?type=<PR.type>`.
3. `/prd` is the canonical entry for `FORM`, `CARD`, and `LIST`. `FORM` gathers criteria and recommendation input, `CARD` groups joinable candidates, and `LIST` presents the established date-based browse history.
4. View ratios are current presentation policy. The current default vector remains `FORM=50`, `CARD=50`, `LIST=0`, configured overrides remain unchanged, no assignment/history or rebucketing metadata is persisted, and an all-zero or missing configuration falls back to `LIST`.
5. If server view resolution exceeds 500 ms, the page falls back to `LIST`. A non-timeout type or view-resolution failure shows an explicit action back to the unscoped `/prd` type catalog.
6. Home may highlight the same type cards and link to the unscoped catalog. Support routes to the About type-community directory, while PR detail may link back to the catalog; none of those entries carries an event or context identity.

## 2. Reach A Type Community

1. A PR type may expose a type-community QR asset through its current Discovery type detail. It is not an independent event, group lifecycle, or persisted participant relation.
2. About lists discoverable types and resolves a type detail only after the user chooses that type. A PR detail resolves the current PR's type for its community entry. Both show the configured QR when present and a clear unavailable state otherwise.
3. After a successful join, the same type community is offered when its QR is present. The official-account follow prompt remains independent: either prompt can appear alone, or both can appear together.

## 3. Use Form Mode Recommendation

1. In `FORM`, the user selects one concrete place, start/end time, and optional preferences before the system reveals candidate `PR`s. Configured locations and routes are suggestions; route choices carry concrete route geometry.
2. Type-owned start rules may provide concrete time suggestions with optional description copy. The user may also enter a custom concrete time window; no editor mode or fuzzy-time object is persisted.
3. Published preferences come from the current type catalog. New labels may be submitted independently for moderation without blocking recommendation.
4. Submission stays inside `/prd`; route-local state carries selected place, time, preferences, recommendation, and result state.
5. If a desired location is absent, the location control opens a POI application. The application creates a pending POI independent of any PR.
6. Recommendation returns one matched candidate plus an ordered list. A no-match result keeps candidate actions and a handoff to PR Authoring.
7. With no match and no candidates, the selected conditions are handed to ordinary PR Authoring. Discovery itself never creates a synthetic PR.
8. Opening a recommended candidate enters canonical `/pr/:id`; any join or waitlist action then uses the ordinary PR flow on that page.

## 4. Browse List, Card, And Search Results

1. Discovery may scope records by one `PR.type` and one or more product-local dates.
2. Persisted PR previews identify records by time, place, visible status, and participant count without repeating a second identity.
3. `LIST` shows `OPEN`, `READY`, and `ACTIVE` records for current/future date groups. It also retains at most the three most recent past date groups that contain `CLOSED` records and shows only `CLOSED` records inside those groups; `EXPIRED` records stay hidden.
4. `CARD` groups joinable `OPEN` candidates for presentation while candidate actions resolve to canonical `/pr/:id` detail. Closed history never enters its deck.
5. LIST and CARD may preserve established transient creation-suggestion cards. A suggestion has no `prId`, status, canonical path, or persistence until ordinary PR Authoring succeeds.

## 5. Hand Off To PR Authoring

1. `CARD` shows joinable persisted candidates; `LIST` shows its persisted browse projection. Any creation suggestion rendered beside them remains transient and is not a synthetic PR.
2. A FORM no-match state may carry the selected type, concrete time, place, and preferences to ordinary PR Authoring.
3. Handoff state has no PR identity. A PR exists only after the ordinary structured create command succeeds and returns its canonical `prId`.
4. Normal creator identity, validation, draft/publish, and participant-conflict behavior applies; Discovery does not bypass it.

## 6. Create A PR From Discovery

1. The user can create a PR when the current type's PR Authoring policy allows user creation.
2. `/prd` resolves place, time, and preference choices into the same structured payload used by `/pr/new`.
3. The create command is unified with structured creation. Authenticated users create and publish in one operation; anonymous users create a `DRAFT` and publish after authentication.
4. The resulting PR proceeds through the ordinary participation, coordination, and completion loops. Type-community access, platform support, official-account prompts, and POI application links remain separate capabilities.
5. A current creator may use the PR editor after `READY` only for fields allowed by PR-owned policy. Conflicting time edits require explicit participant-release confirmation.

## 7. Submit And Review A POI Location Application

1. The user enters the POI application from the `/prd` location control.
2. The user submits one location name and one image.
3. The system creates a `PENDING` POI; the name becomes the POI label used for PR location matching.
4. The user revisits submitted applications from the success page or `/me`.
5. Operators review applications. Publishing changes status to `PUBLISHED`; rejected applications remain hidden from public reads and may carry a rejection reason.
