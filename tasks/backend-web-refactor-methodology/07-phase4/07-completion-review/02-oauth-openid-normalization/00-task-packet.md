# Candidate Repair — OAuth `openid` Normalisation

## Status

Complete locally. Sir authorised the source change; it now has focused provider-seam proof, focused callback
regression proof, and full Backend validation. Final Phase-close review remains owned by the parent packet.

## Objective

Make the active WeChat provider-session boundary trim a received `openid` and reject an empty normalised value before
any callback lookup, bind, upgrade, create-user, or profile request can observe it.

## Proposed Boundary

Own `apps/backend/src/services/WeChatOAuthService.ts`, a focused service test, the exact OAuth Unit TDD rule, and
Phase 4 packet evidence. The controller consumes the already-valid session value and needs no duplicated
normalisation. Do not revive the deleted facade, change user schema, alter callback topology, or mutate deployment
configuration.

## Lowest-Cost Proof

Mock the provider token response at the service seam. Prove a padded valid `openid` is returned normalised and a
whitespace-only value rejects before the callback persistence branches are reachable. Re-run focused OAuth callback
scenario plus Backend type/build.

The focused suite additionally proves a padded user-info identity matches the normalised session identity and a real
identity mismatch still rejects.
