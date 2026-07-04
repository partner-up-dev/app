# Batch 4 Segment 1: Authority Bridge And Claim Matrix Refresh

## Covers

```text
F3-001
F3-002
F3-006
```

## Target Files

```text
docs/20-product-tdd/claim-realization-matrix.md
docs/20-product-tdd/system-state-and-authority.md
docs/20-product-tdd/index.md
```

Possible task-local updates:

```text
tasks/doc-governance-cleanup/phase-03-product-tdd-audit.md
tasks/doc-governance-cleanup/batch-04-product-tdd-f3-001-to-f3-007-plan.md
```

## Objective

Close the small Product TDD follow-up created by Batch 3 PRD cleanup:

- update the claim realization matrix to match the clarified PRD claim names and axes
- make bounded fulfillment/support loops map under Claim 4 instead of a new Claim 6
- preserve Product TDD as the technical mechanism owner for PRD authority language
- improve `system-state-and-authority.md` readability without splitting it yet

## Proposed Mutations

### 1. Claim Matrix Refresh

Update `claim-realization-matrix.md` rows to match current PRD claims:

```text
Claim 1. Lightweight Intent Can Become A Stable Collaboration Object
Claim 2. Discovery Context Can Vary Without Forking PR Semantics
Claim 3. Collaboration Must Remain Distributable And Re-Enterable
Claim 4. Collaboration Needs Contextual Trust, Coordination, And Completion Loops
Claim 5. Identity Should Progress With Commitment Instead Of Blocking Discovery
```

Claim 4 should explicitly realize:

- join gates
- confirmation / reminders / check-in
- meeting-point guidance
- PR messaging
- pairing code
- Study Sprint
- feedback questionnaire
- PR-attached commerce and bounded support loops

### 2. Authority Bridge Note

Add a compact note that PRD owns product authority language while Product TDD owns mechanism detail:

```text
PRD says which product behavior must hold.
Product TDD says which unit owns state, command boundaries, transport, and frontend/backend coordination.
```

This may live in `claim-realization-matrix.md` or `system-state-and-authority.md`; prefer the matrix if the note is only a bridge from PRD claims to realization.

### 3. System State Readability Pass

Do not split `system-state-and-authority.md` yet. Add a compact family map if useful:

```text
Collaboration state
Identity/session state
Event/location state
Messaging/notification state
Commerce/payment/provider state
Analytics/BI state
Frontend non-authoritative state
```

## Non-Goals

- Do not change Product TDD authority boundaries.
- Do not create new PRD claims.
- Do not split `system-state-and-authority.md`.
- Do not edit `cross-unit-contracts.md` except for references that become stale.

## Verification

```text
rg -n "Lightweight Intent|Discovery Context|Distributable|Completion Loops|Progress With Commitment|Claim 6|bounded fulfillment|Study Sprint|Feedback Questionnaire|PR-attached" docs/10-prd docs/20-product-tdd tasks/doc-governance-cleanup
git diff --check -- docs/20-product-tdd tasks/doc-governance-cleanup
```

Expected result:

- Product TDD matrix matches PRD claim axes.
- `Claim 6` appears only in historical task notes that explain it was not adopted.
- System authority readability improves without moving ownership.

## Execution Record

Executed in Segment 1:

- `docs/20-product-tdd/claim-realization-matrix.md` now maps to the Batch 3 PRD claim titles and axes.
- Claim 4 now explicitly realizes join gates, confirmation/reminders/check-in, meeting-point guidance, PR messaging, pairing code, Study Sprint, feedback questionnaire, and PR-attached commerce/support loops.
- A Layering Rule was added to clarify that PRD owns product behavior while Product TDD owns mechanism detail.
- `docs/20-product-tdd/system-state-and-authority.md` now has a State Family Map for readability.
- `docs/20-product-tdd/index.md` now routes readers to `claim-realization-matrix.md` before authority/contract files when translating PRD claims.

No Product TDD authority boundary was changed.
