# Architecture Objectives And Decision Rules

## Role

This document is the durable technical constitution for growing the PartnerUp codebase. It defines how to make
architecture decisions when a concrete feature or refactor is not already prescribed by a narrower contract.

It is generative rather than descriptive: it defines objectives, construction rules and a decision procedure.
[`unit-topology.md`](./unit-topology.md) describes the current units and owner map; local `AGENTS.md` and Web
`ARCHITECTURE.md` translate these rules into package-level operating constraints.

The current source is not assumed to conform completely. A stated target rule must be paired with a named
compatibility window when live code still differs.

## Hard Constraints

Architecture optimization starts only after these constraints are satisfied:

1. preserve product behavior unless the PRD is intentionally changed first;
2. keep one authoritative owner for each durable fact and business decision;
3. enforce data correctness, authentication, authorization and validation at system boundaries;
4. preserve explicit HTTP, browser, provider and persistence contracts during a refactor;
5. retain verification and a credible forward-fix or rollback path proportionate to the change.

A design that is cleaner locally but violates one of these constraints is not an improvement.

## Ordered Objective Function

After the hard constraints, prefer the design that optimizes these objectives in order:

| Priority | Objective | Practical reading |
| --- | --- | --- |
| 1 | Minimize owner span | A normal change should touch one authoritative owner and as few coordinating owners as possible. |
| 2 | Minimize exposed dependency | Prefer fewer cross-owner edges, narrower public surfaces and no duplicate contract truth. |
| 3 | Maximize module depth and locality | Put substantial coherent behavior behind a small interface; keep decisions close to the state and vocabulary they govern. |
| 4 | Minimize obscurity | Use coherent names, explicit authority, compact durable documentation and visible compatibility boundaries. |
| 5 | Minimize verification and migration cost | Prefer seams that can be characterized cheaply, migrated incrementally and restored without data reversal. |
| 6 | Optimize measured runtime or build performance | Act on evidence and a declared threshold, not on assumed framework or directory costs. |

File size, directory symmetry, number of classes, raw edge counts and abstraction reuse are diagnostic signals,
not independent objectives. Do not improve their numbers by widening an interface or moving decisions away from
their owner.

## Module Construction

A domain module needs:

- one coherent business vocabulary;
- explicit authority or decision responsibility;
- internal implementation that can change without coordinating all callers;
- a deliberately curated public surface.

### The Four Public-surface Categories

The four-category rule applies to what a domain exposes across owner boundaries, not to every file it may contain.
Domain internals may include policies, entities, repositories, use-cases, services, mappers and tests.

A domain public surface may expose only:

1. **Commands** — requests to perform an owner-controlled state transition.
2. **Canonical queries/read projections** — owner-controlled facts shaped for a stable use, not raw persistence rows.
3. **Stable contracts, value types and problem codes** — vocabulary that callers must share without importing the implementation.
4. **Events and ports** — only where a real asynchronous, transaction, replacement or external-provider boundary exists.

Repositories, Drizzle rows, internal services, framework clients, UI components and convenience re-exports are not
cross-domain APIs. A curated surface is exposed from a domain root `index.ts` or an explicitly category-named root
entrypoint (`commands.ts`, `queries.ts`, `contracts.ts`, `events.ts`, or `ports.ts`); nested implementation paths
remain private. An interface or port is not justified merely to make mocking or directory movement easier.

Cross-domain consumers select the narrowest category entrypoint, not a broad
aggregate barrel merely because it currently re-exports the needed symbol. In
particular, a pure rule that needs owner facts imports the named query surface;
it must not import a barrel that also initializes owner commands/use cases and
can form a reverse initialization cycle. A root barrel is a curation boundary,
not permission to erase command/query dependency direction.

A current-state revalidation query is read-only by contract. It may apply pure
predicates to persisted facts, but it must not invoke temporal refresh,
promotion, release, status transition or another owner command merely to make
an eligibility answer convenient. If state must advance, name and execute that
owner command separately before reconciliation; never hide it behind a query
used by Notification, a scheduler or a delivery attempt.

