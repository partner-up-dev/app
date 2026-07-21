# 5-6 Rehearsal

1. A direct importer appears: classify production, controller, script, test kit, type-only, or generated consumer.
2. If a caller needs a stable fact, expose a named contract/query; if it needs behavior, expose a command or real
   provider port.
3. If replacement makes a cycle, preserve the edge as a documented window and return to the owner design.
4. Only after zero inventory, delete old export/path and run its focused behavior proof.

The desired end state is fewer owner-crossing edges, not merely a different set of barrel names.

## Merchandising production category cutover rehearsal

| Edge | Category replacement | Cycle check / abort condition |
| --- | --- | --- |
| Admin Commerce controller → Merchandising root | create functions from `commands`; create-input types from `contracts` | category files may re-export existing owner symbols only; abort if controller behavior or validation types change |
| Placement controller → Merchandising root | placement read functions from `queries`; result types from `contracts` | preserve the in-flight `PlacementOrderingEntryResult` correction; no controller-owned projection duplication |
| `commerce-quote` entity → model/root | `ProductType` and `PriceExplanation` directly from their pure model modules | the entity must not depend on a contracts barrel that points back through use-cases; abort on any entity→contracts→use-case edge |
| backend package type export → Merchandising root | stable `OrderingEntryPayload` and `OrderingOfferDetail` from `contracts` | package seam remains type-only; no runtime schema or wildcard export |

The new category files deliberately export only the symbols in this production consumer inventory. Stable DTO
definitions live in pure `contracts`, and use-cases consume/re-export them for root compatibility rather than
`contracts` forwarding application-layer definitions. Tests and the Merchandising root barrel remain unchanged
compatibility consumers in this batch.

### Expanded production root-edge classification

The AST import inventory found seven runtime and ten type-only production edges after the controller cutover:

- **Commands:** no additional edge. Admin update use-cases remain the commands; the imported Merchandising helpers
  are pure contract validation/value functions rather than state-changing commands.
- **Queries:** no additional root edge beyond the three Placement reads already exposed.
- **Contracts:** Admin and Trade consume pure catalog, placement, pricing, service-policy, and SKU-facts types,
  invariant validators, the empty-presentation value factory, and two SKU-facts runtime type guards. These live
  beside the pure contracts without a repository dependency; the one binding-contract helper was narrowed from an
  entity-row type to `{ productType: ProductType }`.
- **Ports:** none. No current root consumer crosses a provider/replacement/transaction boundary, so an empty ports
  surface would be misleading.

Three Trade test imports remain explicitly out of scope. The completion condition is zero production import AST
matches whose source ends at `/merchandising`, not deletion of the root compatibility barrel.
