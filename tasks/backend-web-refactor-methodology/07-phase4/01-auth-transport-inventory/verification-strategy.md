# 4-0 Verification Strategy

## Evidence Layers

1. **Static inventory:** `rg`/import graph/source location checks, excluding `tasks/`, generated output and
   dependencies.
2. **Contract comparison:** Product TDD session/error contract, OAuth handoff Unit TDD, PRD identity rules, then
   controller/process source trace.
3. **Focused executable probes:** only current tests that discriminate an uncertain claim, such as Backend
   application-auth/anonymous-session proof, Web RPC/auth-required/OAuth-handoff/pending-action units, and selected
   browser journeys for create gate or join replay.
4. **Synthesis integrity:** packet link check, stale-status/reference search, `git diff --check` for owned task files,
   and protected-path review.

## Escalation Rule

Do not run full lint/type/build or the full scenario suite merely to characterize current state. A later mutation
slice inherits the exact focused proofs that `4-0` identifies and adds type/build/System gates proportionate to its
changed boundary.
