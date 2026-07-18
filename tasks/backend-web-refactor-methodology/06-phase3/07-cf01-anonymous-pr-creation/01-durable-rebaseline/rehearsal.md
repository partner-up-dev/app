# 07A Durable Rebaseline — Mental Rehearsal

The rehearsal is a sequence check for wording, not a runtime test.

```text
Anonymous browser enters /pr/new or /prd
  -> transient authoring only
  -> explicit sign-in disclosure
       ├─ cancel: editor remains; zero create POST and zero PR row
       └─ confirm: OAuth starts; after return user must explicitly submit
  -> authenticated USER create command
  -> first durable write binds createdBy to authenticated user
  -> one-command result is OPEN and shareable
```

## Branch checks

| Branch / surprise | Durable decision rule | Cheapest evidence to cite |
| --- | --- | --- |
| Anonymous wording still says “creates DRAFT” | Replace with preflight/no-row/no-replay Browser A wording | `core-pr.md`, `rules-and-invariants.md`, Browser A preflight |
| `/prd` handoff accidentally gets a PR identity | Keep criteria transient until ordinary authenticated create returns `prId` | `pr-discovery-and-authoring-contracts.md: Authoring Handoff`, PRD discovery workflow |
| WeCom `FromUserName` looks like an OAuth `openId` | Do not infer mapping; reject before persistence and avoid a success URL | 07B entry inventory and `wecom.controller.ts:247-301` |
| Admin or system row appears creatorless | Treat explicit `ADMIN`/`SYSTEM` as authority cases, not anonymous USER behavior | create-caller inventory and lifecycle contract |
| Publish fails after root insert and leaves `DRAFT` | Call it cleanup residue only; never promise recovery/claim or delete historical rows in durable wording | 07C failed-create preflight |
| OAuth handoff docs mention replay | Keep generic transport semantics; Browser A create owner opts out of create replay without changing cookie/nonce protocol | `wechat-oauth-handoff.md:24-46` |
| Existing natural-language local text is found | Keep it as a browser convenience only; do not promote it to a durable PR or pending create intent | 07D Browser A preflight, `useNaturalLanguageDraft.ts` evidence |

## Consistency assertions

1. “Authenticated before USER persistence” appears identically in PRD invariants, both core workflows, Discovery
   handoff, and PR Lifecycle TDD.
2. “No anonymous/creatorless USER DRAFT” does not erase the explicit `ADMIN` and `SYSTEM` cases; SYSTEM's
   creatorless `OPEN` expansion is not a browser draft.
3. “No automatic replay” applies to the Browser A create command only. It does not alter the generic OAuth handoff
   nonce/cookie transport or unrelated join/waitlist/publish pending-action owners.
4. “Failed-create residue” is an implementation safety fork. It is not a new lifecycle status, a user-visible recovery
   promise, or permission for ordinary users to claim creatorless historical rows.

## Rollback thought experiment

If the product decision is withdrawn, revert the coherent durable wording batch as one reviewable change and reopen the
decision brief. Do not partially restore one anonymous-DRAFT sentence while leaving Product TDD and Browser A wording
auth-first; a mixed contract is the exact contradiction this packet is intended to expose.
