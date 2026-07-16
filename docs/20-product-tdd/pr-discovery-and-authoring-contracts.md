# PR Discovery And Authoring Contracts

This file owns cross-unit contracts for `/prd`, PR Discovery, Form/Card/List
views, PR Authoring handoff, POI applications, and the
related telemetry. The filename is retained for link stability.

## 1. PR Type And Authoring Contract

- PR Authoring prepares the same PR-owned structured payload used by
  `POST /api/pr/new/form`.
- Assisted create carries transient source and view state only. Persisted PR
  state remains the ordinary PR field set: `type`, one time window, and one
  place mode (`location` or `route`).
- Current PR Type Configuration is selected directly by `PR.type`. It may
  supply create eligibility, suggested places/times, partner defaults, join
  gates, confirmation policy, preference tags, meeting guidance, and a
  questionnaire template. It may also expose a PR Discovery-owned type
  community QR entry. It is current configuration only: no scenario
  identity, configuration version, revision, effective time, or PR-side
  reference exists.
- Creation-owned values materialize into PR state once: notes fallback,
  confirmation offsets, join gates, and completion questionnaire instance.
  Later configuration edits do not rewrite those snapshots. Discovery and
  Authoring suggestions, creation/expansion/frequency policies, and effective
  Coordination guidance read the current configuration when their owner acts.
- User creation policy is distinct from discovery visibility. A disabled type
  returns a stable PR Authoring problem and does not leak an alternate object
  identity.
- Type-specific full-capacity expansion and frequency limits are consumed by
  PR Participation. Expansion requests hand ordinary create input back to PR
  Authoring and candidate supply back to PR Discovery.
- `PR.type` remains unchanged and is not replaced by `scenarioKey`, `typeId`,
  or a foreign key.

## 2. Canonical Discovery Route And View Contract

- `/prd` is the canonical frontend discovery entry.
- Canonical query state is optional `type`, repeated product-local `date`, and
  optional `view=list|card|form`.
- `type` scopes type-specific matching; repeated `date` scopes local calendar
  dates; `view` is presentation state. None is a new identity.
- `/prd` carries only canonical discovery query state; it does not carry a
  hidden context identity, assignment/history metadata, or a rebucketing key.
- Without `type`, the catalog renders a PR Discovery type card from the current
  type presentation: title, description, cover (explicit cover, then published
  POI gallery, then configured fallback gallery), and up to three published POI
  names (falling back to configured place labels). The card's sole navigation
  target is canonical `/prd?type=<PR.type>`.
- The catalog deliberately omits the type-community QR asset. A type-detail
  read returns that asset only for the selected type, so Home can reuse catalog
  cards while About and a PR detail resolve community access without an N+1
  catalog read.
- Home highlights catalog cards and links to `/prd`; PR detail may also link
  there. Support links to the About type-community directory, which resolves a
  selected type detail only after the user chooses that type. None of these
  surfaces carries a context identity. A successful join may await the current
  type detail before deciding whether to show its type community; the
  type-community and official-account followup prompts stay independent.
- `FORM`, `CARD`, and `LIST` are PR-owned views over one discovery/authoring
  contract. `FORM` owns criteria and recommendation input, `CARD` owns grouped
  joinable candidates, and `LIST` owns the date-based browse projection.
  Unifying ownership does not require identical view membership.
- Preserve the current view ratios. The current default vector is
  `FORM=50`, `CARD=50`, `LIST=0`; configured overrides remain unchanged. Ratio
  evaluation is current presentation policy only; it does not persist
  assignment history. If all ratios are zero or configuration is absent, the
  deterministic fallback is `LIST`.
- Server view resolution has a 500 ms product fallback to `LIST`. Other type or
  view-resolution failures render an explicit action to the unscoped `/prd`
  catalog; a failed scoped page must not strand the user without navigation.
- The route page parses query state and delegates one workflow owner. It does
  not duplicate candidate queries, create commands, auth replay, or telemetry.

## 3. Discovery Read And Recommendation Contract

- PR Discovery reads canonical persisted PR facts selected by `PR.type`, local
  date, place, time, and preferences. It does not require a PR-side template
  or context link.
- Joinable candidate projections contain persisted values with a `prId` and
  `OPEN` status. The LIST projection is separate and preserves public
  `OPEN`/`READY`/`ACTIVE` current/future records plus at most the three most
  recent past date groups containing `CLOSED` records. Past groups render only
  `CLOSED`; `EXPIRED` is not rendered. LIST records are not removed merely
  because the viewer already participates in them.
- Non-persisted authoring criteria and creation suggestions remain separate
  discriminated values and are never presented as persisted PRs.
- Form recommendation accepts one selected place, concrete
  `timeWindows: Array<{ startAt, endAt }>`, and current preference labels.
  Point windows require candidate `PR.time_window[0]` equality; non-point
  windows use `startAt <= PR.time_window[0] < endAt`.
- The current frontend sends concrete start/end instants. Type-owned start
  rules may provide concrete suggestions, while custom time entry remains
  ordinary transient criteria; neither becomes a separate persisted object.
- Recommendation excludes candidates where the viewer already has an active
  partner slot and returns one matched candidate plus an ordered list.
- Candidate ordering and grouping are backend-authored. Frontend treats the
  order as opaque and renders view-specific presentation only.
- If both recommendation lists are empty, the selected concrete input is
  handed to ordinary PR Authoring. No discovery read creates a synthetic PR as
  a side effect.

## 4. Authoring Handoff Contract

- `CARD` consumes only joinable persisted candidates. `LIST` consumes its
  public browse records. Both may combine their persisted projection with
  transient creation suggestions at the frontend boundary; those suggestions
  have no `prId`, status, or canonical path.
- FORM criteria remain transient until ordinary PR Authoring executes. The
  create selection supplies type, time, place, and preferences directly to the
  structured create command, and may be replayed after authentication, but it
  does not assign a durable identity before that command succeeds.
- The ordinary structured create command is the only point that returns a new
  `prId`; normal creator identity, draft/publish, validation, and conflict rules
  apply there.

## 5. POI Application And Public POI Contract

- Discovery location creation is a route entry into POI application, not a PR
  type mutation.
- `POST /api/pois/applications` creates a `PENDING` POI from one name and one
  image URL; `GET /api/pois/applications/mine` lists the current user's
  submissions.
- POIs have integer `id` identity and a unique `name`; `PR.location` remains an
  arbitrary string matched to POI-owned data by name.
- Public POI reads return only `PUBLISHED` rows. Admin commands may publish or
  reject pending submissions with a rejection reason.
- POI coordinate tuples and the public `meetingPoint` response shape remain
  unchanged.

## 6. Discovery Telemetry Contract

- `/prd` view, recommendation, candidate entry, create handoff, join, and
  waitlist flows emit registry-governed user telemetry through the current
  `journey_id`.
- Funnel attribution is reconstructed from typed discovery payloads and BI
  projections, not from hidden context IDs, assignment history, segment IDs,
  or command correlation IDs.
- The generic telemetry word `event` remains valid for telemetry records; it is
  not a PR business object.
