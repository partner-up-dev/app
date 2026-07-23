# `6-2` Durable Promotion Log

| Durable document | Promoted fact | Why it is durable |
| --- | --- | --- |
| `docs/20-product-tdd/notification-contracts.md` | Notification root now has the business command/contract surface; legacy per-kind helpers are explicit compatibility-only. | This is an owner/dependency direction, not a temporary implementation note. |
| `docs/20-product-tdd/notification-contracts.md` | `pr.waitlist-promoted` is the first generic `notification.send.v1` vertical, with private `ONCE_PER_CAUSE` policy, top-level causal task metadata and no new opportunity/delivery row. | It defines the repeatable migration shape and what later slices must preserve. |
| `docs/20-product-tdd/notification-contracts.md` | The new vertical separates preference from limited credit and treats all current non-`43101` channel failures as non-retrying ambiguous outcomes. | These are behavior/authority decisions required for consistent later channel migrations. |
| `docs/20-product-tdd/notification-contracts.md` | Historical `wechat.*` retry classification is compatibility-only; the temporary legacy ↔ PR ↔ infrastructure path is a migration risk, not an extension point. | Later family cutovers need a durable anti-widening rule rather than treating old adapters as a competing contract. |

At the `6-2` exit the post-promotion scheduling handoff was intentionally not
promoted because it was not atomic/recoverable. `6-3` later closed that debt;
the resulting named transaction boundary is now promoted in the current
durable Notification contract.
