# AnchorEvent Capability Disposition

This is a migration inventory, not a target DTO. “Relocate” means move behavior to its real owner; it does not require preserving the current field or table shape.

## Persisted Field Families

| Current AnchorEvent data | Current product role | Target owner | Initial disposition |
|---|---|---|---|
| `id` / `anchorEventId` | Event-shaped lookup and attribution identity | none in canonical product flow | Retire from frontend and new PR contracts; allow only temporary migration/history adapters. |
| `type` | Key that matches `PR.type` | existing `PR.type` vocabulary + runtime config lookup | Preserve the value and name `type`; do not create another key. |
| `title`, `description`, `coverImage` | Type catalog and discovery presentation | PR Discovery presentation | Relocate if still required; never use as PR identity. |
| `locationPool`, `routePool` | Suggested/allowed assisted-create places | PR Authoring input + PR Discovery criteria | Split by consumer; POI/Route retain fact authority. |
| `timePoolConfig` / start rules | Suggested creation windows and discovery membership | PR Authoring + PR Discovery | Split generation from matching; rename ownership predicates precisely. |
| `defaultMinPartners`, `defaultMaxPartners`, `defaultPrNotes` | Create-time defaults | PR Authoring | Materialize into PR fields; later config edits do not rewrite PRs. |
| confirmation offsets, join-lock offset, `joinGateConfig` | Create-time participation policy snapshot | PR Authoring materialization; PR Participation execution | Keep PR-owned snapshots; remove Event ownership language. |
| `meetingPoint`, `locationMeetingPoints` | Fallback meeting guidance | PR Coordination, with POI facts | Relocate fallback resolution; PR override remains authoritative. |
| `participationFrequencyLimit` | Join frequency decision | PR Participation | Relocate as a qualified policy; evaluate current behavior without a version mechanism. |
| `feedbackQuestionnaireTemplateId` | Template selected when creating a PR questionnaire instance | PR Authoring selection + PR Completion consumption | Preserve mounted PR instance authority; relocate selection. |
| `prCreationPolicy` | Whether users may create this type through assisted flows | PR Authoring | Relocate as creation eligibility, distinct from discovery visibility. |
| `fullPrExpansionPolicy` | Whether a full PR creates more supply | PR Participation → PR Discovery/Authoring handoff | Split decision from creation action; avoid Event-owned expansion. |
| Time-window editor default mode | Initial normal/fuzzy/advanced authoring behavior | PR Authoring UI profile | Relocate with the established editor behavior; rename by owner and select directly by `PR.type`. |
| `status` (`ACTIVE/PAUSED/ARCHIVED`) | Old Anchor Event lifecycle, inconsistently used as catalog/create gates | no target owner | Retire the field and state machine. Handle non-ACTIVE rows as a one-time migration decision; do not recreate a policy/config status. |
| `betaGroupQrCode` | Type-specific community/support entry rendered by Discovery | PR Discovery presentation with the community/support owner retaining content authority | Relocate as `communityQrCode`; the beta/Event name retires, not the visible capability. |
| `createdAt`, `updatedAt` | Operator/persistence metadata | runtime config/admin | Preserve only as ordinary record metadata, not config versioning. |

## Behavior And Surface Families

| Current capability | Target meaning / owner | Disposition |
|---|---|---|
| Event Plaza / other Events | Browse PR types and discovery entry points | PR Discovery catalog. |
| Event detail / landing | Discovery scope and authoring suggestions for one `PR.type` | `/prd` route state + PR Discovery/Authoring projections. |
| Event PR search | Search existing PR candidates by type and dates | PR Discovery search; criteria `{ type, dates }`. |
| FORM / CARD_RICH / LIST assignment | Discovery/Authoring presentation selection | Preserve as PR-owned FORM/CARD/LIST views over one discovery/authoring contract; all-zero falls back to LIST. |
| `assignmentRevision` and landing local storage | Experiment rebucketing/stickiness | Retire revision semantics. Preserve selected view by `PR.type` only if needed; never add a replacement version/rebucketing mechanism. |
| Demand cards | Swipeable candidate/creation-suggestion deck | PR Discovery presentation over the joinable candidate projection plus PR Authoring suggestions. Preserve swipe, skip, detail, keyboard, and empty-deck behavior; only the Event-owned projection retires. |
| “Dummy PR” | Not-yet-persisted type/time/place/preference creation opportunity | PR Authoring creation suggestion rendered by Discovery | Preserve its established card/list presentation while naming it `PRAuthoringCreationSuggestion`; it has no PR id/status and is never persisted before user activation. |
| Materialize dummy / auto create | User-triggered creation from a configured suggestion or completed criteria | PR Authoring ordinary structured-create command | Preserve the user journey through the ordinary PR create boundary with source `PR_DISCOVERY`; remove the special Event/dummy endpoint and identity rather than removing the interaction. |
| Form recommendation | Match existing PR candidates from criteria | PR Discovery recommendation. |
| Preference-tag submission/moderation | Candidate input for a type-specific preference catalog | PR type config curation or Moderation; retire if unsupported. |
| Route application | Proposal to extend a type's Authoring/Discovery route choices | PR Authoring curation keyed directly by `PR.type` | Relocate the submission/review workflow and migrate rows by source type; remove the Event FK and vocabulary. |
| Full-PR expansion | Capacity decision followed by new supply | PR Participation decision, then Authoring/Discovery handoff. |
| Event-derived title/share fallback | Contextual presentation | Retire the external fallback. Canonical share metadata derives from persisted PR facts, using `PR.type` itself when the PR has no title. |
| Event funnel / BI dashboard | Historical discovery experiment measurement | Retain raw telemetry history, retire the Event-specific fact views/dashboard, and expose live measurement through PR Discovery analytics. |

## Current Objects That Must Not Survive By Rename Alone

- `AnchorEventPRContextRepository`: it synthesizes a cross-domain projection and performs PR reads; it is not a persistence-only repository.
- `materializeEventDefaultsForPR`: it combines Authoring defaults, Participation rules, and Completion questionnaire side effects.
- admin `create/updateAnchorEvent`: one mutation validates and writes unrelated lifecycle and support concerns.
- `AnchorEventLandingPage.vue`: its monolithic orchestration does not survive, but its information architecture and interaction behavior must survive in PR-owned components.
- `AnchorEventDummyPR`: the name and false PR identity do not survive; its type/time/place/preference opportunity survives as an explicit Authoring creation suggestion.

## Resolved Reduction Decisions

1. Retain type catalog title/cover/description as PR Discovery presentation selected directly by `PR.type`.
2. Retain preference submission/moderation, live PR Discovery analytics, the type community entry, time-editor profile, and route applications under precise owners. Retire only Event-shaped identity and naming.
3. Migrate only legacy `ACTIVE` rows into current type configuration; non-ACTIVE rows gain no replacement semantics and require explicit production reconciliation before cutover.
4. Remove historical public routes from canonical web code. Any production redirect is an edge/release concern and cannot reintroduce Event DTOs or state.
