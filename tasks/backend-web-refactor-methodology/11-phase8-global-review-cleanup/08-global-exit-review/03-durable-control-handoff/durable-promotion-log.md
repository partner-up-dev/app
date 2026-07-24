# `8-7.3` Durable Promotion Log

Date: 2026-07-24

## Promoted Current Rules

- `apps/backend/AGENTS.md` now says the prior controller-to-repository and
  cross-domain private/deep-import windows are closed, and tells future work
  to add an owner command/query/contract/port instead of recreating an edge.
- `apps/web/src/ARCHITECTURE.md` now lists only the terminal WeChat OAuth
  callback as the current raw-RPC compatibility window; historical
  model-to-query/RPC edges are no longer described as pending.
- `apps/web/AGENTS.md` and
  `docs/20-product-tdd/unit-topology.md` now record that the top-level
  `router` and `stores` bridges are retired. Router wiring belongs to `app`;
  session state belongs to `shared/auth`.
- `apps/web/src/AGENTS.components.md`,
  `apps/web/src/domains/pr/ui/AGENTS.md` and
  `apps/web/src/ARCHITECTURE.md` record the stable rule that a composite may
  own one canonical query behind a stable id-based deep interface, while
  primitives receive projected display values.

These are generative rules a later developer needs in order to extend the
current architecture consistently.

## Deliberately Task-local

- architecture file/edge/finding counts, SCC counts and test totals;
- move/delete ledgers and compatibility search output;
- Phase 4/5 external proof procedure;
- the current working-tree and independent task status.

The durable objective function and four-category public-surface rule were
already sufficient. Phase 8 did not duplicate them into another durable
constitution.

## Reconciled Historical References

- Phase 4 event-time “commit pending” prose remains historical and carries a
  dated current-state annotation.
- Phase 7 entry conflict `P7-E007` remains historical and is explicitly
  superseded.
- Phase 7's `notification_deliveries` durable line references were rebased to
  the current section without changing the historical disposition.
- Current Program controls now state that Phase 7 already removed the carried
  debug/stdout, while professional O11y and delivery retention remain
  independent future work.
