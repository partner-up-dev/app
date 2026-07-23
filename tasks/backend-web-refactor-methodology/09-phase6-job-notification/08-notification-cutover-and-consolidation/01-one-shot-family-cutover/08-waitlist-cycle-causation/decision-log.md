# `6-3.1c-1` Decision Log

| ID | Decision | Exit proof |
| --- | --- | --- |
| `6-3.1c-1-D1` | A waitlist entry, rather than a reusable Partner row, is the causal identity for `pr.waitlist-promoted`. | The same Partner row promoted in cycles A and B creates two different generic Job keys and causation IDs. |
| `6-3.1c-1-D2` | New public requests require a UUID cycle, but the private generic v1 decoder keeps it optional solely for historical-row decoding. | New request validation rejects omissions; an old v1 payload reaches its handler rather than becoming `INVALID_PAYLOAD`. |
| `6-3.1c-1-D3` | A generic v1 task without a cycle always safe-skips; it is never inferred from an active slot. | The owner/runtime scenario observes no channel call or credit mutation and terminal reason `LEGACY_WAITLIST_CYCLE_UNVERIFIABLE`. |
| `6-3.1c-1-D4` | The old per-kind waitlist-promoted handler is a separate compatibility drain, not an alternate implementation of generic v1 semantics. | Source inventory shows new promotion writes only `notification.send.v1`; the old handler retains its independent payload/registration gate. |
