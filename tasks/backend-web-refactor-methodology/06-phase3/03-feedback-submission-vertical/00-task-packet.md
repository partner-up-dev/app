# Slice 3-3 — Feedback Submission Vertical

## Objective & Hypothesis

Use one authenticated Feedback Questionnaire submission to calibrate the target mutation topology from Browser
through Web adapter, typed HTTP, Backend use-case and Postgres. Preserve the generic feedback command and keep
PR participation gating in PR integration surfaces.

## Owned Paths

- Backend feedback controller/domain/repository/entity and focused tests.
- Web `domains/feedback` query/workflow/form plus PR feedback modal/section integration.
- `tests/scenario/pr-core/pr-detail-participation.scenario.test.ts` or a dedicated feedback System folder if the
  journey proves independently reusable.

## Non-goals

- Admin questionnaire-template management, new survey abstraction, schema migration, upload deletion lifecycle,
  anonymous feedback replay or PR create/waitlist behavior.

## Entry / Exit

- Entry: `3-1` report stable and `3-2` exited; existing opening-only System journey and Backend feedback scenario
  characterized.
- Exit: browser performs a real valid submission, DB probe proves upsert, canonical PR detail refreshes submitted
  state, errors remain retryable, and all target/full gates pass.

## Status

Verified Complete in the working tree; exit commit pending. Authorized and executed 2026-07-17 at `b674f5ca`.
Entry delta, evidence, verification and exact scope are frozen in this packet.
