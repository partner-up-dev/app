# 06C.2 — PR Lifecycle value migration

## Objective

Migrate stable PR lifecycle status, join-gate and feedback value types to the contracts entry while recording every
`PRId` consumer as a compatibility exception. Keep lifecycle query adapters and 06B type facades behaviorally stable.

## Exact ownership

The frozen paths and symbols are in [`entry-inventory.md`](entry-inventory.md). Safe targets are `PRStatus`,
`PRStatusManual`, `PRJoinGateConfig` and its three join-gate companion types, and `FeedbackQuestionnaireAnswers`.
`PRId` is explicitly root-retained in every listed identity consumer; this packet must not invent an ID contract alias.

## Rehearsal and stop gates

Follow [`rehearsal.md`](rehearsal.md). Stop on a status transition or join-gate response change, any attempt to
remove a 06B query facade before its consumer family is migrated, a runtime import, or an unexplained `PRId`
residual. PR Discovery value files and Admin management files are outside this packet.

## Cheapest verification

Use focused `rg` symbol counts, lifecycle unit tests, `pnpm check:type:web`, and `pnpm check:build:web`.
Type-only moves do not require System; run the named PR scenario only if its test import is edited.

## Status

Complete on 2026-07-17. Lifecycle value imports resolve through `@partner-up-dev/backend/contracts`; the 27 listed
`PRId` compatibility imports remain at the package root. See [`exit-evidence.md`](exit-evidence.md).
