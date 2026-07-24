# `8-7.1` Final Architecture And Authority Scorecard

Date: 2026-07-24

| Lens | `8-0` entry | Final working tree | Disposition |
| --- | --- | --- | --- |
| Architecture fitness | `944 files / 3,564 edges / 1 unresolved / 21 findings`, including `4 new` | `970 / 3,679 / 0 unresolved / 1 known / 0 new` | Pass |
| Fitness determinism | one entry digest | two final reports share SHA-256 `f56cda3a0184a6d7a1760b5e0d75db302fe636706b2cb1e6611322f615a11fd6` | Pass |
| Backend topology | one eager four-node SCC; nine nodes when deliberate dynamic imports were included | static `532 files / 2,294 edges / 0 SCC`; full `532 / 2,301 / 0 SCC` | Pass |
| Web topology | one two-node type SCC | static `438 files / 1,220 edges / 0 SCC`; full `438 / 1,260 / 0 SCC` | Pass |
| Backend private boundaries | four new cross-owner private edges | zero new fitness finding | Pass |
| Controller authority | seven controller-to-repository findings | repository import `0`; repository construction `0` | Pass |
| Web model direction | seven model-to-query reversals | model-to-query `0`; domain UI raw RPC `0` | Pass |
| Ordinary page transport | two page raw-RPC findings | one named terminal OAuth callback exception | Retained |
| PR UI depth | primitive-owned query finding | primitive-to-query `0`; query-owning wrapper is a composite | Pass |
| Package contract owner | stable facade sourced five groups from implementation leaves | `21` names, five direct owner-contract leaves, type-only, no wildcard; recursive `7 files / 7 edges / 0 violations` | Pass |
| Exact compatibility | unclassified bridges, Job adapter/API/columns and env alias | `7` ledger rows removed; `6` retained/external/future/independent rows have owner and exit | Pass |

## Sole Architecture Finding

`apps/web/src/pages/WeChatOAuthCallbackPage.vue:92` invokes `client.api` at
the terminal route callback boundary. It remains a named Phase 4 compatibility
seam with an owner, reason and replacement/provider/runtime/System exit
condition. No ordinary page or domain UI may copy it.

## Deliberate Residual Surfaces

- The two RideHailing provider-composition imports remain delayed; both graph
  modes are acyclic.
- The Backend package root remains a Phase 3 registered legacy surface:
  `47` explicit symbols, no wildcard and no runtime root import. Current
  repository consumers use only `AppType`, `PRId` and
  `OrderingOfferDetail`; the surface did not expand in Phase 8. Broad barrel
  cleanup was not authorized and is not described as complete.
- `notification_deliveries`, the CaoCao legacy route, the direct OAuth
  callback and Drizzle generator provenance retain the dispositions in the
  `8-6` compatibility ledger.

No local architecture conflict was reopened.
