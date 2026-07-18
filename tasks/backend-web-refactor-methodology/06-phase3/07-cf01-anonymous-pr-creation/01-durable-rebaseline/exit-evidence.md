# 07A Durable Rebaseline — Exit Evidence

Date: 2026-07-17

## Scope and policy

Only the five frozen durable documents were edited. The accepted Browser A contract is stated as durable target
behavior: USER persistence requires an active authenticated user, a successful normal USER create returns `OPEN`,
and anonymous public/WeCom ingress does not create a server-side USER `DRAFT`. Browser A performs auth before POST,
requires explicit OAuth confirmation, and does not automatically replay a create command after OAuth. Explicit
`ADMIN` and `SYSTEM` authorities remain separate. Creatorless historical `DRAFT` rows and failed authenticated
create residue are remediation/cleanup boundaries, not recovery UX.

## Refreshed evidence

- `apps/backend/src/controllers/partner-request.controller.ts:57-64,117-173` applies authenticated mutation
  middleware and resolves an authenticated creator before the USER create handlers.
- `apps/backend/src/domains/pr/commands/create-pr-structured.ts:105-149` still shows the pre-fix implementation
  ordering (creator resolution, root `DRAFT` write, then materialization); the durable wording records the selected
  contract target rather than claiming this runtime path is already corrected.
- `apps/backend/src/controllers/wecom.controller.ts:247-301` passes null authenticated/anonymous/oauth identity
  for the WeCom natural-language create path; no `FromUserName` mapping is inferred.
- Browser A preflight (`04-web-ux-auth-decision/01-browser-a-preflight/01-audit-evidence.md`) requires no anonymous
  create POST, no server row, no durable structured local draft, and no automatic post-OAuth replay.
- Failed-create cleanup preflight (`03-legacy-draft-hardening/02-failed-create-cleanup-preflight/00-cleanup-preflight-evidence.md`)
  records owner-bound `DRAFT` residue and non-transactional child effects as a 07C stop/fork, not a supported draft
  or recovery path.

## Durable changes

- `core-pr.md` now gives natural-language and structured creation the same authenticated USER / transient anonymous /
  explicit-submit contract.
- `pr-discovery-and-authoring.md` keeps `/prd` handoff transient and requires auth before USER persistence.
- `rules-and-invariants.md` states USER-before-write, `createdBy`, `OPEN` one-command success, no anonymous or
  creatorless USER `DRAFT`, separate `ADMIN`/`SYSTEM`, and historical creatorless-DRAFT remediation boundaries.
- `capabilities.md` removes the ambiguous anonymous-draft capability reading.
- `pr-lifecycle-contracts.md` states the USER guard, WeCom adapter boundary, stable anonymous publish error, and
  Browser A command-owner-specific no-replay behavior.

## Focused validation

Commands run from repository root:

```text
rg -n -i "anonymous.*(create|draft)|create.*anonymous|creatorless.*draft|later authenticated|save.*draft" \
  docs/10-prd docs/20-product-tdd docs/30-unit-tdd
rg -n "AUTHENTICATED_REQUIRED|ADMIN|SYSTEM|createdBy|OPEN" \
  docs/10-prd/behavior/rules-and-invariants.md \
  docs/10-prd/behavior/workflows/core-pr.md \
  docs/10-prd/behavior/workflows/pr-discovery-and-authoring.md \
  docs/20-product-tdd/pr-lifecycle-contracts.md
git diff --check -- docs/10-prd docs/20-product-tdd docs/30-unit-tdd
```

The first search returns only explicit no-row/no-replay and legacy-remediation boundaries; it returns no positive
anonymous-DRAFT promise. The authority/status search finds `AUTHENTICATED_REQUIRED`, explicit `ADMIN`/`SYSTEM`,
`createdBy`, and `OPEN` wording in the frozen documents. `git diff --check` passes. Existing cross-unit links to
`pr-lifecycle-contracts.md`, `pr-discovery-and-authoring-contracts.md`, and `wechat-oauth-handoff.md` resolve to
files present in the repository.

No runtime, test, schema, migration, OAuth transport, WeCom mapping, cleanup, or local structured-draft behavior is
claimed complete by this packet.
