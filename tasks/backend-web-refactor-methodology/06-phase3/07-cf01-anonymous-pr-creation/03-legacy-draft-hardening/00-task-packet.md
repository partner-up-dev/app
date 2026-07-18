# 07C — Legacy DRAFT Hardening

## Objective

Close legacy DRAFT ownership and privacy gaps, and decide whether an authenticated DRAFT left by failed normal
creation is recoverable product state or cleanup residue. Prevent creatorless or cross-user DRAFT read, mutation,
publish or claim behavior without reintroducing anonymous server drafts.

## Owned Surface

- The exact DRAFT detail/read and mutation authorization seams frozen at 07C entry.
- Focused ownership/privacy tests for creator-owned, other-user, creatorless and privileged actor cases.
- Characterization of failed authenticated create/publish persistence and the smallest approved cleanup or recovery
  behavior.
- A task-local inventory of existing creatorless/legacy DRAFT states and any required operational follow-up.

New anonymous draft protocols, Browser continuity, broad authorization redesign and unapproved production data
mutation are outside 07C. All code and data paths must be refreshed before execution; historical implementation
paths are non-authoritative.

## Entry Information

- 07B has stopped new anonymous or creatorless `USER` DRAFT persistence.
- Rebaseline all DRAFT read/detail, edit, publish, delete/expire and claim paths plus their actor checks and response
  projections.
- Characterize separately: creatorless legacy rows, authenticated owner DRAFTs and rows left when normal create
  fails after an intermediate write.
- Accepted treatment: a newly created, still-DRAFT row left by a failed normal authenticated USER create is cleanup
  residue, not recoverable product state. Characterize child effects before deletion; do not modify historical data.

## Fork / Stop Conditions

- If resolution requires deleting or rewriting existing data, stop for a separately reviewed migration/operations
  plan with backup, observability and rollback.
- If creatorless legacy rows cannot be safely attributed, do not permit arbitrary authenticated claim; quarantine,
  hide or clean them under an explicitly approved policy.
- If safe failed-create cleanup needs transaction architecture beyond the bounded create use case, fork that work
  rather than obscuring it with controller cleanup.
- If an `ADMIN`/`SYSTEM` access exception lacks an explicit authority contract, stop and classify it before coding.

## Low-cost Verification

- A focused authorization matrix proves non-owners cannot read or mutate creator-private DRAFTs and creatorless rows
  cannot be claimed through ordinary authenticated `USER` behavior.
- A failed-create characterization asserts both the returned error and database row outcome.
- Focused searches and diff review cover every frozen DRAFT access/mutation seam with no unrelated auth changes.
- Run the focused Backend tests and scenario family, then Backend type/build; reserve full cross-unit proof for 07E.

## Status

Complete. The execution preflight, policy/canonical-seam implementation and focused scenario proof are recorded in
[`04-execution-preflight/`](./04-execution-preflight/),
[`05-policy-and-canonical-seams/`](./05-policy-and-canonical-seams/) and
[`06-focused-scenario-proof/`](./06-focused-scenario-proof/); final CF-01 integration proof is in
[`../05-verification/`](../05-verification/). No historical data mutation or failed-create cleanup was authorized or
performed.
