# Phase 3: Product TDD Audit

## Scope

This phase audits `docs/20-product-tdd/` only.

The primary question for this phase:

> Does Product TDD clearly own the cross-unit technical authority needed to let PRD use product language instead of frontend/backend mechanism language?

Secondary question:

> Does Product TDD itself contain stale, duplicated, over-broad, or misplaced material that should be cleaned before or alongside PRD cleanup?

This phase does not modify Product TDD files. It identifies cleanup candidates and informs PRD-5.

## Audited Files

```text
docs/20-product-tdd/index.md
docs/20-product-tdd/unit-topology.md
docs/20-product-tdd/system-state-and-authority.md
docs/20-product-tdd/cross-unit-contracts.md
docs/20-product-tdd/ecommerce-contracts.md
docs/20-product-tdd/claim-realization-matrix.md
docs/20-product-tdd/notification-contracts.md
docs/20-product-tdd/test-platform.md
docs/20-product-tdd/analytics-and-telemetry-contracts.md
docs/20-product-tdd/bi-domain-contracts.md
```

## Size Inventory

```text
256 docs/20-product-tdd/analytics-and-telemetry-contracts.md
103 docs/20-product-tdd/bi-domain-contracts.md
9   docs/20-product-tdd/claim-realization-matrix.md
322 docs/20-product-tdd/cross-unit-contracts.md
493 docs/20-product-tdd/ecommerce-contracts.md
51  docs/20-product-tdd/index.md
135 docs/20-product-tdd/notification-contracts.md
118 docs/20-product-tdd/system-state-and-authority.md
105 docs/20-product-tdd/test-platform.md
68  docs/20-product-tdd/unit-topology.md
```

High cleanup pressure:

- `ecommerce-contracts.md`
- `cross-unit-contracts.md`
- `claim-realization-matrix.md`

## Inventory

| File | Current Role | Phase 3 Status | Notes |
| --- | --- | --- | --- |
| `index.md` | Product TDD routing and ownership | Active | Boundary is clear. |
| `unit-topology.md` | Technical unit map | Active | Useful and concise. |
| `system-state-and-authority.md` | Authoritative state and frontend/backend authority | Active | Strong owner for PRD-5 mechanism language. |
| `cross-unit-contracts.md` | Broad frontend/backend route/API/flow contracts | Active with split pressure | Valuable, but overloaded and now includes many domain-specific contracts. |
| `ecommerce-contracts.md` | Ecommerce cross-unit technical contract | Active with cleanup pressure | Owns commerce authority well, but still carries task-local issue wording and very detailed provider specifics. |
| `claim-realization-matrix.md` | Claim realization bridge | Suspect / stale | Only covers the five old PRD claims and omits newer capability clusters. |
| `notification-contracts.md` | Notification reliability contract | Active | Clear owner boundary; supports PRD reliability cleanup. |
| `test-platform.md` | Cross-unit test platform | Active | Good technical substrate; not relevant to PRD-5 except verification. |
| `analytics-and-telemetry-contracts.md` | User telemetry cross-unit contract | Active | Long but cohesive. |
| `bi-domain-contracts.md` | BI source and projection contract | Active | Cohesive; complements telemetry without obvious contradiction. |

## Finding Ledger

### F3-001: Product TDD Can Safely Absorb Most PRD Mechanism Language

```text
Address:
docs/20-product-tdd/system-state-and-authority.md:53-118
docs/20-product-tdd/cross-unit-contracts.md:87-211
docs/20-product-tdd/ecommerce-contracts.md:208-348
docs/20-product-tdd/notification-contracts.md:55-135

Truth unit:
Backend/frontend authority, command boundaries, route-to-API coordination, preflight advisory reads, and notification dispatch semantics belong in Product TDD.

Current owner:
Product TDD already owns most of these technical truths.

Expected owner:
Same as current.

Status:
Active.

Operation:
Keep, then use as support for PRD-5.

Evidence:
`system-state-and-authority.md` explicitly distinguishes backend-authoritative state, frontend non-authoritative state, and authority boundary rules. `cross-unit-contracts.md` owns stable route/API/flow contracts including creation, event-assisted create, Form Mode, current creator, Study Sprint, join gates, waitlist, admin commands, action preflight, and message contracts. `ecommerce-contracts.md` owns commerce command and ownership details. `notification-contracts.md` owns backend notification eligibility and frontend prompt/presentation boundaries.

Downstream references:
PRD-5 Rules Language Layering.

Verification:
Before removing technical mechanism language from PRD, search for equivalent Product TDD ownership. If present, PRD can rephrase to product authority language or point indirectly through layer boundaries.

Decision:
PRD-5 can proceed after creating a specific batch proposal that maps each PRD mechanism phrase to its Product TDD owner.
```

