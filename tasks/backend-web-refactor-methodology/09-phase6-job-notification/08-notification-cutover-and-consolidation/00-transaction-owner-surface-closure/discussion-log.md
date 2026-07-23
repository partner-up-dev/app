# `6-3.1h` Discussion Log — Source-to-Job Writer Leak

## Observation

The participant-release work exposed an inconsistency: its new semantic
invalidation factory correctly receives only a source transaction executor,
while older scheduling paths pass `createTransactionBoundJobWriter(tx)` from
PR/POI/admin source code into Notification. The direct imports appear in a
finite set of named transactions, not in arbitrary application code.

## Alternatives Considered

### Leave the existing writer injection as a documented compatibility exception

Rejected. The edge is not a legacy runtime drain or a provider limitation; it
is newly maintained source architecture. An exception list would make future
source slices copy the wrong shape and contradict the public-surface rule.

### Introduce a generic cross-domain transaction/orchestration framework

Rejected. The source transactions are deliberately distinct business
protocols. A generic callback would widen the capability that domains receive
and hide their lock/rollback topology.

### Make each Notification factory executor-facing

Selected. The caller already owns the transaction executor. Notification can
bind the same executor to its private generic Job writer while exposing only a
template-specific semantic port. This removes the leak without changing
transaction topology or product behavior.

## Consequence For Later b3 Work

Terminal, tombstone and root-delete wiring must consume this executor-facing
surface. They may not solve their own release needs by importing Job, even if
that seems mechanically shorter.
