# Batch 1 Proposal: Meta-Governance Promotion For F1-003 And F1-005

## Scope

This batch addresses:

- F1-003: Impact Handshake is correct but split across entrypoints.
- F1-005: Alignment loading rule is consistent and should be preserved exactly.

This is a proposal file only. No durable docs have been modified yet.

## Objective

Make the Impact Handshake and alignment loading rule easier to follow without turning `docs/15-alignment/` into a default reading requirement or a new truth layer.

## Current State

Impact Handshake currently appears across:

- `AGENTS.md`: operational trigger and concrete field list.
- `docs/00-meta/concepts.md`: concept definition and owner hint.
- `docs/00-meta/mode-c-execute.md`: execution-mode pause rule.
- `docs/15-alignment/README.md`: alignment substrate role, triggers, primitives, and verb-to-verification rule.
- `docs/15-alignment/change-request-template.md`: practical template fields that largely match the handshake.

Alignment loading currently appears across:

- `AGENTS.md`: load alignment only when MVT is insufficient.
- `docs/10-prd/index.md`: read alignment first for reference-sensitive product changes.
- `docs/20-product-tdd/index.md`: read alignment first for reference-sensitive technical changes.
- `docs/15-alignment/README.md`: full trigger list and explicit "do not load by default" rule.

## Proposed Owner Decision

### Impact Handshake

Canonical durable detail owner:

```text
docs/15-alignment/README.md
```

Reason:

- The handshake is a coordination protocol for risky or ambiguous mutation.
- Its fields map directly to alignment primitives: object, address, operation, boundary, state, evidence, and protocol.
- Keeping the detailed shape in alignment avoids bloating `docs/00-meta/concepts.md`.
- Root `AGENTS.md` can remain the operational entrypoint for agents.

Secondary references:

- `AGENTS.md` should keep a concise trigger and either the field list or a pointer to `docs/15-alignment/README.md`.
- `docs/00-meta/concepts.md` should define the concept and point to the canonical detail owner.
- `docs/00-meta/mode-c-execute.md` should remain a short execution pause rule.
- `docs/15-alignment/change-request-template.md` should make clear it is the fillable form of the Impact Handshake.

### Alignment Loading Rule

Canonical durable detail owner:

```text
docs/15-alignment/README.md
```

Reason:

- The README already has the complete trigger list.
- PRD and Product TDD indexes should retain short references because reference-sensitive changes often start there.
- The selective loading rule is an important performance and cognition guardrail.

## Proposed Durable Mutations

### 1. `docs/15-alignment/README.md`

Operation:

```text
clarify
```

State diff:

```text
From:
README defines alignment role, when to read, primitives, and engineering rules, but does not name Impact Handshake as the canonical operational protocol.

To:
README keeps the selective loading rule and adds an "Impact Handshake" section that names the canonical fields and explains that the change-request template is the fillable form.
```

Suggested content shape:

```markdown
## Impact Handshake

Use the Impact Handshake before mutating durable truth when blast radius is not obviously local, references are unstable, or evidence is weak.

Fields:

- Address and Object
- State Diff
- Blast Radius Forecast
- Invariants Check
- Verification

The handshake is a checkpoint, not a full implementation plan. If the fields cannot be stated concretely, return to Explore or Diagnose.

Use `change-request-template.md` when a request needs a reusable fillable structure.
```

### 2. `docs/15-alignment/change-request-template.md`

Operation:

```text
clarify
```

State diff:

```text
From:
Template contains compatible fields but does not explicitly say it is an Impact Handshake form.

To:
Template states it is the fillable form for an Impact Handshake when a request needs structured coordination.
```

Suggested content shape:

```markdown
This template is the fillable form of the Impact Handshake for requests that need structured coordination.
```

### 3. `docs/00-meta/concepts.md`

Operation:

```text
clarify
```

State diff:

```text
From:
Impact Handshake is owned by root AGENTS.md plus docs/15-alignment/.

To:
Impact Handshake is defined as a concept in 00-meta, operationally introduced by root AGENTS.md, and detailed in docs/15-alignment/README.md.
```

Suggested content shape:

