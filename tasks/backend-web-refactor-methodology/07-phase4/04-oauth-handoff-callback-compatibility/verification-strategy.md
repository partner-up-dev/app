# 4-3 Verification Strategy

## Cheapest Useful Proof

| Layer | Proof | Required assertion |
| --- | --- | --- |
| Backend | Isolated app/scenario request sequence with a cookie jar | Rejected public identity produces 403 Problem Details, no auth/accessToken/x-access-token, no-store, and replay is rejected |
| Backend | Bind branch focused proof | Rejected identity never reaches a success bind marker |
| Web process | Mocked RPC/browser result tests | A received failure clears nonce and selects fresh login; a thrown fetch retains nonce and retry |
| Web page | Direct callback failure test or narrow browser-global proof | Code/state are scrubbed, pending state clears, and no auth projection is applied |
| Integration | Browser sequence only if origin model is faithful | Claim scope states whether it proves same-origin plumbing or distinct-origin cookie behavior |

## Required Checks After A Meaningful Batch

- targeted Backend scenario/unit test;
- targeted Web process/component test;
- affected app typecheck and lint;
- affected app build where the UI import or RPC inference changes;
- diff whitespace check and protected-path audit.

## Evidence Rules

Test output records command, result, and scope. A local mock or proxy cannot be called a staging/production OAuth
probe. Public rollout observation is recorded only after a state-free request reaches the deployed endpoint and
its response headers/redirect chain are captured.