### F3-002: Claim Realization Matrix Is Stale Relative To PRD Capability Growth

```text
Address:
docs/20-product-tdd/claim-realization-matrix.md:1-9
docs/10-prd/behavior/claims.md
tasks/doc-governance-cleanup/phase-02-prd-audit.md F2-001

Truth unit:
Product TDD should explain how major product claims are realized across backend/frontend units.

Current owner:
claim-realization-matrix.md

Expected owner:
Same file, but updated after PRD claims are aligned.

Status:
Suspect / stale.

Operation:
Clarify after PRD-2.

Evidence:
The matrix has only five rows matching the old PRD claim set. It does not cover newer capability clusters such as commerce, feedback questionnaires, Study Sprint, dummy PR, POI applications, or bounded fulfillment/support loops. This mirrors F2-001.

Downstream references:
PRD-2 Claims Alignment.

Verification:
After PRD claims change, update the matrix in the same or immediately following batch. Do not let Product TDD invent new product claims before PRD owns them.

Decision:
Batch 3 later decided not to add Claim 6. Product TDD follow-up should map bounded fulfillment/support loops under the clarified Claim 4 axis unless a future PRD batch changes the claim set.
Batch 4 Segment 1 later executed this follow-up by refreshing `claim-realization-matrix.md`.
```

### F3-003: Cross-Unit Contracts Is Overloaded And Has Domain-Specific Split Pressure

```text
Address:
docs/20-product-tdd/cross-unit-contracts.md:87-211
docs/20-product-tdd/cross-unit-contracts.md:213-229
docs/20-product-tdd/cross-unit-contracts.md:249-280
docs/20-product-tdd/cross-unit-contracts.md:296-322

Truth unit:
Cross-unit contracts should preserve shared frontend/backend contracts without becoming a catch-all for every domain-specific route and admin detail.

Current owner:
cross-unit-contracts.md

Expected owner:
Keep truly shared substrate here. Move mature domain-specific clusters into focused Product TDD docs when they become large.

Status:
Active with split pressure.

Operation:
Split later.

Evidence:
Section 6 contains many domain-specific contracts: PR creation, Anchor Event, Form Mode, dummy demand cards, POI applications, waitlist, Study Sprint, action preflight, route compatibility, telemetry attribution, and admin surfaces. Sections 7, 9, 12, and 13 also point into config/admin, messaging, telemetry, and BI. Many are valid cross-unit facts, but the file is now a broad contract aggregator.

Downstream references:
Possible future docs:
- `event-context-contracts.md`
- `pr-lifecycle-contracts.md`
- `admin-surface-contracts.md`

Verification:
Do not split during PRD-5. First use this file as authority evidence. Split only when a later Product TDD cleanup batch can preserve references.

Decision:
Track for Product TDD cleanup after PRD cleanup.
Batch 4 Segment 2 later executed the split into focused Product TDD contract files.
```

### F3-004: Ecommerce Contracts Own Commerce Authority But Still Contain Task-Local Issue Framing

```text
Address:
docs/20-product-tdd/ecommerce-contracts.md:3-22
docs/20-product-tdd/ecommerce-contracts.md:208-256
docs/20-product-tdd/ecommerce-contracts.md:288-348

Truth unit:
Ecommerce cross-unit contract should be durable, not issue-local.

Current owner:
ecommerce-contracts.md

Expected owner:
Same file, but durable framing should not mention a past issue slice as its scope.

Status:
Misplaced / stale wording.

Operation:
Clarify.

Evidence:
The scope says it preserves truth for "issue-231 ecommerce slice". That was useful task context, but the file now owns durable commerce domain grouping, authority, PR-attached ordering, route spine, and frontend journey contracts.

Downstream references:
PRD-1/PRD-2 commerce claim and glossary work.

Verification:
Reframe as durable ecommerce contract without changing technical meaning. Keep all owner boundaries intact.

Decision:
Candidate for a small Product TDD cleanup batch.
Batch 4 Segment 3 later removed the issue-local framing.
```

