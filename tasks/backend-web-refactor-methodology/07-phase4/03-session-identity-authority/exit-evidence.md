# 4-2 Exit Evidence

| Required exit | Result |
| --- | --- |
| One canonical persisted public-identity boundary | Complete: User query returns public identity or `null`; public middleware consumes it before controllers run. |
| Public roles cannot include operator roles | Complete: public classifier rejects `service`/`analytics`, including mixed rows; public direct issuers use it. |
| Anonymous creation and UUID restoration preserve owner direction | Complete: User command returns only identity; Auth controller issues the token; UUID restore accepts only active anonymous users. |
| One browser role/user projection and one token projection | Complete: Pinia contains public role/user ID; browser storage owns the public token. |
| Clean/recovery bootstrap has deterministic bounded behavior | Complete: clean browser registers once; restore is one attempt; `401` clears and registers once; other failures do not loop. |
| Browser-to-Backend continuity proof | Complete: real browser preserves UUID after token-only removal and receives a distinct UUID after persisted identity disablement. |
| Durable truth enables consistent future decisions | Complete: public identity, owner, recovery, and admin-separation rules were promoted to `cross-unit-contracts.md`. |

## Deliberate Non-Claims

- OAuth callback/handoff topology, cookie/nonce behavior, and navigation error semantics were not changed or proven.
- Operator bearer revalidation remains an admin-context concern and was not represented as complete.
- Pending-command escalation/replay, route auto-login, and telemetry identity were not changed.

The protected independent paths named in the root task packet were not edited as 4-2 output. `git diff --check`
passes after the final documentation update. No staging or commit was performed; a commit remains an explicit Sir
decision. The next eligible slice is `4-3`, but it still needs fresh entry evidence and implementation authorization.

Historical annotation (2026-07-24): this was the `4-2` event-time handoff.
`4-3` and the remaining local Phase 4 slices were subsequently authorized,
completed and committed. The root Program roadmap owns current status; the
external OAuth/provider/topology non-claims above remain unchanged.
