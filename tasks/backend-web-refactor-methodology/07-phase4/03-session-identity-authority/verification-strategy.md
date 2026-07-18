# 4-2 Verification Strategy

| Layer | Cheap proof before expansion | Exit proof |
| --- | --- | --- |
| User query | unit classification of active, disabled, anonymous, authenticated and operator roles | focused backend scenario through `authMiddleware` and `/auth/session` |
| Auth transport | selected `/auth/session` and protected-route requests with real Postgres rows | existing anonymous UUID scenario plus new public-session authority scenario |
| Web process | fake boundary test of fresh register, restore and 401 recovery ordering | Web type/build and targeted process/storage tests |
| Cross-unit | one real browser storage recovery path | one System scenario: UUID-only revisit retains user; disabled UUID becomes a new anonymous user |

The minimum final command set will be recorded with actual outcomes, but it is expected to include focused Backend
unit/scenario, focused Web unit, one System scenario, backend/web type and lint slices, changed-file formatting,
and `git diff --check`. Full all-repo checks are not a substitute for the owner-specific proof.

## Result

All named proofs passed. The exact commands, counts and the one corrected test-isolation failure are in
[`verification-log.md`](./verification-log.md); the final acceptance claim is in
[`exit-evidence.md`](./exit-evidence.md).
