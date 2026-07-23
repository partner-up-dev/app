# `6-3.2b-3.3` Rehearsal

- A physical delete violates the b1 cursor fact. Use the repository's explicit
  tombstone operation and make repeated deletes idempotent/authorisation-safe
  according to the existing admin contract.
- If notification release fails, the tombstone/root cascade must roll back.
  Conversely, release may be a neutral no-op if no held reservation exists.
- The existing delete contract treats an already-hidden message as not found.
  Therefore lookup remains visible-only; `includingTombstone` is for cursor
  truth, not a reason to turn repeated delete into success.
- A generic Job row deliberately has no foreign key to PR. Root-delete proof
  must inspect the retained job row and assert `CANCELED + RELEASED`, not
  expect the cascade to erase it.
- Root delete cannot enumerate slots after cascade. Capture and lock the
  source fact first; D08 forbids inventing a PR-to-Job escape hatch for a
  hypothetical split-rollout former-recipient row.
