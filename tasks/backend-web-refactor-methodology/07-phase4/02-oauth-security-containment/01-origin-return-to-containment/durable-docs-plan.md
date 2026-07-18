# 4-1 Durable Documentation Promotion

The implementation proof is sufficient to promote the source-level authority rule, but not to claim that the normal
deployment has already changed. The rollout probe remains task-local evidence.

| Proven fact | Durable owner | Promotion result |
| --- | --- | --- |
| `FRONTEND_URL` is the owner-backed credentialed browser origin for the selected environment | `docs/40-deployment/backend-runtime.md` | Promoted: it is configuration authority for credentialed CORS and OAuth returns, with an explicit paired-deployment rule. |
| CORS and OAuth `returnTo` use the same explicit origin authority | `docs/20-product-tdd/cross-unit-contracts.md` | Promoted: exact-origin and no request-header inference constraints. |
| OAuth route-local return-target invariant | `docs/30-unit-tdd/wechat-oauth-handoff.md` | Promoted: login/bind normalization and rejection semantics. |
| Callback/handoff topology remains unchanged | Task-local [exit evidence](./exit-evidence.md) only | Not promoted as a topology fact; `4-3` owns provider/callback/cookie evolution. |
