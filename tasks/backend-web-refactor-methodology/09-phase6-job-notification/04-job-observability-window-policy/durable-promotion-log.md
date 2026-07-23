# D6-J-02 Durable Promotion Log

| Durable document | Promoted truth |
| --- | --- |
| `docs/20-product-tdd/architecture-objectives-and-decision-rules.md` | Facts default to their semantic owner when identity/lifecycle are shared; bounded collection facts may be embedded; independent entities and O11y history must each prove their placement. |
| `docs/10-prd/behavior/rules-and-invariants.md` | The current product has no backend-owned unread/read-receipt contract; visible-thread acknowledgment controls one message-attention window. |
| `docs/10-prd/behavior/workflows/messaging-reliability-and-study.md` | One delayed summary Job window is created per eligible unacknowledged period; hidden fetches do not acknowledge. |
| `docs/20-product-tdd/pr-messaging-contracts.md` | PRMessage owns message/ACL facts; no target inbox/read-state aggregate; future bounded viewing membership defaults to the message. |
| `docs/20-product-tdd/notification-contracts.md` | Notification owns template/channel/eligibility and any justified business-outcome semantics; Job is the durable opaque task and creation gate; attempt history belongs to O11y. |
| `docs/20-product-tdd/system-state-and-authority.md` | Job control state remains authoritative; old inbox/wave/delivery/opportunity stores are compatibility persistence only. |
| `docs/20-product-tdd/cross-unit-contracts.md`, `index.md`, `unit-topology.md`, `pr-lifecycle-contracts.md` | Cross-unit routing and owner topology now use visible-thread ACK, Job creation modes and O11y attempt boundaries. |
| `docs/20-product-tdd/analytics-and-telemetry-contracts.md` | Notification attempts are program O11y signals, never user telemetry or a control authority. |
| `docs/40-deployment/observability.md`, `recovery.md` | Operators diagnose generic Job execution through durable task state and correlated O11y; business reconciliation enters its semantic owner. Compatibility SQL remains until operational proof exists. |

Sir's later owner correction further distinguishes generic Job execution state
from owner-specific reconciliation. Operator business recovery reads and
mutates the semantic owner; Job/attempt signals remain execution evidence.

## Compatibility Window

Current source still contains `pr_message_inbox_states`, the read-marker API,
`notification_opportunities`, `notification_waves`,
`notification_deliveries`, and legacy notification handlers. Durable docs name
these explicitly as compatibility mechanisms, not target authorities. Their
removal requires a source/migration slice and the proof gates in `rehearsal.md`.