```markdown
- detailed owner: `docs/15-alignment/README.md`
```

### 4. `AGENTS.md`

Operation:

```text
clarify
```

State diff:

```text
From:
AGENTS.md contains the field list and trigger.

To:
AGENTS.md keeps the operational trigger and field list, and points to docs/15-alignment/README.md for canonical coordination details when needed.
```

Rationale:

Keep the field list in root `AGENTS.md` because agents need it immediately. Add a short pointer rather than moving the field list away.

## Blast Radius Forecast

Affected durable docs:

- `AGENTS.md`
- `docs/00-meta/concepts.md`
- `docs/15-alignment/README.md`
- `docs/15-alignment/change-request-template.md`

Intentionally unaffected:

- `docs/10-prd/index.md`
- `docs/20-product-tdd/index.md`
- `docs/00-meta/mode-c-execute.md`

Reason to leave unaffected:

- PRD and Product TDD already correctly point reference-sensitive work to alignment.
- Execute SOP already correctly says to pause for Impact Handshake before non-local durable mutation.
- Changing these now would increase churn without adding routing clarity.

## Invariants

- Alignment remains opt-in, not default.
- `docs/15-alignment/` remains coordination grammar, not a product, technical, or runtime truth layer.
- Root `AGENTS.md` remains a practical operating entrypoint.
- The Impact Handshake remains a checkpoint, not a full design document.
- No product behavior, technical contract, or deployment truth changes.

## Verification

After mutation:

```text
rg -n "Impact Handshake|When To Read|MVT plus local AGENTS|change-request-template" AGENTS.md docs/00-meta docs/15-alignment docs/10-prd/index.md docs/20-product-tdd/index.md
```

Check:

- exactly one detailed Impact Handshake owner exists in `docs/15-alignment/README.md`
- root `AGENTS.md` still contains the operational trigger
- `docs/00-meta/concepts.md` points to the detailed owner
- `change-request-template.md` is explicitly tied to the handshake
- selective alignment loading remains unchanged in meaning

## Recommendation

Use the minimal mutation path:

1. Add an `Impact Handshake` section to `docs/15-alignment/README.md`.
2. Add one clarifying sentence to `docs/15-alignment/change-request-template.md`.
3. Add one owner-detail line to `docs/00-meta/concepts.md`.
4. Add one pointer sentence to `AGENTS.md`.

Do not touch PRD or Product TDD indexes in this batch.

## Open Decision For Human

Should `AGENTS.md` keep the full Impact Handshake field list, or should it only link to `docs/15-alignment/README.md`?

Recommendation: keep the field list in `AGENTS.md` and add the pointer. The root operating model should stay immediately executable.

Decision:

```text
Use the link-only AGENTS.md variant.
```

Execution status:

```text
Executed after human approval.
Durable docs to mutate:
- AGENTS.md
- docs/00-meta/concepts.md
- docs/15-alignment/README.md
- docs/15-alignment/change-request-template.md
```

## Execution Notes

- `AGENTS.md` now keeps only the operational trigger and a link to `docs/15-alignment/README.md`.
- `docs/15-alignment/README.md` now owns the detailed Impact Handshake field list.
- `docs/00-meta/concepts.md` now identifies `docs/15-alignment/README.md` as the detailed owner and root `AGENTS.md` as the operational entrypoint.
- `docs/15-alignment/change-request-template.md` now states that it is the fillable form of the Impact Handshake.

## Executed Verification

Command:

```text
rg -n "Impact Handshake|When To Read|MVT plus local AGENTS|change-request-template" AGENTS.md docs/00-meta docs/15-alignment docs/10-prd/index.md docs/20-product-tdd/index.md
```

Result:

```text
AGENTS.md keeps the trigger and links to docs/15-alignment/README.md.
docs/15-alignment/README.md contains the detailed Impact Handshake section.
docs/00-meta/concepts.md still defines the concept and points to the detailed owner.
docs/15-alignment/change-request-template.md is explicitly tied to the handshake.
docs/15-alignment/README.md still preserves the selective loading rule: "If MVT plus local AGENTS already constrain the change cheaply, do not load the substrate."
```
