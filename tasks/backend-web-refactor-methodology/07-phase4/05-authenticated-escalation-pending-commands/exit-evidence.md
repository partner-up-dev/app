# 4-4 Exit Evidence

## Completed Local Exit

- `lib/rpc` has no static OAuth/process import. It owns token rotation and response reporting; `AppRoot` registers
  the Web auth process coordinator.
- One concrete `Response` schedules at most one fallback OAuth escalation. A PR adapter persists its named intent,
  then claims that same response and cancels the fallback before using the existing OAuth single flight.
- Pending storage remains one validated, TTL-bounded browser-continuity entry. It delivers at most once: the entry
  clears immediately before a ready matching handler and never auto-reinserts after a handler failure.
- The exact continuation set is `PR_JOIN`, `PR_WAITLIST`, `PR_EXIT`, `PR_CONFIRM`, and `PR_PUBLISH`; `PR_CREATE`
  and every other command remain no-replay. `PR_WAITLIST` preserves its reminder choice only to reopen the gate.
- Focused Web proof is 20/20, the full Web unit suite is 189/189, and Backend mock OAuth/handoff proof is 3/3.
  Root type, lint, build, and diff hygiene all pass. Scoped formatting passes; the full formatter still reports 22
  unrelated baseline paths and was not broad-rewritten. Commands and scope are recorded in the verification log.
- The three verified owner rules were promoted to the designated Product/Unit TDD documents.

## Explicit Proof Boundary

The desired single Browser-to-Backend continuation scenario reached mock OAuth login but could not preserve its
state/handoff cookie across the harness's `127.0.0.1` frontend and its generated `localhost` callback. The exact
reproduction and non-forged remediation condition are in
[the 4-4.4 harness limitation](./04-escalation-journey-proof/harness-blocker.md). This is a System-harness
canonical-host issue, not a reason to alter OAuth callback topology or claim 4-3.4 provider/production evidence.
