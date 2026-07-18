# 08A Mental Rehearsal

| Fork / surprise | Decision | Cheapest evidence |
| --- | --- | --- |
| `c.json` serializes `userId`, `auth`, or token fields | Treat as a real public-contract/security mismatch; stop before doc correction | controller source plus HTTP scenario capture |
| Header is not `x-access-token` or not visible to shared Web transport | Stop and classify as a transport contract fork | Hono auth helper + Web RPC response hook |
| Existing tests prove waitlist semantics but not absence of body credentials | Leave a minimal test-only assertion for 08C; do not change runtime in 08A | current scenario/test inventory |
| The stale statement has multiple durable authorities | Reconcile ownership before changing wording; do not patch one line in isolation | focused durable search |
| Trace expands into OAuth mechanics | Route the broader work to User/Auth; CF-02 stays header/body contract-only | import/call chain boundary |

No Browser/server session is created for observation outside the existing test infrastructure, and no token value is
recorded in task evidence.
