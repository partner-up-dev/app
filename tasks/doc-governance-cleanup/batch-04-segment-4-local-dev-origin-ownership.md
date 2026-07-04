# Batch 4 Segment 4: Local Development Origin Ownership

## Covers

```text
F3-007
```

## Target Files

Primary candidate:

```text
docs/20-product-tdd/cross-unit-contracts.md
```

Reference files:

```text
AGENTS.md
docs/40-deployment/*
docs/20-product-tdd/index.md
```

Possible target after owner decision:

```text
docs/40-deployment/local-development-runtime.md
```

Only create a new deployment doc if the deployment audit shows runtime/local-origin truth lacks a durable owner.

## Objective

Decide whether Local Development Origin Contract belongs in Product TDD, deployment/runtime docs, root development workflow, or a split ownership model.

## Current Tension

The current section in `cross-unit-contracts.md` contains:

- `pnpm dev:ensure`
- portless app names
- local-only and LAN origin behavior
- frontend `/api` proxy behavior
- fake third-party integration servers
- fixed-port compatibility
- system scenario isolated ports

Some of this is cross-unit typed HTTP truth. Some is developer workflow or runtime environment truth.

## Proposed Owner Model

### Keep In Product TDD

- browser API calls stay aligned with the typed backend HTTP contract
- frontend `/api` proxy derives backend target from active frontend origin
- system scenario runtime is separate from developer portless workflow, if this shapes cross-unit verification

### Move Or Reference Elsewhere

- exact developer commands such as `pnpm dev:ensure`
- fake provider ensure commands
- LAN/fixed-port compatibility details if they are runtime workflow rather than contract truth
- foreground/terminal ergonomics if already owned by root `AGENTS.md` or deployment docs

## Required Pre-Check

Before editing durable docs:

```text
rg -n "dev:ensure|dev:portless|portless|PORTLESS_URL|fixed-port|LAN|fake provider|caocao|wechatpay|system scenario" AGENTS.md docs/20-product-tdd docs/40-deployment scripts package.json portless.json
```

Then decide:

- Product TDD only
- deployment/runtime only
- split owner with Product TDD keeping typed-origin contract and deployment/root docs keeping workflow commands

## Non-Goals

- Do not change dev scripts.
- Do not change portless behavior.
- Do not move local dev origin text before owner evidence is collected.
- Do not duplicate the same workflow command across multiple durable docs.

## Verification

```text
rg -n "Local Development Origin Contract|dev:ensure|portless|PORTLESS_URL|VITE_API_URL|system-scenario" AGENTS.md docs/20-product-tdd docs/40-deployment
git diff --check -- docs/20-product-tdd docs/40-deployment AGENTS.md tasks/doc-governance-cleanup
```

Expected result:

- Local dev origin truth has one durable owner per truth type.
- Product TDD retains only cross-unit contract material.
- Developer workflow commands remain discoverable from root onboarding.

## Execution Record

Executed in Segment 4:

- Owner evidence showed `docs/40-deployment/environments.md` already owns local portless runtime commands, LAN mode, fake provider local routes, fixed-port compatibility, and foreground readiness.
- `AGENTS.md` keeps the root developer workflow entrypoints.
- `docs/20-product-tdd/cross-unit-contracts.md` now keeps only the Local Typed Origin Contract:
  - Vite reads portless runtime origin values
  - frontend API calls stay same-origin through `/api`
  - the proxy derives backend host from active frontend `PORTLESS_URL`
  - system scenario runtime remains isolated from developer portless runtime
- No new deployment doc was created.
