# 4-1 Rehearsal

| Proposed change | Expected result | Failure branch |
| --- | --- | --- |
| Pair-specific CORS predicate | Each API accepts only its same-environment Web origin for credentialed browser access. | If an existing named consumer needs another origin, add it only through explicit deployment configuration and proof. |
| Shared return-target predicate | OAuth navigation can return only to the environment’s trusted Web origin; raw request headers cannot widen it. | If a required return URL is not under that origin, stop and frame it as a product/deployment decision. |
| Callback/handoff untouched | Existing OAuth caller shape and nonce/cookie behavior stay unchanged. | If tests show a callback/cookie behavior delta, revert that portion and move it to `4-3`. |

The slice is ready only after each expected result has a focused test before the implementation is written.
