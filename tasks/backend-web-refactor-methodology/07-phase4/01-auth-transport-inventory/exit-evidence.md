# 4-0 Exit Evidence

## Outcome

`4-0` is complete as an exploration slice. It converted the initial broad Phase 4 assumption into five bounded
implementation proposals, identified the required decisions, and found a high-impact OAuth return-path/CORS/handoff
stop branch that must precede normal session/OAuth restructuring.

## Exit Conditions Reconciled

| Exit condition | Evidence | Result |
| --- | --- | --- |
| Auth edges have an owner/direction/role/confidence | Backend map, Web continuity map and journey map | Met; unresolved policy choices are explicitly named. |
| Public-user session source and compatibility seams are identified | Browser truth inventory plus callback/session maps | Met; source of authority is still a target for `4-2`, not silently asserted as current. |
| Candidate slices have inputs, stop branches and cheap proofs | Synthesis and Phase 4 slice map | Met. |
| Contract contradictions are resolved or escalated | Decision/risk register | Met; P4-R1/P4-R2/P4-R5/P4-R6 require decisions or an Impact Handshake. |

## Deliverables

- [Entry baseline](./entry-baseline.md)
- [Backend authority map](./01-backend-session-identity/authority-map.md)
- [Web continuity map](./02-web-oauth-rpc-continuity/continuity-map.md)
- [Cross-unit journey map](./03-cross-unit-journeys/journey-map.md)
- [Risk register](./04-synthesis-and-next-slices/decision-risk-register.md)
- [Synthesis](./04-synthesis-and-next-slices/synthesis.md)
- [Evidence index](./evidence-index.md) and [verification log](./verification-log.md)
- [Phase 4 slice map](../slice-map.md)

## Transition

`4-1` is the next dependency in the proposed order. Its topology evidence and solidified no-callback-change boundary
are recorded under [`../02-oauth-security-containment/`](../02-oauth-security-containment/); it can enter `Execute`
only when Sir explicitly authorizes runtime work. WeChat-console topology evidence is deferred to `4-3`.
