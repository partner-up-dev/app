# `8-6.2` Verification Log

Date: 2026-07-24

## Result

- The id-based, query-owning `PRPreviewCard` wrapper and focused test moved
  from primitive to composite depth. Its interface, route override, action
  slot, activation event, attrs and semantic test ids remain stable.
- `PRPreviewCardFrame` remains a pure presentation primitive.
- All three callers and the Discovery test mock now use the composite owner.
- One focused Share command adapter owns description generation and remote
  thumbnail/poster cache writes with Hono-inferred request bodies and shared
  Problem Details mapping.
- The two Share workflows preserve their prior description fallback and
  best-effort cache behavior.

## Focused Proof

- PR preview, Discovery caller and Share adapter:
  `3 files / 14 tests`, passed.
- Targeted Oxlint and Oxfmt passed.
- Exact searches found zero query import under PR primitives, zero
  `client.api` call in the two Share workflows and zero import of the retired
  primitive path.
- `git diff --check` passed for the owned batch.

The `8-6` integrated type/lint and PR Discovery System proof subsequently
passed; see [`../verification-log.md`](../verification-log.md).
