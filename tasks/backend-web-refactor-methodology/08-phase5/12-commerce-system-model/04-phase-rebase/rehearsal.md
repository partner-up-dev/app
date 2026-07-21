# System-Model Rehearsal

| Proposed source slice | Required model artifact | Abort / reslice condition |
| --- | --- | --- |
| `5-2` | Quote/Attempt/Order ledger row and create sequence | a provider estimate or browser field is treated as create authority; retry would send another provider create |
| `5-4` | Rental R0 truth table | a compatibility type or mock is used to preserve a public Rental write |
| `5-5` | callback/poll/cancel convergence sequence and observation ordering rule | a `GET` or UI cache silently becomes a state-transition authority without an explicit contract |
| future Checkout cache source slice | query-key + cache-owner + mutation reconciliation table | fix is a file split, arbitrary stale time, or blanket invalidation rather than a request-count-proven authority correction |
| future Viewer Bill projection source slice | viewer-bill list projection contract | changing list output forces Detail to duplicate or recompute Bill truth |
| `5-6A` | zero-consumer inventory plus fact-owner reference | a wildcard export hides a remaining owner boundary |

For every slice, update the relevant sequence, fact ledger, cache plan, and vocabulary row in the task packet before
source edits; promote only the proven durable truth after source and scenario evidence agree.
