# Phase 2: PRD Audit

## Scope

This phase audits `docs/10-prd/` only.

The question for this phase:

> Does the PRD layer still express product truth cleanly, with stable owners for drivers, claims, capabilities, workflows, rules, scope, vocabulary, and derived domain structure?

This phase does not modify PRD files. It identifies cleanup candidates.

## Audited Files

```text
docs/10-prd/index.md
docs/10-prd/glossary.md
docs/10-prd/_drivers/business-and-service-objectives.md
docs/10-prd/_drivers/hard-constraints.md
docs/10-prd/_drivers/market-and-user-pressures.md
docs/10-prd/_drivers/operational-realities.md
docs/10-prd/behavior/capabilities.md
docs/10-prd/behavior/claims.md
docs/10-prd/behavior/rules-and-invariants.md
docs/10-prd/behavior/scope.md
docs/10-prd/behavior/workflows.md
docs/10-prd/domain-structure/cross-domain-interactions.md
docs/10-prd/domain-structure/derived-boundaries.md
```

## Size Inventory

```text
18  docs/10-prd/glossary.md
64  docs/10-prd/index.md
37  docs/10-prd/_drivers/business-and-service-objectives.md
25  docs/10-prd/_drivers/hard-constraints.md
36  docs/10-prd/_drivers/market-and-user-pressures.md
39  docs/10-prd/_drivers/operational-realities.md
81  docs/10-prd/behavior/capabilities.md
86  docs/10-prd/behavior/claims.md
199 docs/10-prd/behavior/rules-and-invariants.md
24  docs/10-prd/behavior/scope.md
149 docs/10-prd/behavior/workflows.md
35  docs/10-prd/domain-structure/cross-domain-interactions.md
61  docs/10-prd/domain-structure/derived-boundaries.md
```

`rules-and-invariants.md` and `workflows.md` carry the highest cleanup pressure.

Reviewer follow-up after Batch 3 review:

- The original audit underweighted PRD internal topology pressure.
- Glossary cleanup must not become a large flat dictionary; vocabulary needs context boundaries.
- Claim cleanup must test orthogonality before adding or expanding claims.
- PRD behavior is already too large for a single flat workflow/rule surface, so decomposition is part of cleanup, not only an optional later refactor.

## Inventory

| File | Current Role | Phase 2 Status | Notes |
| --- | --- | --- | --- |
| `index.md` | PRD layer routing and ownership | Active | Boundary is clear: product truth, no technical ownership, no deployment runbooks. |
| `glossary.md` | Business vocabulary | Active with gap | Core terms and commerce terms exist, but several heavily used newer terms are not defined. |
| `_drivers/*` | Upstream product pressure | Active | Stable and compact. They still explain the original thesis well. |
| `behavior/claims.md` | Product claims and evaluation expectations | Suspect | Claims remain broad and clean, but newer capabilities may have outgrown them. |
| `behavior/capabilities.md` | Product surface map | Active with duplication | Useful map, but some bullets are UI-detail-level and duplicate Scope/Workflow/Rules. |
| `behavior/workflows.md` | User-visible workflows | Active with split pressure | Workflow truth is valuable, but Event/Form and commerce sections mix workflow, UI IA, technical ownership, and detailed rules. |
| `behavior/rules-and-invariants.md` | Product rules and invariants | Active with split pressure | High-value authoritative file, but it now mixes product invariants with Product TDD-style implementation authority language. |
| `behavior/scope.md` | Product scope boundaries | Misplaced/detail-heavy in places | Scope includes detailed IA and route rollout facts that duplicate capabilities/workflows/rules. |
| `domain-structure/*` | Derived product domain structure | Suspect | Still warns that it is derived, but it may lag current commerce, feedback, and study-sprint capability growth. |

## Finding Ledger

### F2-001: Product Claims Lag Current Capability Surface

