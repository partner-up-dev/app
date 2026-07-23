# `6-5.1b-2` — Provider Diagnostic Redaction

## Status

**Superseded on 2026-07-23.** Redaction proof remains historical evidence, but
the target is removal of CaoCao stdout diagnostics, not a narrower console
schema.

## Objective

Remove CaoCao debug stdout so provider data does not enter an ad-hoc runtime
evidence channel.

## Scope

- remove response and route-query stdout diagnostics;
- negative tests asserting no stdout emission;
- preserve adapter error behavior and provider transport semantics; and
- promote the redaction boundary to deployment documentation.

## Non-Goals

- no provider outcome/retry policy;
- no actual CaoCao call; and
- no new SQL attempt/delivery log.

## Exit

The same adapter behavior emits no debug stdout.
