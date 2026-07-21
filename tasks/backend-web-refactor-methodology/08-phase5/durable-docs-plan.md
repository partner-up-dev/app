# Phase 5 Durable-Documentation Plan

| Stable truth, only after proof | Durable owner | Not promoted until |
| --- | --- | --- |
| Commerce owner surfaces and allowed dependency direction | `docs/20-product-tdd/unit-topology.md` | **Promoted:** category surfaces, RideHailing transaction exception, and compatibility-root retirement are verified |
| Commerce fact authority, Ride lifecycle sequence, observation/read distinction, and vocabulary | `system-state-and-authority.md`, `ecommerce-contracts.md`, `ecommerce-provider-contracts.md`, and the PRD glossary as appropriate | **Promoted:** C0 characterization and source/scenario proof agree; task-local discovery did not overwrite unproved runtime truth |
| quote/admission and non-creator Placement behavior | PRD workflow/rules plus `ecommerce-contracts.md` | **Promoted:** D1 plus focused/browser proof agree |
| checkout retry/return and attempt identity | PRD workflow plus `ecommerce-contracts.md` | **Target truth promoted; recovery gap deferred:** D2, provider constraints, and the local journey proof agree, but post-settlement fee confirmation moves to a future job-runner/outbox design; cross-device return remains explicitly unsupported |
| Rental runtime retirement | PRD capability/scope/workflow, then `ecommerce-contracts.md` | **Target truth remains; known divergence deferred:** backend rejects new Rental traffic, but retained history can still lead to Bill payment/provider prepay; Sir's scope/risk acceptance does not authorize physical schema deletion or a durable-rule rewrite |
| RideHailing provider observation / final-settlement seam | `ecommerce-contracts.md` and `ecommerce-provider-contracts.md` | **Promoted:** callback/poll recovery proof agrees; current behavior is correction-required only, while D3 adjustment/refund remains deferred |
| callback edge / notify topology | `docs/40-deployment/` | actual staging/edge observation, never source inference |

The packet holds import inventories, structural metrics, complexity observations, historical-task discrepancies,
proof logs, and compatibility windows. They are not durable truth by themselves. The enduring architectural rule is
already owned by `architecture-objectives-and-decision-rules.md`: lower owner span and exposed dependency through
Commands, canonical Queries, stable Contracts, and Ports; do not promote a temporary Phase metric into a new
constitutional rule.
