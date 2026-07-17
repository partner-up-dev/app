# Durable Documentation Promotion Plan

## Principle

Task packets own hypotheses, inventories, logs and migration state. Durable docs receive only compact technical
truth that future work would otherwise rediscover expensively. Promotion happens before code when a stable target
constraint is required, or after a pilot when the rule still needs empirical proof.

## Planned Owners

| Truth | Durable target | Timing | Promotion condition |
| --- | --- | --- | --- |
| Architecture objectives, module-construction rules, growth algorithm and exception protocol | `docs/20-product-tdd/architecture-objectives-and-decision-rules.md` | Slice 01, before other durable promotion | Sir-approved decision + current topology/contract consistency review |
| PR modules and authority topology | `docs/20-product-tdd/unit-topology.md` | Slice 01, before app mutation | Decision review + current source/durable alignment |
| Backend domain public-surface/import rules | `apps/backend/AGENTS.md`; optional Unit TDD only if AGENTS is insufficient | Slice 01 | Fitness fixtures show rule is precise |
| Web page/workflow/API/state ownership | `apps/web/src/ARCHITECTURE.md` | Slice 01/02 | `/prd` design proves usable interface |
| `AppType`, Problem Details and session transport | `docs/20-product-tdd/cross-unit-contracts.md` | Only if a slice changes or discovers missing stable truth | Backend/Web type + runtime journey proof |
| `/prd` URL/view/handoff behavior | `docs/20-product-tdd/pr-discovery-and-authoring-contracts.md` | Only on observable coordination change | Product owner + focused System proof |
| Feedback projection/command behavior | `docs/20-product-tdd/pr-lifecycle-contracts.md` | Only if response/auth/error semantics change | Backend scenario + feedback System proof |
| PR Type current config versus materialized snapshot | `docs/20-product-tdd/system-state-and-authority.md` and `unit-topology.md` | Before/with Slice 04 | Snapshot/current semantics proven in tests |
| Scenario ownership/runtime | `docs/20-product-tdd/test-platform.md` | Only if runner/lifecycle responsibility changes | Cross-unit infra verification |
| CI/runtime gates | `docs/40-deployment/*` | Only if live commands or blocking policy changes | Owner-approved runnable gate |

## Contract-conflict Route

### CF-01 — Anonymous PR creation

This is a product decision, not an architecture cleanup. The owner sequence is:

1. decide intended anonymous create/publish behavior;
2. update `docs/10-prd/behavior/workflows/core-pr.md` and related PRD invariant;
3. align `docs/20-product-tdd/pr-lifecycle-contracts.md`;
4. add an anonymous `/pr/new` browser journey through the chosen canonical outcome;
5. only then mutate create/publish code.

### CF-02 — Waitlist auth payload

`cross-unit-contracts.md` and runtime use transport/header session rotation, while one focused PR lifecycle line
still says `auth payload`. Before waitlist work, correct or explicitly version that wording, then verify typed
response, Backend waitlist scenario, Web handling and a focused System journey.

## Anchor Event Reconciliation

- Do not recreate an Event durable doc or copy historical task logs into Product TDD.
- Existing PRD/Product TDD already route current behavior to PR Discovery/Authoring and explicitly exclude hidden
  context identity. Only add another retirement note if a future consumer proves the current wording insufficient.
- Historical `01`–`04` task files retain their evidence and display a superseded banner.

## Promotion Checklist

- Stable owner and invariant are explicit.
- Current source and tests support the statement.
- The text is smaller than the task-local evidence it replaces.
- Observable behavior changes are routed to PRD first.
- Links and commands are checked; migration logs remain task-local.

## Slice 01 Promotion Result

- Promoted architecture objective ordering, four public-surface categories, growth algorithm and exception protocol
  to `architecture-objectives-and-decision-rules.md` and linked it first in the Product TDD reading route.
- Promoted current/target PR owner topology and allowed Backend/Web dependency direction to Unit Topology.
- Promoted Backend operational public-surface rules and Web workflow/transport/state ownership to their local owners.
- Kept exact findings, fingerprints, migration owners and current exception inventory task-local.