```text
Address:
docs/10-prd/behavior/claims.md:3-86
docs/10-prd/behavior/capabilities.md:21-24
docs/10-prd/behavior/capabilities.md:41-42
docs/10-prd/behavior/capabilities.md:71-81
docs/10-prd/behavior/workflows.md:79-91
docs/10-prd/behavior/workflows.md:120-131

Truth unit:
The product's durable claims should explain why major capability clusters exist and how they are evaluated.

Current owner:
claims.md owns product claims; capabilities/workflows/rules own expanded behavior.

Expected owner:
claims.md should either explicitly absorb the current major extensions or state that they are support capabilities under existing claims.

Status:
Suspect.

Operation:
Clarify or split.

Evidence:
Current claims cover collaboration creation, stable PR semantics, distribution/revisit, reliability, and identity. Current PRD behavior also contains PR-attached commerce ordering, RideHailing, Study Sprint Pomodoro, POI application lifecycle, feedback questionnaire mounting, pairing code identity, and operator admin capabilities. These are visible in capabilities and workflows but are not directly reflected in the claim set.

Downstream references:
docs/20-product-tdd/claim-realization-matrix.md
docs/20-product-tdd/ecommerce-contracts.md
docs/20-product-tdd/notification-contracts.md

Verification:
Before changing claims, compare the Product TDD claim realization matrix and ecommerce contracts. Decide whether commerce/study-sprint/feedback are first-class product claims, claim subclaims, or support capabilities.

Decision:
Do not edit claims in this phase. Prepare a claim-alignment batch after checking Product TDD.
```

### F2-002: Scope Contains Detailed Page IA And Rollout Facts

```text
Address:
docs/10-prd/behavior/scope.md:9-13
docs/10-prd/behavior/capabilities.md:30-36
docs/10-prd/behavior/workflows.md:27-36
docs/10-prd/behavior/rules-and-invariants.md:100-103

Truth unit:
Scope should define what product areas are in or out, not carry detailed current layout or route rollout specifics.

Current owner:
scope.md currently includes detailed event-context PR detail IA, dedicated message route rollout, reliability module list, and operator maintenance boundaries.

Expected owner:
Scope should remain concise. Detailed IA belongs in workflows/rules if product-visible and in Product TDD or local frontend docs if technical. Capabilities can list the surface at a higher level.

Status:
Misplaced / duplicate.

Operation:
Clarify + merge.

Evidence:
Scope line 9 names facts-card location row placement, participant roster modal source, clickable participant badges, and venue-image label row. The same concepts are also in capabilities lines 30-36, workflow line 28, and rules lines 100-103.

Downstream references:
Frontend route workflow tests may rely on stable `data-testid` nodes, but test anchor details should not be scope truth.

Verification:
After cleanup, scope should still say event-context PR detail IA is in scope, but not repeat row-level layout. Search for removed detail in capabilities/workflows/rules to ensure no product truth is lost.

Decision:
Candidate for a small PRD cleanup batch.
```

### F2-003: Rules Mix Product Invariants With Product TDD-Style Mechanism Language

```text
Address:
docs/10-prd/behavior/rules-and-invariants.md:20-36
docs/10-prd/behavior/rules-and-invariants.md:44-49
docs/10-prd/behavior/rules-and-invariants.md:58-61
docs/10-prd/behavior/rules-and-invariants.md:72
docs/10-prd/behavior/rules-and-invariants.md:80
docs/10-prd/behavior/rules-and-invariants.md:89
docs/10-prd/behavior/rules-and-invariants.md:130-145
docs/10-prd/behavior/rules-and-invariants.md:178-180

Truth unit:
PRD should preserve user-visible product rules and authority meaning, while Product TDD owns implementation authority, command boundaries, backend/frontend split, and module contribution patterns.

Current owner:
rules-and-invariants.md contains both product rules and technical mechanism phrasing.

Expected owner:
Keep product-visible invariants in PRD. Move or rephrase technical mechanism detail into Product TDD when future technical drift would be expensive.

Status:
Misplaced / split candidate.

Operation:
Split + clarify.

Evidence:
Examples include "backend-owned create flow", "command boundaries canonicalize", "frontend assistance", "frontend may locally reverse", "backend assigns", "frontend flow injects", "backend-authored Button Placement", "backend create-order boundary", "backend write paths", and "modules contributed by owning modules". Some of these express product authority and can stay if rephrased as "system-owned"; others likely belong in Product TDD.

Downstream references:
docs/20-product-tdd/cross-unit-contracts.md
docs/20-product-tdd/system-state-and-authority.md
docs/20-product-tdd/ecommerce-contracts.md

Verification:
For each candidate, decide whether it is product-visible authority or technical realization. Do not remove backend/frontend authority facts unless Product TDD already owns them or is updated in the same batch.

Decision:
Do not bulk rewrite. Prepare a Product TDD-aware split batch after Phase 3.
```

### F2-004: Event/Form Workflow Section Is Overloaded

