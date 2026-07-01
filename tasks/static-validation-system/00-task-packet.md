# Static Validation System

## Objective

Build a sustainable static validation system covering format, lint, type, config, dead-code, security, and build reachability without changing product behavior.

## Scope Boundary

- In scope: static-validation scripts, configs, CI gates, related `AGENTS.md` guidance, and this task packet.
- Out of scope: product/technical durable docs under `docs/10-prd/` and `docs/20-product-tdd/`.
- Documentation Token Efficiency rule for this task: keep durable docs to stable commands and operating constraints; keep evaluation notes, noisy reports, and rollout rationale in this packet.

## Current State

- Root `pnpm check:*` layers are implemented.
- Biome, ast-grep, Knip, and Semgrep are wired in.
- Knip and Semgrep remain report-first.
- Backend config checks now include custom DB lint plus `drizzle-kit check`.
- CI calls repository-owned scripts through a new static gate and updated unit gates.
- Biome pilot rules are enabled: `noFocusedTests`, `noImplicitAnyLet`.

## Packet Index

- `01-inventory.md`: pre-change coverage and gaps.
- `02-tool-boundaries.md`: tool ownership boundaries.
- `03-execution-slices.md`: completed work and remaining slices.
- `04-knip-triage.md`: Knip counts and cleanup order.
- `05-biome-pilot.md`: Biome rule decisions.
- `06-semgrep-local.md`: local Semgrep install and findings.
- `90-verification.md`: commands run, results, residual risks.

## Next Choices

1. Clean Knip dependency drift and duplicate exports.
2. Review Semgrep `execSync` and `v-html` findings.
3. Run a dedicated `useImportType` cleanup before considering promotion.
