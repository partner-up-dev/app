# 5-6A.3 Deep Edge Inventory

## Why This Exists

The first consumer ledger recorded terminal domain-root imports. A follow-up TypeScript AST audit showed that root
removal alone would leave the same opaque dependencies through `model/`, `services/`, and `use-cases/` paths. This
is therefore the closure inventory for *all* cross-domain implementation edges inside the Commerce cluster.

The source scan is:

```text
import { … } from "../../<commerce-owner>(/<internal-path>)?"
import type { … } from "../../<commerce-owner>(/<internal-path>)?"
```

It excludes entity/repository persistence imports and same-owner paths. A category import is considered closed only
when its exported fact is actually a Command, canonical Query, stable Contract, or Port.

## Batches And Current Evidence

| Batch | Edge family | Status | Cheap proof |
| --- | --- | --- | --- |
| A | Merchandising ↔ Trade/Admin | complete | AST source count 0; backend type/lint; Placement/Ride scenarios |
| B | Bill/Payment/Trade | complete | type/lint; callback + Rental history scenarios |
| C | Trade ↔ RideHailing | complete; reconciliation transaction boundary isolated in `04-ride-hailing-reconciliation-transaction/` | Ride create, cancellation, callback, browser reconciliation, plus static negative proof for repository/executor leakage |
| D | Admin ↔ Payment/RideHailing/Trade | complete | admin provider/order scenario plus AST count |
| E | unit-test language, root barrels, package compatibility | complete; five roots deleted | zero-consumer AST + text backstop; type/build + active journey |

## Exact Remaining Families Before B–D Mutation

| Consumer | Current deep dependency | Intended owner surface | Notes |
| --- | --- | --- | --- |
| Trade create | Bill payable-line predicate | Bill Query/projection | deterministic eligibility read, not a repository export |
| Ride final settlement | Bill charge-line allocation | Bill stable Contract | pure allocation rule over Trade split contract |
| Ride final settlement | Trade pricing snapshot resolution | Trade canonical Query/projection | deterministic resolution from durable Trade snapshot |
| Ride sync/observation | Trade choice-set types, read helpers, terminal cancellation transition, plus atomic persistence of phase/final Bill | Trade Contracts and RideHailing-owned semantic Transaction Port | one bounded implementation exception locks Trade → Ride (→ Bill for final settlement); no provider I/O under locks |
| Trade create/list/cancel/detail | Ride provider factory, provider contracts, sync | Ride Ports, Contracts, Commands | callback-info construction must be provider-neutral at Trade boundary |
| Admin payment | Payment configuration types/normalization | Payment Contracts | sensitive values remain owner-protected in Admin view |
| Admin RideHailing | Ride provider config/callback URL; Trade admin cancellation/binding types | Ride Contracts/Query, Trade Command/Contract | no direct `model`/`services`/`use-cases` import |

## Explicit Non-Goals

- No generic event bus, outbox, retry scheduler, or provider abstraction rewrite.
- No new Rental runtime capability or settlement-correction/refund product flow.
- No physical migration/schema deletion.
- No root barrel deletion until batches A–D and test/system consumers have a verified zero inventory.
