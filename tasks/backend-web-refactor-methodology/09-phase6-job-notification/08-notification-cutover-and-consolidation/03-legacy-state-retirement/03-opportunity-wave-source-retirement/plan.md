# `6-3.3d` Plan

1. Freeze/archive under the `6-3.3a` decision and prove all source callers have
   migrated or are intentionally retained decoder-only paths.
2. Delete the dead opportunity/wave source helpers, repositories and entities;
   simplify legacy exports/registration without removing required Job decoders.
3. Apply the forward migration with clean/nonempty fixture coverage.
4. Run structural zero-reference audit and affected backend static/scenario
   gates.

## Cheapest Credible Verification

One old-data migration fixture plus a source import ledger showing zero
Opportunity/Wave table imports outside migration/archive code.