### F3-005: Ecommerce Provider-Specific Details May Be Too Deep For Product TDD

```text
Address:
docs/20-product-tdd/ecommerce-contracts.md:399-463

Truth unit:
Product TDD should preserve cross-unit contracts and authority boundaries, not every provider adapter detail that code or unit docs can explain cheaply.

Current owner:
ecommerce-contracts.md

Expected owner:
Keep provider details only when they shape cross-unit behavior, billing, or user-visible settlement. Move adapter-internal detail to code/local docs if it becomes excessive.

Status:
Suspect.

Operation:
Keep for now; evaluate later.

Evidence:
RideHailing settlement includes CaoCao-specific endpoint names and payload fields such as `queryOrderDetailV2`, `orderFeeVo.totalFee`, and `companyPayAmount`. Some of this is cross-unit because it determines bill materialization. Some may be adapter-specific operational detail.

Downstream references:
Backend RideHailing unit, ecommerce contracts, deployment/ops if provider behavior affects recovery.

Verification:
Before moving, identify whether each provider-specific line is required to understand billing authority or just current adapter implementation.

Decision:
Do not touch before ecommerce-specific audit.
Batch 4 Segment 3 later split provider-specific CaoCao RideHailing details into `ecommerce-provider-contracts.md` while keeping cross-unit billing/cancellation semantics in `ecommerce-contracts.md`.
```

### F3-006: System State And Authority Is A Strong Product TDD Owner But Dense

```text
Address:
docs/20-product-tdd/system-state-and-authority.md:3-31
docs/20-product-tdd/system-state-and-authority.md:62-100

Truth unit:
Authoritative state and owner boundaries are central cross-unit truth.

Current owner:
system-state-and-authority.md

Expected owner:
Same file.

Status:
Active with readability pressure.

Operation:
Keep; maybe split later by authority family.

Evidence:
The file now covers PR, partner slots, messages, users, Anchor Events, POI, feedback, jobs, notifications, analytics, ecommerce, payment, Study Sprint, frontend state, provider authority, and escalation rules. It is highly useful for PRD-5, but increasingly dense.

Downstream references:
All authority-sensitive work.

Verification:
Do not split until a stable family boundary exists. It currently functions as the primary authority map.

Decision:
Keep as-is for now.
Batch 4 Segment 1 later added a State Family Map for readability without splitting ownership.
```

### F3-007: Local Development Contract May Be Misplaced Inside Cross-Unit Contracts

```text
Address:
docs/20-product-tdd/cross-unit-contracts.md:14-27
docs/40-deployment/*
AGENTS.md Development Workflow

Truth unit:
Local dev origin routing affects frontend/backend coordination, but it may be closer to developer workflow/runtime environment than product technical contract.

Current owner:
cross-unit-contracts.md

Expected owner:
Possibly Product TDD if the route contract shapes typed HTTP behavior; possibly deployment/developer workflow docs if it is operational.

Status:
Suspect.

Operation:
Clarify later.

Evidence:
The local dev origin section documents `pnpm dev:ensure`, portless names, LAN mode, fake provider servers, and fixed-port compatibility. Some of this is cross-unit origin contract; some overlaps with root development workflow and deployment/runtime truth.

Downstream references:
AGENTS.md, docs/40-deployment, scripts/portless tooling.

Verification:
Audit deployment docs before moving. Do not remove from Product TDD while it is still the only detailed source.

Decision:
Defer until deployment audit.
Batch 4 Segment 4 later found `docs/40-deployment/environments.md` already owns local runtime workflow details, so Product TDD now keeps only local typed-origin contract material.
```

### F3-008: Analytics And BI Split Is Coherent But Should Be Kept As A Pair

