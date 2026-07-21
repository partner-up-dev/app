# Phase 5 — Commerce

## Status

**Final review's narrow Web repair is complete; two findings remain explicit deferrals.** A retained Rental Bill
can still enter the payment path, and a RideHailing post-settlement fee-confirmation failure has no safe replay
path. Sir has directed that neither is repaired in this pass: Rental is an accepted scope/risk deferral, while fee
confirmation belongs to a future job-runner/outbox design. The durable R0 target and recovery finding remain
unchanged. The completed Placement admission-feedback repair is under
[`08-provider-runtime-evidence-and-phase-review/03-final-commit-review/`](./08-provider-runtime-evidence-and-phase-review/03-final-commit-review/).
Do not call Phase 5 formally complete until the deferred findings are carried forward explicitly and the separate
`5-7a` evidence condition is resolved or deliberately deferred. `5-2` retains
its durable CreateOrderAttempt recovery boundary and PR admission lock ordering; `5-5` retains the explicit,
transaction-bounded RideHailing observation model; and `5-6A` has retired all five Commerce wildcard roots.
Phase 5's local job remains turning active Commerce cross-owner implementation imports into named category
surfaces—Commands, canonical Queries, stable Contracts, or Ports—and closing obsolete compatibility paths. It
does not become a broad Commerce feature-repair programme, a line-count reduction exercise, or a directory
reorganisation.

The current baseline is eight active core deep-import declarations after `5-3`, six core wildcard domain roots, and
four controller consumers of those wildcard roots. These are diagnostic baselines, not a licence to replace them
with new barrels. See [`11-structural-refocus/`](./11-structural-refocus/) for the classification, target metrics,
and resliced execution order.

**Rental runtime cut-off selected.** Sir reports that production has no Rental orders and directs a clean cut-off.
For this Phase, that means no new Rental placement, quote, order, payment, booking, cancellation, or guidance flow:
leaving order/payment open after removing fulfillment would create a paid-without-service path. The former `5-4`
termination-feature proposal is therefore replaced by a bounded Rental runtime-retirement slice. Physical schema or
migration deletion remains a separately authorised data-reclamation decision. [`10-rental-fulfillment-scope/`](./10-rental-fulfillment-scope/)
records the exact boundary.

**System Model Gate result.** The static owner/import inventory was insufficient by itself: it exposed that Order
Detail `GET` had been a provider-observation write trigger. The completed model gate led to a pure local Detail
projection plus explicit reconciliation, named final-settlement coordination, and a controlled Web observation
trigger. It did not authorize Rental expansion, refund policy, provider configuration, deployment, or test-harness
expansion.

## Objective And Hypothesis

Phase 5 should make the active Commerce system legible and independently evolvable across Merchandising, Trade,
Bill, Payment, and the RideHailing provider boundary. It must make each critical fact's owner, write trigger,
observation/reconciliation path, read projection/cache, and vocabulary explicit—not merely narrow imports—while
preserving the existing PR-attached ordering and settlement contracts. Rental Fulfillment is being retired as a
runtime capability rather than expanded into a sixth active product owner.

Validated hypothesis: an authority/contract convergence slice can reduce an observed owner span without a broad
directory reorganisation when it has a low-cost focused proof plus an existing browser or backend scenario. `5-3`
is the completed example; later slices must meet the same standard.

## Entry Unknowns

1. Which active source edges still bypass the intended owner model or duplicate Commerce truth?
2. For every critical RideHailing/Payment fact, which actor writes it, which trigger is allowed to advance it, and
   which projection/cache is non-authoritative?
3. Which read paths are truly pure, which intentionally reconcile external observation, and where are their
   idempotency/concurrency boundaries?
4. Which terms name one fact versus several incompatible facts across PRD, TDD, backend, provider, and Web?
5. Which correctness rules are indispensable to a safe owner-boundary change, versus product/operations work that
   must be deliberately deferred?
6. What is the smallest sequence that closes the demonstrated category surfaces without broad file splitting?

5-0/5-1 resolved the first three questions sufficiently to propose a slice
order and expose the missing concurrency/recovery gates. The Phase 4
host/cookie limitation is not presently demonstrated in Commerce's local
system scenarios; it remains a harness watchpoint rather than a Commerce
finding.

## Guardrails Touched

- Preserve the PRD ordering and unpaid-obligation behavior.
- Preserve quote-only create-order input, PR attachment transactionality, provider dispatch, settlement, and payment
  callback contracts.
- Do not create a generic `ecommerce` owner or widen cross-domain internal imports.
- A correctness change belongs in a structural slice only when it prevents duplicated cross-owner facts or duplicate /
  regressive external side effects at that new boundary. New rental fulfillment, refund policy, generic retries,
  outbox work, and settlement-correction product capability do not qualify by default.
- A query that causes reconciliation or a durable transition must be explicitly modelled as such; cache invalidation,
  browser polling, and local UI hints may not become a second authority by implication.
- Every source slice begins with a fact-owner row, an interaction sequence, a read/cache plan, and any vocabulary
  change it introduces. These are part of the low-cost proof, not optional architecture prose.
- Do not treat `create-order.ts` or `useCommerce.ts` size as an independent refactor objective.
- Keep provider configuration, deployment topology, root toolchain changes, and unrelated dirty work out of scope.
- Use poly-file, per-subtask packet folders and name a low-cost verification plan before delegating or executing a
  slice.

## Packet Layout

- [`01-commerce-entry-inventory/`](./01-commerce-entry-inventory/) owns the read-only topology, contract, risk, and
  verification inventory.
- [`02-commerce-authority-and-idempotency-matrix/`](./02-commerce-authority-and-idempotency-matrix/) is complete;
  [`04-billing-payment-checkout/`](./04-billing-payment-checkout/) is the completed first vertical mutation.
  [`09-dependency-resequencing/`](./09-dependency-resequencing/) records the corrected execution order.
  [`10-rental-fulfillment-scope/`](./10-rental-fulfillment-scope/) owns the selected cut-off. The new
  [`11-structural-refocus/`](./11-structural-refocus/) is the controlling classification, metrics, and rehearsal
  packet for the remaining work. [`12-commerce-system-model/`](./12-commerce-system-model/) supplies the
  lifecycle/read-model/vocabulary evidence that must now precede source work. The remaining source packets stay
  non-executable until that gate and their own entry evidence are satisfied.

## Current Entry Result

The local source now has the intended Commerce families and an explicit system model: Order Detail is pure local
read; RideHailing reconciliation is an explicit command; terminal fare is committed through the narrow RideHailing
transaction Port; Checkout has one PaymentTx read/cache authority; and root wildcard compatibility exports are
deleted. `5-3`'s recovery gap is deliberately carried to future job-runner/outbox work; `5-4`'s Rental payment
gap is deliberately deferred without rewriting R0. F-03 Placement-feedback repair and re-review are complete.
After that, `5-7a` remains the separate need for authorized
staging/provider evidence before any deployment/runtime claim or formal Phase exit. Its safe public-readonly branch is recorded under
[`08-provider-runtime-evidence-and-phase-review/02-external-runtime-evidence/`](./08-provider-runtime-evidence-and-phase-review/02-external-runtime-evidence/);
the current executor could not establish public HTTPS, so no remote response was observed and the provider-signed
smoke remains pending.

See the [slice map](./slice-map.md), [decision brief](./decision-brief.md), and [durable-docs plan](./durable-docs-plan.md).

## Exit From Explore

This packet may move to Solidify only when it contains an evidence-backed target state, an ordered candidate slice
map, explicit decision points, and a cheap verification path for each proposed executable slice.
