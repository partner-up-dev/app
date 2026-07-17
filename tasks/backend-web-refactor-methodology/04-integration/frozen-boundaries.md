# Frozen Boundaries

> **Historical snapshot.** 本表冻结于 `a8cf2d7`。当前 HEAD `bda22b60` 已删除 Anchor Event
> identity/routes，并由 PR Type Configuration、PR Discovery 与 PR Authoring 接管能力；因此
> FB-04 不再是当前边界，其他条目也必须先经 `../06-phase3/entry-baseline.md` 校准后使用。
> 保留本表是为了审计旧重构前提，而不是恢复旧 Event 模型。

## Status

Phase 1 integrated freeze complete for the claims below. “Frozen” means a later
refactor must preserve the claim or deliberately route a change through its
durable owner; it does not make this task directory a new truth layer.

## Inclusion Rule

A boundary enters this register only when it is directly supported by a durable owner or an observed runtime/source contract.
Task-local proposals and unresolved conflicts stay out.

## Boundary Register

| ID | Family | Frozen behavior / authority | Backend owner | Web owner | Evidence | Change route |
| --- | --- | --- | --- | --- | --- | --- |
| FB-01 | Product/technical truth | Product promises are owned by PRD; technical decomposition realizes rather than rewrites them. Current implementation evidence cannot silently override product intent. | Backend realizes PRD rules. | Web realizes workflows and presentation. | [`XU-001`, `XU-019`](../03-cross-unit/evidence-index.md) | User-visible change -> PRD; technical owner change -> Product TDD. |
| FB-02 | State authority | Backend/Postgres own durable PR, identity, event, messaging, notification and commerce truth. Web owns route/UI/browser continuity and cache/invalidation, never a second domain truth. | Domain commands, canonical projections, persistence. | Interaction state, capability fallback, browser storage, cache. | [`XU-001`, `XU-002`](../03-cross-unit/evidence-index.md), [`WEB-012`](../02-web/evidence-index.md) | Authority movement -> `system-state-and-authority.md`. |
| FB-03 | PR model | One durable `PR`; status is `DRAFT/OPEN/READY/ACTIVE/CLOSED/EXPIRED`; `FULL` is derived; location and route are mutually exclusive; stable preview facts come from canonical detail read. Anonymous-create sequencing is excluded pending `CF-01`. | PR domain command/read authority. | Route/page assembly and canonical-read presentation. | [`XU-006`–`XU-008`](../03-cross-unit/evidence-index.md), [`BE-BC-003`, `BE-BC-006`](../01-backend/evidence-index.md) | PR behavior -> PRD + PR lifecycle contract. |
| FB-04 | Event context | Anchor Event is discovery/context, not PR identity. `/e/:eventId` is canonical; Form Mode and dummy materialization must preserve system-owned creation semantics and one route-level journey state machine. | Event/PR create authority and materialization. | Landing mode, recommendation journey and handoff UI. | [`XU-009`](../03-cross-unit/evidence-index.md), [Web behavior contract](../02-web/behavior-contracts.md) | Product behavior -> PRD; coordination -> event-context contract; hard-local FSM -> Unit TDD. |
| FB-05 | Typed HTTP/routes | Backend exports `AppType`; Web consumes with `hc<AppType>()`; runtime remains validated HTTP. Route method, path, input and response shape form one contract. | Hono mounts, validation and typed response. | Typed client and route-to-command handoff. | [`XU-003`](../03-cross-unit/evidence-index.md), [`BE-BC-001`, `BE-BC-002`](../01-backend/evidence-index.md) | Coordination change -> cross-unit/focused Product TDD. |
| FB-06 | Errors/session transport | Expected API rejection is RFC 9457 Problem Details with stable status/code and Backend-owned explanation. Session rotation uses `x-access-token` or explicit auth endpoints; domain response bodies do not own auth payload. | Problem Details, auth middleware/header. | Branch on status/code; choose presentation and OAuth escalation. | [`XU-004`, `XU-020`](../03-cross-unit/evidence-index.md), [`BE-BC-004`, `BE-BC-005`](../01-backend/evidence-index.md) | Error/session change -> cross-unit contract; domain codes -> focused owner. |
| FB-07 | OAuth handoff | Callback never exposes bearer/code/state in return URL. A short-lived signed path-scoped cookie plus nonce is exchanged with credentials; bootstrap/auto-login/share defer until successful cleanup. | Callback, cookie, nonce exchange. | Handoff gate, session apply, URL cleanup and replay order. | [`XU-005`](../03-cross-unit/evidence-index.md), [`WEB-011`](../02-web/evidence-index.md), [`BE-BC-005`](../01-backend/evidence-index.md) | OAuth choreography -> Unit TDD; transport/identity -> Product TDD. |
| FB-08 | Web data flow | Pages are route entry/assembly. Server state goes through domain/shared Query/Mutation owners and central query keys; cache remains non-authoritative. App/process owns cross-route lifecycle gates. | Typed API and canonical state. | Page/process/domain/query/shared responsibilities. | [Web behavior](../02-web/behavior-contracts.md), [Web authority](../02-web/authority-boundaries.md) | Internal movement -> nearest Web AGENTS; coordination change -> Product TDD. |
| FB-09 | Messaging/notification | Messages remain non-realtime and participant-visible by current membership. Read markers are explicit. Notification opportunity/wave/delivery/quota and dispatch revalidation remain Backend-owned. | Visibility, read marker, job/delivery authority. | Dedicated message UI and notification prompts. | [`XU-010`–`XU-012`](../03-cross-unit/evidence-index.md) | User behavior -> PRD; coordination -> messaging/notification contracts. |
| FB-10 | Share/revisit | Public PR routes remain shareable/re-enterable. Backend supplies canonical base metadata; Web owns active route-scoped share session/replay and graceful rich-media fallback. | Canonical entity/share metadata. | Share orchestration, capability fallback, `spm` continuity. | [`XU-015`](../03-cross-unit/evidence-index.md), [Web behavior](../02-web/behavior-contracts.md) | Product promise -> PRD; descriptor coordination -> PR lifecycle contract. |
| FB-11 | Database evolution | Drizzle/committed migrations own schema evolution; staging/production and recovery are forward-only. Applied SQL is not edited and local reset is not hosted recovery. | Entity/schema, migration ledger and runtime compatibility. | Typed consumption only; no persistence authority. | [`XU-016`](../03-cross-unit/evidence-index.md), [`BE-BC-007`](../01-backend/evidence-index.md) | DB/runtime change -> Unit TDD + Deployment; cross-unit meaning -> Product TDD. |
| FB-12 | Async/scale-to-zero | Durable delayed work uses DB-backed jobs, request-tail best effort and external tick. API success is not proof downstream side effects completed; JobRunner owns due/missed/lease/retry semantics. | Jobs/outbox/notifications/operation log. | Render only persisted/API projections. | [`XU-012`, `XU-017`](../03-cross-unit/evidence-index.md), [`BE-BC-008`, `BE-BC-011`](../01-backend/evidence-index.md) | System-shaping change -> Product TDD + Deployment. |
| FB-13 | Commerce/providers | PR attachment, Order/Bill/local execution remain Backend truth; provider systems own gateway/execution truth. Quote identity, callback verification, cancellation preview and final settlement boundaries stay distinct. | Commerce domains, provider adapters and projections. | Ordering/payment UX and typed command flow. | [`XU-013`, `XU-014`](../03-cross-unit/evidence-index.md), [`BE-BC-009`, `BE-BC-010`](../01-backend/evidence-index.md) | Commerce behavior -> PRD/focused contracts; provider runtime -> Deployment. |
| FB-14 | Verification | Cross-unit behavior proof is Browser -> Vite -> Backend HTTP -> isolated Postgres. Unit/type/build proof cannot substitute for a user journey when both units change. | Backend unit/scenario and runtime probes. | Web unit and semantic test anchors. | [`XU-018`, `XU-031`–`XU-033`](../03-cross-unit/evidence-index.md) | Test-platform change -> Product TDD; test implementation -> owning unit/root tests. |

## Explicitly Not Frozen

- Directory layout and file size.
- A proposed dependency-injection or module framework.
- Internal symbol names that are not part of a compile-time or runtime contract.
- Current implementation accidents without a durable or observable contract.
- The intended anonymous-create sequence until `CF-01` is resolved.
- A target DI framework, universal service abstraction, file-size ceiling or pilot ordering.