When disappearance of one owner's fact makes another owner's pending work
ineligible, invalidate that work at the source-fact transaction boundary. Lock
the source aggregate and the affected current facts, mutate or tombstone the
source fact, then call the receiving owner's semantic transaction port before
commit. Do not reconstruct a former source fact from opaque Job payloads, and
do not give the source a private scheduler key merely to make cleanup
convenient.

Before adding a public symbol, answer all of the following:

- Is there a real cross-owner caller rather than a hypothetical reuse case?
- Does the owner control the symbol's semantics and lifecycle?
- Is this the narrowest of the four categories that serves the caller?
- Does it hide persistence/framework details and avoid creating a second source of truth?
- Can the owner change its implementation without forcing unrelated callers to change?

If any answer is no, keep the symbol internal or redesign the caller interaction.

## Durable Fact Placement And Representation

Start from the meaning and owner of a fact, not from a preferred table shape or
normal form. Use the smallest owner-local representation that preserves the
required invariants:

1. Keep a fact inside its natural aggregate when it shares that aggregate's
   identity, lifecycle, retention and authorization boundary.
2. A collection-valued attribute is a valid durable representation when the
   collection has a proven small bound, changes atomically with its owner, and
   its members have no independent attributes or lifecycle. Array storage is
   not an architecture defect merely because a join table is possible.
3. Promote members into an independent relation/entity only when at least one
   concrete need exists: independent identity or lifecycle, unbounded/high
   cardinality, per-member metadata, selective query/update, contention,
   referential-integrity/cascade requirements, or different retention/security
   policy.
4. Keep only behavior-controlling, idempotency, reconciliation, product or
   legally required state in authoritative persistence. Attempt-by-attempt
   history used solely for diagnosis belongs to correlated logs/traces/metrics.
5. Do not preserve a table, state machine or repository because its schema
   advertises possible future behavior. An unconsumed lifecycle is a proposal,
   not an owner.
6. A scheduler/task container owns generic execution mechanics, not the
   business meaning of its payload's outcome. If an external effect may be
   applied, rejected or unknown in a way that changes product reconciliation,
   the semantic domain owner persists that fact; Job may only complete, retry,
   fail or skip the opaque task under a generic contract.

For example, the target PR message product has no per-viewer read-receipt
fact. If a future bounded PR group needs per-message viewed membership without
timestamps or an independent lifecycle, a message-owned set such as
`viewedByUserIds` (possibly stored as `uuid[]`) is the default candidate. A
separate viewed relation must earn itself through one of the needs above,
including any required user-deletion/privacy cascade that an array cannot
enforce safely.

When provider-effect uncertainty materially changes reconciliation or product
behavior, that fact belongs to the semantic domain owner rather than Job. The
current CaoCao fee-confirmation path deliberately accepts possible duplicate
effect under generic retry and therefore does not persist an uncertainty
lifecycle; that accepted risk must not be generalized into a Job business
status or a mandatory owner-state machine.

## Growth Decision Procedure

Use this sequence for new behavior and structural changes:

1. **Name the behavior and authoritative fact.** Start with product vocabulary and the state or decision it affects.
2. **Find the existing owner.** Prefer extending the owner that already controls that fact or invariant.
3. **Keep owner-local work internal.** Do not create a public abstraction for a single internal call path.
4. **Choose the narrowest public category.** When another owner must collaborate, expose one command, query,
   stable contract, event or real port rather than internal machinery.
5. **Place orchestration deliberately.** Same-domain sequences belong in a domain use-case/workflow. Cross-domain
   or browser/platform lifecycles belong in an application process. Provider translation belongs in an integration adapter.
6. **Verify authority and behavior.** Prove the owner still decides, callers do not duplicate its rules, and the
   observable journey remains intact.
7. **Record compatibility explicitly.** If migration cannot finish in the same slice, name the old edge and its exit condition.

Create a new domain only when evidence establishes a distinct long-lived owner, such as independent durable
authority, lifecycle/invariants, external boundary or business vocabulary. A large file, a new screen or a desired
folder name is not enough.

## Unit-specific Consequences

### Backend

