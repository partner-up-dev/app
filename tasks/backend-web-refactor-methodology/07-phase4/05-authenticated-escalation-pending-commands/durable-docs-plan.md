# 4-4 Durable Documentation Plan

| Verified claim | Candidate durable owner | Promotion condition |
| --- | --- | --- |
| transport reports response; browser process owns escalation; command claims after durable intent | `docs/20-product-tdd/cross-unit-contracts.md` | focused boundary proof plus host-limitation record agree |
| named PR continuation set, at-most-once consumption, no-create-replay | `docs/20-product-tdd/pr-lifecycle-contracts.md` | all five adapters and proof inventory are complete |
| callback return ordering for command continuation | `docs/30-unit-tdd/wechat-oauth-handoff.md` | handoff gate + strongest lower proof agree without changing callback topology |

Do not promote route auto-login, legacy facades, provider-console state, or cross-origin production observations.

## Promotion Result

All three named clauses were promoted on 2026-07-18. The Browser-to-Backend attempt stopped at a `127.0.0.1` versus
`localhost` cookie-host mismatch, so promotion records the implemented owner protocol and its focused proof only;
it makes no full-browser, provider, or production-topology claim.
