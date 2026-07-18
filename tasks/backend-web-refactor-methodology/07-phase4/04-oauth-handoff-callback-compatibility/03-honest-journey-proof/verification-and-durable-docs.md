# 4-3.3 Verification And Durable Docs

## Evidence Matrix

| Claim | Minimum proof |
| --- | --- |
| Expected rejected identity is token-free | Backend focused scenario |
| Received failure reaches terminal browser recovery | Web focused test |
| Navigation retry distinction is preserved | Web focused test |
| Real cross-origin cookie continuity | Distinct-origin controlled browser only |
| Provider/edge runtime correctness | Staging/production observation only |

No durable document is changed by a harness result alone. Durable promotion uses the source and focused contract
proof from 4-3.1/2; topology observations stay task-local until independently repeatable.

## Result

The Backend cookie-jar scenario and Web focused component/process tests establish the local contract. Their result
is explicitly not a real cross-origin cookie or provider/edge claim; the current harness limitation is retained in
the root verification log and 4-3.4 gaps.
