# Target Product And Owner Model

## Product Conclusion

`AnchorEvent` is not a parent, container, or lifecycle peer of `PartnerRequest`. In the current product it combines two different things:

1. type-specific optimization of how a PR is authored, discovered, joined, coordinated, and completed;
2. presentation, experimentation, support, moderation, and operator controls that happen to sit beside those optimizations.

The target removes that accidental container. It does not rename it into a new monolith such as `ScenarioDefinition` or `PRTemplate`.

“Dynamic PR template” remains a useful explanatory metaphor: current runtime data specializes behavior for different `PR.type` values. It is not the name or boundary of a new aggregate.

## Three Layers

### 1. Universal PR Invariants

Code-owned rules that runtime data cannot weaken, including identity, legal lifecycle transitions, authorization, safety, time correctness, place shape, participation integrity, and durable PR facts.

### 2. Type-specific PR Behavior

Code-registered strategies selected using the existing `PR.type` when a type requires specialized behavior. A strategy is owned by its consuming use case; there is no central strategy object that exposes every lifecycle concern.

Examples already suggested by current behavior include time suggestion generation, candidate ranking, place validation, or capacity-expansion decisions.

### 3. Current Runtime Configuration

Operator-editable data selected directly by `PR.type`. There is at most one current configuration per type; current database migration `0029_anchor_event_type_unique.sql` already enforces uniqueness on the old table.

This layer has no version, revision, effective interval, history selector, or PR-side reference. Migration must not turn the existing landing `assignmentRevision` into such a mechanism.

It also has no Anchor Event lifecycle. Configuration existence and consumer-owned validation replace neither `ACTIVE`, `PAUSED`, nor `ARCHIVED`; those states disappear with the old concept.

## Resolution Topology

```text
                         existing PR.type
                               |
           +-------------------+-------------------+
           |                   |                   |
       code strategy       current config     no specialization
           |                   |                   |
           +-------------------+-------------------+
                               |
                    one consuming use case
                               |
          +----------+---------+---------+----------+
          |          |                   |          |
      Authoring   Discovery         Participation  ...
```

- `PR.type` is a lookup input, not a foreign key and not a new identity.
- Resolution should be consumer-specific. Avoid returning one giant “effective scenario” DTO containing every concern.
- Missing configuration must have an explicit consumer-owned fallback: universal behavior, feature unavailable, or a controlled error. It must not silently choose an arbitrary row.

## Lifecycle Owners

### PR Authoring

Owns create/edit/publish intent and validation, suggested inputs, creation gates, type selection, and materialization of concrete PR facts. It may consume current type configuration but writes ordinary `PartnerRequest` state.

### PR Discovery

Owns the `/prd` journey before commitment: type catalog, criteria, candidate qualification, grouping, ranking, recommendation, no-match behavior, and the distinction between an existing PR candidate and a not-yet-persisted creation suggestion.

### PR Participation

Owns join, waitlist, confirmation, exit, capacity, frequency limits, and the transition that may request additional discovery supply. It does not delegate its state machine to configuration.

### PR Coordination

Owns meeting guidance, messages, reminders, notifications, and in-progress synchronization. Type configuration may provide fallback inputs or choose an existing policy.

### PR Completion

Owns attendance, check-in, feedback responses, outcomes, and post-activity effects. Authoring may mount a questionnaire choice, but completion state belongs here.

### Support Owners Outside The Lifecycle

Presentation, marketing/community QR, POI, route curation, moderation, experimentation, analytics, and admin UX keep separate owners. They must not be put back into one PR-type god object merely because their data used to share an `anchor_events` row.

## Behavior Over Configuration Changes

The migration adds no generic propagation model.

- Facts already materialized onto a PR remain PR-owned: time/place/route, partner bounds, notes, confirmation offsets, join gates, and questionnaire instance.
- Reads or commands that currently consult the one current type configuration may continue to do so only when that is established behavior and does not rewrite PR facts.
- Where current paths disagree, choose one simpler product rule and characterize it with tests. Do not solve disagreement by adding version/effective-time machinery.
- If safe preservation would require a new versioning feature, reduce or retire the behavior instead and make that product decision explicit.

## Known Reality Constraints

- Current storage has no PR-to-Event foreign key. A historical attachment table was created and later dropped; present association is dynamically reconstructed through matching `PR.type`.
- `anchor_events.type` is unique in migration history even though the Drizzle entity does not declare `.unique()`. Live migration state and duplicate data must be audited before migration.
- Multiple PRs sharing the same `PR.type` are expected and are not a data conflict.
- Current status behavior is inconsistent: list/search generally require an ACTIVE Event, while several detail/recommendation reads accept PAUSED or ARCHIVED rows. The target does not preserve either behavior as a new status machine. Characterization tests and live-data inspection must determine which rows/capabilities are migrated once, after which the old states are deleted.
