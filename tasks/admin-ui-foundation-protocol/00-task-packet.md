# Admin UI Foundation Protocol Packet

## Objective & Hypothesis

Objective: Build a polyfile task packet for studying and solidifying the Admin UI foundation protocol before implementation.

Hypothesis: The current Admin friction is primarily caused by weak UI foundation contracts, not by isolated visual polish problems. The protocol needs to define layout ownership, workspace state ownership, form field primitives, action locality, mutation feedback, container semantics, and responsive density before rebuilding Admin pages such as Product Admin.

## Input Classification

- Typed input: `Artifact` now, likely `Constraint` after we promote stable decisions into frontend architecture or durable docs.
- Active mode: `Explore` -> `Solidify`.
- Current implementation status: discussion and protocol drafting only.

## Guardrails Touched

- Root `AGENTS.md`: create task packet for non-trivial work, record objective, guardrails, and verification.
- Frontend durable owner candidates:
  - `apps/frontend/src/domains/admin/ui/layout/**`
  - `apps/frontend/src/domains/admin/ui/navigation/**`
  - `apps/frontend/src/domains/admin-commerce/ui/product-management/**`
  - future Admin form component family under `apps/frontend/src/domains/admin/ui/forms/**` or a confirmed equivalent owner.
- Historical context:
  - `tasks/admin-ui-topology-audit/40-target-admin-shell-contracts.md`
  - `tasks/admin-ui-topology-audit/160-admin-two-column-shell-correction.md`

## Packet Index

- Current friction map: `10-current-friction-map.md`
- Protocol study draft: `20-admin-ui-foundation-protocol.md`
- Discussion log: `90-discussion-log.md`

## Current Agreement

- The biggest Admin UI problem is foundation-level protocol weakness.
- `PageScaffold`, form, container, navigation, action, feedback, and responsive behavior should be treated as one Admin UI foundation system.
- "Unified form field strategy" means building a series of governed Admin Form components, not only documenting input choices.
- Product Admin is a strong pilot because it exposes action locality, rail/workspace communication, repeated field primitives, missing feedback, and density issues together.

## Non-Goals

- No product-code implementation until the user explicitly says `start`.
- No broad Admin page rewrite in this packet.
- No durable docs promotion until protocol decisions become stable.

## Verification

- Packet exists as multiple focused files.
- Claims are grounded in inspected current Admin topology and Product Admin files.
- Open decisions remain explicit for discussion.
- Future implementation slices must define concrete file changes and verification before execution.