- Controllers own authentication context, request validation and HTTP mapping; domain use-cases own decisions.
- Cross-domain callers consume a curated domain public surface. They do not import another owner's repository,
  Drizzle schema or internal service path.
- Persistence adapters remain internal unless a real transaction/replacement boundary requires a port.
- `domains/pr` is the sole canonical PR surface. The former `domains/pr-core` compatibility implementation and
  `PartnerRequestService` facade were retired in Phase 3 slice `3-5`; no source or test consumer remains.
- Admin modules compose operator workflows but do not become the owner of the policy they edit.

### Web

- Pages own route input, page context, assembly and page-level error aggregation.
- Domain query/command adapters own endpoint invocation, inferred HTTP types, Problem Details parsing and cache effects.
- Domain workflows/use-cases own user sequences, navigation intent and local orchestration.
- `processes` owns cross-domain or browser/platform lifecycles such as session and OAuth coordination.
- Domain UI owns presentation and local interaction state; TanStack Query owns server cache; Router owns route state.
- Models do not import transport/query/UI modules, and ordinary pages/components do not invoke raw RPC clients.

### Cross-unit Contracts

- Backend remains authoritative for durable product truth; Web state cannot silently become a second authority.
- `AppType` remains the compile-time origin for HTTP inference. Runtime validation and Problem Details remain required.
- `@partner-up-dev/backend/contracts` is the sole package-level types-only subpath for stable, owner-backed value
  and input contracts. It uses explicit type exports only: no runtime schema/value, entity row, repository, service,
  wildcard barrel or persistence-derived alias may enter for migration convenience. A symbol without an independent
  contract owner remains a root compatibility export until that owner defines it.
- Do not introduce handwritten response DTO truth or a universal API/service wrapper to make layers look uniform.

## Compatibility And Exception Protocol

Target rules and live state must be distinguishable:

- **Current:** source and verification already satisfy the statement.
- **Target:** the chosen direction, with incomplete edges named as compatibility windows.
- **Exception:** an intentionally permitted edge that has an owner and reason independent of migration convenience.
- **Proposal:** a task-local hypothesis or plan that is not durable truth until its promotion proof passes.

When Current and Target differ, preserve current product/authority behavior and make the bridge visible. When a
product or authority contract conflicts, return to its durable owner and the Impact Handshake instead of using
this architecture document to select a new product meaning.

Every compatibility window or exception records:

1. owning module/person or migration slice;
2. exact path, import family or contract surface;
3. why the normal rule cannot yet apply;
4. removal condition or review trigger;
5. verification that prevents the exception from widening.

An allowlist without those fields is hidden architecture debt. Do not make a noisy rule pass by adding broad
globs, widening a barrel or relabeling internal machinery as a public contract.

## Fitness-rule Promotion

Architecture documentation owns semantic decisions; tools enforce only what can be recognized precisely.

1. Start a candidate rule as a deterministic report with positive and negative fixtures.
2. Separate historical findings from new findings and classify every historical family through the exception protocol.
3. Run the report repeatedly and normalize paths/order before trusting deltas.
4. A rule may block new violations only when its owner, scope, fixtures and low-noise baseline are explicit.
5. Existing findings remain migration work; they do not justify either a big-bang cleanup or permanent suppression.

Use AST rules for precise syntax. Use an import parser/graph for dependency direction and cycles. Text search is
supporting evidence, not semantic proof.

## Durable-owner Routing

Update this document when the objective ordering, module construction, growth algorithm or exception protocol changes.
Update `unit-topology.md` when units, domain owners or allowed dependency directions change. Update a focused
Product TDD contract when an authority or cross-unit coordination shape changes. Keep inventories, finding lists,
migration progress and experimental thresholds in task packets.

## Worked Placement Examples

- A new PR participation rule belongs inside PR Lifecycle. Other owners consume a command or canonical projection,
  not the rule service or repository.
- A PR Type Configuration consumer receives a named current-policy query/projection. It does not read the raw
  configuration row and decide snapshot semantics itself.
- A new OAuth continuation spans browser/session/domain concerns, so a Web process coordinates it while domain
  commands remain adapter-owned.
- An Admin screen may compose an operator workspace, but the edited domain owns validation and mutation semantics.
