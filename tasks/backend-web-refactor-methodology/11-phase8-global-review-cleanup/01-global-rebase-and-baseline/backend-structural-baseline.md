# `8-0` Backend Structural Baseline

## Scope And Calibration

This audit covers production `*.ts` files under `apps/backend/src`, excluding
`*.test.ts` and `*.spec.ts`. Static import results describe source dependency,
not request cardinality, runtime initialization order or provider behavior.
File size and constructor counts are diagnostic signals only.

| Snapshot | Production files | LOC | Interpretation |
| --- | ---: | ---: | --- |
| Phase 2 historical baseline | 481 | 57,298 | historical pre-program comparison |
| Phase 3 pre-slice planning snapshot | 466 | 51,506 | historical working-tree snapshot recorded before `3-1` |
| Phase 3 reviewed Git baseline (`c634d9b6`) | 465 | 49,872 | comparable committed production scope |
| Phase 8 `8-0` at `cf6cd736` | 512 | 54,780 | current source truth |

The current source has more files but fewer LOC than Phase 2, and more
files/LOC than the committed Phase 3 baseline as later domains were completed.
Those deltas can coexist with improved locality, but do not prove lower owner
span. There are also 111 source test files / 14,796 LOC outside the production
count.

## Architecture-fitness Delta

The reviewed Phase 3 Backend baseline contained 110 findings:

- 50 `pr -> pr-core` compatibility edges;
- 53 cross-domain private imports; and
- 7 controller-to-repository edges.

Current Backend findings are 11:

- the same 7 controller-to-repository edges; and
- 4 **new** cross-domain private imports.

The entire `pr-core` family and 53 reviewed private-import findings are stale.
The remaining four private imports are active target violations, not permission
to extend the old baseline:

| Caller | Private dependency | Target direction |
| --- | --- | --- |
| `domains/admin-pr-type-config/use-cases/pr-type-coordination-meeting-point-transaction.ts:10` | `domains/pr/services/meeting-point-change-notifier.service.ts` | existing PR semantic meeting-point Port |
| same caller, line 14 | `domains/pr-type-config/services/projection.ts` | PR-type query/contract surface |
| `domains/poi/use-cases/admin-poi-meeting-point-transaction.ts:12` | PR private meeting-point notifier | existing PR semantic meeting-point Port |
| `domains/trade/use-cases/settle-bill-line-payment.ts:9` | RideHailing reconciliation adapter | ratified RideHailing reconciliation Port |

The seven historical controller-to-repository findings are:

- `admin-poi.controller.ts -> PoiRepository`;
- `auth.controller.ts -> UserRepository`;
- `partner-request.controller.ts -> PartnerRequestRepository`;
- `partner-request.controller.ts -> TradeOrderRepository`;
- `pr-controller.shared.ts -> UserRepository`;
- `wechat.controller.ts -> UserNotificationOptRepository`; and
- `wechat.controller.ts -> UserRepository`.

They remain real target debt, but must be migrated as behavior-specific
controller/use-case verticals. A generic service layer would only rename the
dependency.

## Dependency Cycles

Two views of the same Commerce dependency family are deliberately retained:

1. a static `import`/`export` graph has one eager four-node SCC:
   `trade/rental-ordering-flow -> bill/queries ->
   bill/get-bill-line-checkout-target -> trade/queries`;
2. a TypeScript-AST graph that also includes dynamic `import()` has one
   nine-node SCC spanning Trade, Bill and RideHailing.

The additional full-graph path is:

```text
trade/queries
  -> cancel-ride-hailing-order-from-order-detail
  -> ride-hailing/ports
  -- dynamic import -->
  ride-hailing/sync-ride-hailing-order-with-provider
  -> ride-hailing/reconciliation-transaction adapter
  -> bill/queries
  -> get-bill-line-checkout-target
  -> trade/queries
```

`ride-hailing/ports.ts:144` deliberately delays construction through dynamic
import. The nine-node SCC is therefore the canonical architecture inventory,
while only the four-node subset is an eager initialization-risk baseline.
Neither count by itself authorizes moving business ownership.

## Runtime And Public-surface Signals

- `src/index.ts` mounts 30 route groups and registers Job/Notification/
  Marketing runtime composition at module initialization.
- There is no remaining `setInterval`; request-tail and maintenance guards are
  explicit concurrency seams.
- Notification runtime consumes the narrow
  `domains/pr/notification-contexts` entrypoint, matching durable topology.
- The source contains 23 domain roots and many root/internal barrels. Current
  fitness rules treat a domain-root `index.ts` as public, so a green private
  import rule does **not** prove every root barrel satisfies the four-category
  design. Broad barrel deletion still needs consumer and owner proof.
- The largest files (`wechat.controller.ts`, Notification owner, CaoCao
  provider, and selected repositories/use-cases) are review signals, not
  decomposition instructions.

## Compatibility And Disposition

| Surface | Current evidence | `8-0` disposition |
| --- | --- | --- |
| `controllers/canonical.controller.ts` | unmounted, Knip-unused, unresolved fake `YourService`, but linked by controller `AGENTS.md` | replace the fake canonical reference with a real shallow exemplar in `8-1`; do not silently delete the instruction target |
| legacy CaoCao callback route | mounted and provider-facing | external/config proof required; not local cleanup |
| Job legacy adapter/name/columns | retained compatibility behavior | exact reader/writer proof before any retirement |
| deprecated `OPENAI_API_KEY` | environment compatibility | deployment/config evidence required |
| PR DRAFT compatibility | explicit authenticated product policy | not architecture debt |
| module-level runtime singletons | explicit scale-to-zero composition | no rewrite from constructor counts |

## Interpretation Limit

This baseline did not run a server, database, migration generator or provider
probe. The full AST graph includes dynamic imports but excludes package
dependencies and runtime call cardinality. Any later mutation must preserve
the ratified transaction/atomicity invariants and prove behavior with focused
tests plus the relevant canonical gates.
