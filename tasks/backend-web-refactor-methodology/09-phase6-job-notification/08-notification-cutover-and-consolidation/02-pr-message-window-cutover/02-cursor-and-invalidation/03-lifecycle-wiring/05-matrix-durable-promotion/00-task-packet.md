# `6-3.2b-3.5` — Lifecycle Matrix And Durable Promotion

## Status

**Locally complete.** Children 01–04 and the combined matrix have passed.
This child found no production defect requiring a new behavior change.

## Objective

Turn all local lifecycle proofs into one state-transition matrix, audit owner
edges, and update durable docs with only proven current behavior and explicit
remaining compatibility boundaries.

## Exit

Every named b3 entrance has evidence, no changed lifecycle path crosses into
Job/private Notification internals, and docs distinguish forward behavior from
legacy drain compatibility.

## Inputs Already Proven

- participant release: exact-recipient release, no rejoin replay and rollback;
- terminal transition: manual/temporal release plus generic and concrete
  dispatch terminal fences;
- admin deletion: tombstone/cursor visibility, root cascade and rollback;
- subscription HTTP: canonical `ADD_ONE` / `CLEAR` delegation and separate
  concrete historical-job drain.

The one remaining cross-entrance proof is the generic PR-message `43101`
runtime path: its owner-runtime option adapter must call the same canonical
clear transaction as HTTP, releasing held work and never replaying history on
a later credit grant.

## Delivered

- The generic `43101` proof now executes the actual Notification runtime with
  a permission-revocation channel result and verifies canonical clear,
  `CANCELED + RELEASED`, and no historical replay after restore.
- The source-specific scenarios form the lifecycle matrix; full backend
  scenario/unit/static/build gates and reverse-edge audits passed.
- Durable docs now record the source-fact invalidation rule, executor-facing
  Notification facade, terminal/tombstone/root-delete behavior, and the
  precise legacy boundary. They make no retirement claim for read-marker,
  concrete drain or delivery persistence.

See `verification-log.md` for commands, matrix membership and audit results.