```text
Address:
docs/10-prd/behavior/workflows.md:39-68
docs/10-prd/behavior/rules-and-invariants.md:40-63
docs/10-prd/behavior/capabilities.md:26-42

Truth unit:
Anchor Event browsing, Form Mode recommendation, dummy PR materialization, assisted creation, search, support group, and READY-after edit are related but distinct workflows/rules.

Current owner:
workflows.md section 4 carries 24 numbered steps plus substeps for multiple flows.

Expected owner:
Still PRD, but likely split into smaller workflow subsections or moved into a dedicated event-context workflow file under `behavior/`.

Status:
Active with split pressure.

Operation:
Split.

Evidence:
Section 4 combines route entry, landing mode persistence, official-account prompt cooldown, Form Mode place/time/preferences, fuzzy windows, location applications, recommendation results, dummy PR materialization, search, list/card behavior, beta-group card, assisted creation, cross-event rediscovery, reliability loops, and READY-after edit.

Downstream references:
Event-context frontend workflows, scenario tests, Product TDD cross-unit contracts.

Verification:
Splitting should not change product semantics. New headings should make each workflow addressable for future cleanup: landing entry, Form Mode recommendation, dummy PR materialization, assisted create, event search/list/card browse, event support group.

Decision:
Candidate for a readability-only PRD split batch.
```

### F2-005: Business Vocabulary Is Behind Current Terms

```text
Address:
docs/10-prd/glossary.md:5-18
docs/10-prd/behavior/workflows.md:28-36
docs/10-prd/behavior/workflows.md:79-91
docs/10-prd/behavior/workflows.md:120-139
docs/10-prd/behavior/rules-and-invariants.md:88-99

Truth unit:
Recurring product terms should have one vocabulary owner.

Current owner:
glossary.md owns business vocabulary.

Expected owner:
glossary.md should define recurring durable terms that are not self-evident or are used across multiple PRD files.

Status:
Suspect.

Operation:
Clarify.

Evidence:
Glossary defines core PR, POI, Anchor Event, PR.type, and several commerce terms. It does not define recurring current terms such as Form Mode, Dummy PR, Join Gate, Meeting-Point Guidance, Feedback Questionnaire, Study Sprint, Pairing Code, Current Creator, or POI Location Application.

Downstream references:
Product discussions, Product TDD, frontend/backend naming.

Verification:
Add only terms that are durable product vocabulary, not every UI label. Avoid turning glossary into a feature index.

Decision:
Candidate for a glossary cleanup batch.
```

### F2-006: Domain Structure May Lag Current Capability Boundaries

```text
Address:
docs/10-prd/domain-structure/derived-boundaries.md:9-61
docs/10-prd/domain-structure/cross-domain-interactions.md:3-35
docs/10-prd/behavior/rules-and-invariants.md:128-145
docs/10-prd/behavior/workflows.md:79-91
docs/10-prd/behavior/workflows.md:120-139

Truth unit:
Derived domain boundaries should reflect stable product discussion boundaries without redefining claims.

Current owner:
domain-structure/*.md

Expected owner:
domain-structure should either include current durable boundaries or explicitly keep newer capabilities under existing boundaries.

Status:
Suspect.

Operation:
Clarify.

Evidence:
Derived boundaries include PartnerRequest Core, Partner Lifecycle, Identity, Event, Distribution, and Support/Ops. Commerce ordering, feedback questionnaire, Study Sprint, POI application lifecycle, and notification-specific reliability extensions are mostly absent or folded implicitly into existing buckets.

Downstream references:
Product TDD unit topology and cross-unit contracts.

Verification:
Check Product TDD unit topology before changing PRD domain boundaries. The PRD warning that these boundaries are derived must remain intact.

Decision:
Defer until after Phase 3 Product TDD audit.
```

### F2-007: Capabilities Works As A Surface Map But Repeats Too Much Detail

```text
Address:
docs/10-prd/index.md:49
docs/10-prd/behavior/capabilities.md:1-81
docs/10-prd/behavior/scope.md:9-13
docs/10-prd/behavior/workflows.md:27-36

Truth unit:
Capabilities should map product surfaces, not become a second primary source of workflow or IA truth.

Current owner:
capabilities.md is explicitly a product surface map, not primary source of truth.

Expected owner:
Keep capabilities concise and link/point to workflows/rules for detailed behavior.

Status:
Duplicate / clarify candidate.

Operation:
Merge / clarify.

Evidence:
Capabilities includes detailed event-context PR detail actions such as facts-card participant row, clickable label row, and route facts row. These same details exist in scope/workflows/rules.

Downstream references:
PRD readers may treat capabilities as primary truth despite index warning.

Verification:
After cleanup, capabilities should preserve discoverability of surfaces while detailed behavior remains in workflow/rules.

Decision:
Candidate for a capabilities/scope cleanup batch.
```

