# 4-3.1 Backend Terminal Handoff Semantics

## Goal

Turn expected public-identity rejection at the OAuth handoff boundary into a stable, safe terminal result. Preserve
the public-session eligibility rule and the navigation/direct callback split.

## Owned Paths

- apps/backend/src/controllers/wechat.controller.ts
- the smallest focused Backend OAuth scenario/unit proof path selected after test-seam inspection
- this subtask folder and the 4-3 exit evidence

## Explicit Non-Goals

No changes to OAuth provider configuration, callback URL resolution, CORS, frontend origin, cookie flags, schema,
auth middleware ownership, or public-session eligibility. Do not make a non-public user issue a public token.

## Entry Contract

The handoff clears its cookie before validation. A missing/expired/mismatched nonce and a user that cannot receive
public auth must yield a ProblemDetails no-token HTTP result: no auth body, no accessToken, and no x-access-token
header. A bind-success return target must be assembled only after the corresponding completion eligibility check.

## Completion

Complete locally on 2026-07-18. The controller emits stable no-store Problem Details for terminal handoff failures,
suppresses response tokens on expected handoff/callback/bind failure paths, preserves direct JSON success/error
compatibility, and awaits callback completion so direct-path rejection is adapted rather than escaping to the
global error handler.
