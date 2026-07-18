# 08A Entry Inventory

## Frozen hypotheses to verify

- Waitlist's public JSON body is the refreshed `PublicPR` only.
- The domain result may retain a `userId` for header issuance, but that field is not serialized to the client.
- Optional rotation is carried only by the shared `x-access-token` response-header channel.
- Web consumes that header through the common RPC/response transport, not a waitlist-specific parser.

## Candidate surfaces (must be refreshed by trace)

- Backend waitlist route and auth response helper.
- PR waitlist command/result and Backend waitlist scenario kit.
- Web PR waitlist mutation and shared RPC/auth response handling.
- Existing System waitlist journey.
- `docs/20-product-tdd/pr-lifecycle-contracts.md` and directly linked durable wording.

## Exit handoff

08A completes only with a source-backed body/header sequence, exact test inventory and an explicit answer to whether
08B is documentation-only. It does not change a product, runtime or durable document itself.