### F2-008: Route Names Are Product-Visible But Should Be Used Deliberately

```text
Address:
docs/10-prd/behavior/workflows.md:15
docs/10-prd/behavior/workflows.md:27
docs/10-prd/behavior/workflows.md:41-45
docs/10-prd/behavior/workflows.md:83-84
docs/10-prd/behavior/workflows.md:143-145
docs/10-prd/behavior/rules-and-invariants.md:40-42
docs/10-prd/behavior/rules-and-invariants.md:130
docs/10-prd/behavior/rules-and-invariants.md:138
docs/10-prd/behavior/rules-and-invariants.md:191-194

Truth unit:
Browser routes can be product-visible workflow truth, but route-family implementation detail should not displace product behavior.

Current owner:
PRD workflows/rules contain many route names.

Expected owner:
Keep route names where they are canonical user-facing entries or compatibility commitments. Move route implementation or state-machine detail to Product TDD or frontend local docs when it is not product-visible.

Status:
Active with caution.

Operation:
Keep / clarify selectively.

Evidence:
Routes such as `/pr/:id`, `/e/:eventId`, `/pr/new`, `/me`, `/pr/mine`, `/order/new`, `/contact-support`, `/about`, and `/bills` may be product-visible. However, route-level state machine and compatibility-forwarding details may need technical ownership if they become implementation mechanics rather than user promises.

Downstream references:
Frontend routing, system scenario tests.

Verification:
Do not blindly remove route names. Classify each as user-facing product entry, compatibility promise, or implementation detail.

Decision:
Track for future targeted cleanup, not a first PRD batch.
```

## Phase 2 Conclusions

PRD is not structurally broken. The owner boundaries still exist and the upstream drivers are compact and stable.

The cleanup pressure is concentrated in three areas:

- newer capabilities have accumulated faster than the claim/domain vocabulary layer
- scope/capabilities/workflows/rules repeat detailed page IA and route-level facts
- rules and workflows sometimes use technical realization language where product authority language would be cleaner

## Recommended Cleanup Batches

### Batch PRD-1: Claims And Vocabulary Alignment

Scope:

- `claims.md`
- `glossary.md`
- possibly `capabilities.md`

Goal:

- decide whether commerce, Study Sprint, feedback questionnaire, POI application, dummy PR, and pairing code are subclaims under existing claims or need new claim language
- add only durable glossary terms

Dependency:

- Read Product TDD claim realization and ecommerce contracts before editing claims.

### Batch PRD-2: Scope And Capabilities De-Duplication

Scope:

- `scope.md`
- `capabilities.md`
- references in `workflows.md` and `rules-and-invariants.md`

Goal:

- make scope concise again
- keep capabilities as a surface map
- keep detailed behavior in workflows/rules

### Batch PRD-3: Event/Form Workflow Split

Scope:

- `workflows.md`

Goal:

- split the overloaded Event/Form section into addressable workflow subsections without changing product meaning

### Batch PRD-4: PRD vs Product TDD Language Split

Scope:

- `rules-and-invariants.md`
- relevant Product TDD docs after Phase 3

Goal:

- preserve product-visible authority in PRD
- move technical mechanism and backend/frontend command-boundary language to Product TDD when needed

## Verification Performed

Commands used:

```text
find docs/10-prd -type f | sort
wc -l docs/10-prd/*.md docs/10-prd/_drivers/*.md docs/10-prd/behavior/*.md docs/10-prd/domain-structure/*.md
rg -n '^#{1,3} ' docs/10-prd
rg -n 'route|controller|service|repository|frontend|backend|API|endpoint|database|persist|Drizzle|Hono|module|component|state|authority|contract|runtime|deployment|CI|operator|Admin|admin' docs/10-prd -g '*.md'
rg -n 'Study Sprint|Pomodoro|Dummy PR|Form Mode|Join gate|meeting-point|feedback questionnaire|Questionnaire|Order|Ordering|Offer|RideHailing|Rental|Placement|POI location application|current creator|pairing' docs/10-prd
```

During the Phase 2 audit itself, no PRD files were modified.

Post-Batch-3 note:

Batch 3 later executed the F2-001 through F2-005 cleanup after explicit user approval. The audit above remains the pre-mutation finding record; current PRD line numbers and file ownership have changed because `glossary.md` now routes to `vocabulary/*` and `behavior/workflows.md` now routes to `behavior/workflows/*`.
