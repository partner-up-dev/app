# `8-7.2` — Behavior And Canonical Verification Review

## Status

**Complete on 2026-07-24.**

## Objective & Hypothesis

Prove the final source tree preserves representative classic sequences and
passes the repository's complete local gates.

## Guardrails Touched

- Review classic User/Auth, PR, Commerce, Job/Notification, Analytics and
  Share/Admin-entry sequences by owner and persisted side-effect order.
- Build-only confidence is insufficient.
- Scenario runners own their database/server lifecycle; no ad-hoc duplicate
  services are started.

## Verification

- `pnpm check:static`;
- complete Backend/Web unit projects;
- complete Backend/System scenario projects;
- report-first dead-code/security output interpreted without bulk cleanup.
