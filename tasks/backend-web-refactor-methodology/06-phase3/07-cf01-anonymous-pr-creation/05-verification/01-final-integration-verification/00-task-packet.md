# 07E.1 — Final Integration Verification

## Objective

Close CF-01 only when the decided authenticated-first creation contract is demonstrated from durable truth through
Backend ingress and legacy-DRAFT privacy to Browser A. This is a verification subtask: it may add the smallest missing
test-only seam, but it may not redesign authentication, OAuth, DRAFT recovery, HTTP contracts, or historical data.

## Entry Inventory

- 07A durable rebaseline, 07B creation guard/WeCom, 07C DRAFT policy and 07D Browser A have each recorded focused
  evidence.
- The current public LLM/share read path enters `domains/pr/queries.getPR`, which applies anonymous DRAFT access
  policy before either a public projection or an external provider call. Existing proof covers policy and share cache;
  the provider short-circuit needs a cheap controller-level proof.
- The System PR-create file contains both the anonymous zero-POST/cancel-retention case and ordinary authenticated
  create cases. The scenario project owns its temporary database and services.

## Owned Surface

- This directory's plan, rehearsal, command log and exit evidence.
- At most one focused backend controller test that proves an inaccessible PR prevents an external LLM call.
- CF-01/Phase-3 task-packet status reconciliation after all exit gates are green.

## Non-goals

- No external AI invocation, provider configuration, OAuth/session redesign, response-contract change, DRAFT cleanup,
  schema/migration, or historical-row mutation.

## Stop Conditions

- Any `USER` ingress persists a creatorless/anonymous PR or DRAFT.
- A public/share/LLM path reaches a DRAFT projection or provider call.
- Browser A emits a create POST before explicit authentication or retains/replays its command.
- Focused or full scenario evidence reveals a cross-unit regression. Return to 07B, 07C, or 07D by owner instead of
  changing expectations here.

## Status

Complete. The final command log and scope audit are recorded in [`exit-evidence.md`](./exit-evidence.md) and
[`scope-audit.md`](./scope-audit.md). CF-01 has no remaining authorization, Browser A, DRAFT-privacy, provider-chain
or cross-unit proof gap within its declared scope.
