# `6-4` External Evidence Request

## Status

**Closed as an implementation gate on 2026-07-23.**

- CaoCao's first-party documentation establishes the request shape and makes
  both allowance fields optional. See
  [`official-caocao-contract-review.md`](./official-caocao-contract-review.md).
- Sir accepts duplicate provider-effect risk after a lost response.
- Sir does not require old-row, old-task, or old-client compatibility
  protection for this refactor.
- Historic settled RideHailing rows are outside the forward cut-over; no
  classification/backfill is attempted.

Consequently, no production database inventory, production FC-log extraction,
jump function, vendor-console screenshot, or live provider mutation is required
to begin or complete local `6-4` source work.

## Evidence That Remains Useful But Non-Blocking

- A staging deployment can prove the FC/request-tail wake-up path and migration
  mechanics after local verification.
- The provider's current configured base URL can be checked during rollout
  because public docs list current official domains while the repository also
  contains historical fixture URLs. Existing successful provider operations
  are stronger deployment evidence than a new live fee-confirm call.
- Future observability work may query production Job state and logs, but it is
  not a Phase 6 prerequisite and must not be approximated with new console
  logging.
