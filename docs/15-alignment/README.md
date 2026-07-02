# Alignment Substrate

## Role

Alignment exists only when collaboration repeatedly fails because humans and agents are not sharing the same referential system at the right granularity.

The substrate is not a new truth layer. It is the coordination grammar used when natural-language intent is still too ambiguous to constrain a risky mutation safely.

## When To Read

Read `docs/15-alignment/*` only when one or more of these are true:

- references or visual names are unstable
- object boundaries are interpreted differently
- operation words may hide different side effects
- valid interpretation depends on state or context
- evidence is still weak or blast radius is not obviously local

If MVT plus local AGENTS already constrain the change cheaply, do not load the substrate.

## What This Layer Owns

- shared object and address conventions for coordination
- calculable or constrained surface maps for repeated hot surfaces
- operation vocabulary tied to verification contracts
- request structures that make boundary, state, evidence, and protocol explicit before risky mutation

It does not own product intent, business rules, framework ontology, technical contracts, or runtime truth.

## Coordination Primitives

The substrate becomes actionable only when these primitives are explicit enough to verify:

1. Object: what kind of thing is being discussed
2. Address: where that thing lives in code or on a surface
3. Operation: what state transition is intended
4. Boundary and Invariants: what must not change
5. State / Context: when the reference and mutation are valid
6. Evidence: what objective proof justifies the change
7. Protocol: how human and agent confirm shared understanding before execution

## Impact Handshake

Use the Impact Handshake before mutating durable truth when blast radius is not obviously local, references are unstable, or evidence is weak.

Restate:

- Address and Object: what exact files, anchors, surfaces, or symbols will change
- State Diff: `From -> To`
- Blast Radius Forecast: downstream docs, modules, workflows, users, operators, or tests that could be affected
- Invariants Check: what must remain unchanged
- Verification: what concrete proof will bound side effects

The handshake is a checkpoint, not a full implementation plan. If these fields cannot be stated concretely, return to `Explore` or `Diagnose`.

Use `change-request-template.md` when a request needs a reusable fillable structure.

## Engineering Rules

### Prefer Stable Anchors Over Positional Descriptions

When natural-language references are insufficient for frequently edited surfaces, prefer stable semantic anchors in code or route structure over purely positional descriptions.

### Prefer Declarative State Diffs

Express the intended mutation as:

- `From`: current objective behavior or structure
- `To`: desired objective behavior or structure

This keeps object, operation, and constraints separate.

### Bind Verbs To Verification

Operation words are only useful when they imply a verification contract.

Examples:

- `refactor`: observable behavior stays equivalent
- `extract`: topology changes while callers remain intact and a new verification seam appears

## Current Assets

- `change-request-template.md`
- `ui-map.yaml`

`ui-map.yaml` is intentionally minimal. It remains a partial hot-surface aid, not a full UI inventory.
