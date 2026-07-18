# 4-1 Durable Documentation Plan

The narrow `4-1` implementation now promotes only the source-level browser-origin authority. The post-rollout
header probe is still required before treating live deployment behavior as observed truth.

| Candidate truth | Durable owner | Promotion threshold |
| --- | --- | --- |
| Allowed production/staging Web-to-API origin pairing and configuration owner | `docs/40-deployment/backend-runtime.md` | Promoted as a deployment rule; exact live headers remain pending normal rollout probes. |
| Credentialed CORS and `returnTo` authority | `docs/20-product-tdd/cross-unit-contracts.md` | Promoted from positive/negative API proof; no request-derived configuration remains. |
| Callback/handoff topology, cookie and cache/redaction invariants | `docs/30-unit-tdd/wechat-oauth-handoff.md` | Deferred to `4-3`; provider-free callback/handoff System proof covers the selected topology and compatibility path. |
| Frontend callback compatibility exception | `docs/20-product-tdd/architecture-objectives-and-decision-rules.md` or Web architecture owner | Deferred to `4-3`; a named external consumer/exit condition exists, or retirement has consumer-free proof. |

The route-local `returnTo` invariant is also promoted to `docs/30-unit-tdd/wechat-oauth-handoff.md`; that is not a
promotion of callback/handoff topology. The current live-probe transcript, GitHub Environment values, DNS results
and historic commits remain task-local evidence because they are time-sensitive observations.
