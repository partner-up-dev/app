# 4-0C — Cross-Unit Identity Journeys

## Status

Complete. See [`journey-map.md`](./journey-map.md) for current proof, coverage boundaries and the security stop
branch.

## Owned Question

Trace public-user identity continuity from browser action through Web transport, Backend endpoints/session state and
back to browser state. Compare every observed assertion to its Product/Unit TDD owner.

## Required Journeys

1. anonymous visit and UUID restoration;
2. authenticated bootstrap and `x-access-token` rotation;
3. OAuth callback → cookie/nonce handoff → Web exchange;
4. authenticated-required command → command-owned pending replay or intentional no-replay.

## Non-Goals

No external provider exercise as a default; no new browser scenario; no broad replay redesign.
