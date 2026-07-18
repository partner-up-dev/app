# 4-3.3 Honest Journey Proof

## Goal

Prove the changed OAuth failure contract at the least expensive faithful layer, while making every conclusion
explicit about whether it covers application semantics, same-origin plumbing, or real distinct-origin cookies.

## Scope

This subtask owns focused Backend/Web tests and only a minimal System harness adjustment if it can model distinct
Web/API origins without copying cookies or disguising a proxy as deployment topology.

## Non-Goal

Do not rewrite the full scenario infrastructure merely to add one OAuth test. Do not make the mock authorize
endpoint appear to validate a provider callback URL it does not use.

## Completion

Focused contract proof is complete locally on 2026-07-18. No System harness mutation was made because the current
same-origin proxy topology cannot honestly prove cross-origin API-cookie behavior; that limitation remains part of
the claimed result rather than being hidden by a synthetic browser journey.
