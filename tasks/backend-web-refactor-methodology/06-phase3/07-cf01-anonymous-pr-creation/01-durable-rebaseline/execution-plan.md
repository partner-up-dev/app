# 07A Durable Rebaseline — Execution Plan

This is a proposed documentation-only execution sequence. It does not authorize production, test, or existing durable
document edits in this entry-design task.

## 1. Re-freeze evidence immediately before editing

Refresh the anchors in [`document-map.md`](./document-map.md) and verify the current runtime evidence:

- H5 mutation middleware rejects non-authenticated roles before create handlers
  (`apps/backend/src/controllers/partner-request.controller.ts:57-64,117-173`).
- Canonical USER create currently inserts before final publish; the accepted target must move the guard before the first
  persistence call (`apps/backend/src/domains/pr/commands/create-pr-structured.ts:105-149`).
- WeCom supplies no authenticated identity and currently calls NL create with null identity
  (`apps/backend/src/controllers/wecom.controller.ts:247-301`).
- Existing Product TDD already requires authenticated USER create and `OPEN` one-command outcome
  (`docs/20-product-tdd/pr-lifecycle-contracts.md:17-25`).
- Browser A preflight says no create POST, no server row, and no automatic replay
  (`.../04-web-ux-auth-decision/01-browser-a-preflight/01-audit-evidence.md`).
- Failed authenticated create can leave an owner-bound `DRAFT`; cleanup is not yet safe to promise
  (`.../03-legacy-draft-hardening/02-failed-create-cleanup-preflight/00-cleanup-preflight-evidence.md`).

If fresh source contradicts the accepted policy, stop and reopen the decision; do not normalize the contradiction in
prose.

## 2. Apply one coherent durable wording batch (future execution)

Edit only the files and anchors in `document-map.md`, in this order:

1. PRD invariants (`rules-and-invariants.md`) to establish actor/persistence vocabulary.
2. Core and Discovery workflows to make Browser A observable at `/pr/new` and `/prd`.
3. Capability summary to remove the ambiguous anonymous-draft reading.
4. Product TDD lifecycle contract to preserve route/error shapes while stating USER-before-write and
   command-owner-specific replay.

Do not add a new capability, local-draft schema, WeCom mapping, or cleanup API in this batch.

## 3. Review actor × ingress × persistence coherence

The review must answer all four rows without exceptions hidden in wording:

| Row | Expected durable statement |
| --- | --- |
| `USER` / public H5 or `/prd` | Authenticated before first write; `createdBy` is that user; normal success `OPEN`. |
| `USER` / WeCom adapter | No mapped authenticated user means no create and no success link; mapping is a later 07B-owned design. |
| `ADMIN` | Explicit admin command remains valid and separate. |
| `SYSTEM` | Explicit full-capacity expansion remains valid and may be creatorless `OPEN`; it is not anonymous authoring. |

Failed-create residue is discussed only as implementation cleanup risk. It must not be described as a recoverable
anonymous draft or as permission to claim a legacy creatorless row.

## 4. Lowest-cost validation after the wording batch

Run and record, without claiming runtime implementation:

```bash
rg -n -i "anonymous.*(create|draft)|create.*anonymous|creatorless.*draft|later authenticated|save.*draft" \
  docs/10-prd docs/20-product-tdd docs/30-unit-tdd
rg -n "AUTHENTICATED_REQUIRED|ADMIN|SYSTEM|createdBy|OPEN" \
  docs/10-prd/behavior/rules-and-invariants.md \
  docs/10-prd/behavior/workflows/core-pr.md \
  docs/10-prd/behavior/workflows/pr-discovery-and-authoring.md \
  docs/20-product-tdd/pr-lifecycle-contracts.md
git diff --check -- docs/10-prd docs/20-product-tdd docs/30-unit-tdd
```

The first search should find only the explicit “no server row/no replay” and legacy remediation boundaries, not a
positive anonymous-DRAFT promise. Review every relative Markdown link touched in the diff and resolve it from the
source file's directory; at minimum verify the existing links to `pr-lifecycle-contracts.md`,
`pr-discovery-and-authoring-contracts.md`, and `wechat-oauth-handoff.md`. Repository-wide static gates are deferred to
the owning implementation/verification slices because Markdown is outside Oxfmt ownership.

## 5. Stop and hand off

Stop 07A if:

- a proposed sentence weakens explicit `ADMIN` or `SYSTEM` authority;
- a WeCom sentence assumes `FromUserName` maps to `users.openId`, an anonymous UUID, or a new auth protocol;
- wording promises local structured-draft retention, capability recovery, or automatic post-OAuth create;
- failed-create residue is presented as a supported DRAFT instead of a bounded transaction/cleanup fork.

After the durable diff is reviewed, hand runtime work to 07B/07C/07D and verification to 07E. This packet does not
claim any of those actions are complete.