```text
Address:
docs/20-product-tdd/analytics-and-telemetry-contracts.md:1-256
docs/20-product-tdd/bi-domain-contracts.md:1-103
docs/20-product-tdd/cross-unit-contracts.md:296-322

Truth unit:
Telemetry event collection and BI source/projection rules are separate but linked cross-unit contracts.

Current owner:
analytics-and-telemetry-contracts.md and bi-domain-contracts.md

Expected owner:
Same files.

Status:
Active.

Operation:
Keep.

Evidence:
Telemetry owns event collection and registry rules. BI owns source-family choice and dashboard contracts. Cross-unit contracts correctly point to both. No immediate contradiction found.

Downstream references:
Future analytics/admin PRD or Product TDD work.

Verification:
Future edits should update both files when changing telemetry-to-BI projection boundaries.

Decision:
No cleanup needed now.
```

## Effect On PRD-5

PRD-5 can now be sharpened:

```text
Goal:
Rephrase PRD rules into product authority language and rely on Product TDD for mechanism detail.

Safe direction:
- PRD says what product behavior must hold.
- Product TDD says which unit owns the state, command boundary, transport, and frontend/backend coordination.
```

Examples:

| PRD mechanism phrase | Product TDD owner | Recommended PRD action |
| --- | --- | --- |
| backend-owned create flow | `system-state-and-authority.md`, `cross-unit-contracts.md` | Rephrase as system-owned PR creation authority. |
| frontend assistance | `cross-unit-contracts.md` event-assisted create / Form Mode contracts | Rephrase as event-assisted user flow. |
| backend assigns current creator | `cross-unit-contracts.md` current creator contract | Keep product result, remove backend mechanism if redundant. |
| frontend injects fallback confirmation | `cross-unit-contracts.md` join-gate contract | Keep user-visible fallback semantics; Product TDD owns frontend/backend split. |
| backend-authored Button Placement | `ecommerce-contracts.md` Placement Contract | Keep "system-authored commerce placement" in PRD. |
| backend create-order boundary | `ecommerce-contracts.md` Ordering Command Contract | Keep quote/order trust behavior in PRD; Product TDD owns command detail. |
| backend write paths / frontend preflight | `cross-unit-contracts.md` action preflight contract | Keep "system enforces operation availability"; Product TDD owns preflight advisory shape. |
| module-contributed notification cards | `notification-contracts.md` | Keep user-visible prompt behavior; Product TDD owns module contribution. |

## Recommended Product TDD Cleanup Batches

### ProductTDD-1: Claim Realization Matrix Refresh

Run after PRD-2 Claims Alignment.

Target:

```text
docs/20-product-tdd/claim-realization-matrix.md
```

Goal:

- align with updated PRD claims
- add realization for bounded fulfillment/support loops under the clarified Claim 4 axis from Batch 3

### ProductTDD-2: Ecommerce Contract Durable Reframe

Target:

```text
docs/20-product-tdd/ecommerce-contracts.md
```

Goal:

- remove task-local `issue-231` framing
- preserve ecommerce authority boundaries
- leave provider-specific depth untouched unless a separate ecommerce audit approves moving it

### ProductTDD-3: Cross-Unit Contract Split Proposal

Target:

```text
docs/20-product-tdd/cross-unit-contracts.md
```

Goal:

- propose focused files for event-context/Form Mode, PR lifecycle, admin surface, and messaging contracts
- do not execute until after PRD cleanup relies on current references

## Recommended Next Step

Proceed with PRD-1/PRD-2/PRD-3/PRD-4 as planned.

For PRD-5, create a dedicated batch proposal that maps each PRD line to a Product TDD owner before editing `rules-and-invariants.md`.

## Verification Performed

Commands used:

```text
find docs/20-product-tdd -type f | sort
wc -l docs/20-product-tdd/*.md
rg -n '^#{1,3} ' docs/20-product-tdd
rg -n 'backend|frontend|command|write path|module|boundary|authored|assigns|injects|authority|authoritative|owns|contract|preflight|Form Mode|Dummy PR|Study Sprint|feedback questionnaire|meeting-point|current creator|createdBy|RideHailing|Offer Listing|Placement|quote' docs/20-product-tdd
rg -n 'Claim|claim|PRD|product claim|claims' docs/20-product-tdd
```

During the Phase 3 audit itself, no Product TDD files were modified.
