# 05A Canonical PR Symbol Map

## Classification Rule

Only a caller from another owner earns a canonical PR entry. A rule needed solely by PR implementation remains in
`domains/pr/services`; tests are migration evidence, not a reason to publish an internal service.

## Public Categories To Materialize

| Category | Named canonical surface | Current consumers / preservation rule |
| --- | --- | --- |
| Commands | create/publish/update, join/waitlist/cancel/exit/confirm/check-in, message writes, `attachOrderToPr`, `resolvePRJoinGate` | PR controller, Admin PR management, Trade. Preserve existing identity checks, Problem Details codes, operation-log and notification effects. |
| Queries | public/detail/list/message reads, join-gate projection, authoring/discovery visibility/time reads, place/policy/availability projections | PR controller, Authoring, Discovery, Notification, Share/LLM. Preserve temporal refresh and current read consistency. |
| Contracts | `PublicPR`, PR detail/message/gate projections, `CreatorIdentityInput`, narrowly scoped PR problem-code/value contracts | Controllers and integrations consume values/projections, never Drizzle rows or repository types. |
| Ports | meeting-point-change and waitlist-alternative notification scheduling | Admin POI/Type Config, Admin PR Management and WeChat integration. Preserve scheduling/dedupe semantics; provider mapping stays outside PR. |

## Deliberate Non-exports

- Generic creator-identity conversion and creator-mutation authorization remain controller/PR implementation
  adapters; callers receive the established PR command/problem contract instead.
- Raw status predicates, repositories, entity rows, participant-release internals, temporal-refresh internals and
  broad `services/index.ts` are not public APIs.
- Trade consumes the narrow `attachOrderToPr` command (and, only if retaining its preflight error mapping requires
  it, an explicitly named attachability projection), not PR status internals or persistence.

## Current-to-target Families

| Old implementation family | Canonical implementation target | First affected proof |
| --- | --- | --- |
| `pr-core/use-cases/*` | `pr/commands/*` | PR create/join/waitlist scenarios and Backend typecheck |
| `pr-core/services/*` | `pr/services/*` (private implementation) | focused service units, then import delta |
| PR detail/message/share adapters | `pr/{queries,commands,contracts}.ts` over their existing canonical files | detail/message/share focused tests |
| Authoring/Discovery reads | named `pr/queries.ts` functions | Authoring options and Discovery scenarios |
| Notification/Admin scheduling | named `pr/ports.ts` functions | notification/admin focused tests |
| Trade order attach | `pr/commands.ts` command | rental and ride-hailing ordering scenarios |
| `PartnerRequestService` | thin delegate to `pr/{commands,queries}` until 05C evidence | facade/controller smoke; no embedded logic |

## Compatibility Exit Test

`pr-core` may be deleted only after source, tests, scripts and package exports are separately classified and no
remaining caller requires its path. `PartnerRequestService` has the stricter 05C facade evidence requirement even
if a local import search is empty.
