# `6-4d` — Verification And Cut-Over

## Status

**Locally complete on 2026-07-23.**

## Objective

Prove the complete local recovery path and perform a forward-only cut-over
without historic-row or old-client compatibility work.

## Scope

- paid and all-zero settlement handoffs;
- duplicate callback, transaction rollback, retry and terminal Job behavior;
- removal of the old synchronous Trade consequence; and
- forward migration/deployment notes with no historic-row backfill.

## Exit

Every new qualifying settlement has one durable task, the old synchronous edge
is gone, and existing rows are untouched by design.
