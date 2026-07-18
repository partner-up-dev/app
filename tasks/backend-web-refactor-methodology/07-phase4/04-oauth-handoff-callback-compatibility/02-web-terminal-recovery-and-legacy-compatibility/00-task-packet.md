# 4-3.2 Web Terminal Recovery And Legacy Compatibility

## Goal

Make the top-level handoff gate faithfully represent one-shot server semantics and keep the direct callback page
safe on failure. Use the design-system public components already present in the handoff surface.

## Owned Paths

- apps/web/src/processes/wechat/oauth-handoff.ts
- apps/web/src/processes/wechat/WeChatOAuthHandoffGate.vue
- apps/web/src/pages/WeChatOAuthCallbackPage.vue
- narrow tests colocated with these owners

## UX Contract

A received 4xx or malformed success body means the current handoff nonce is abandoned: remove it from the visible
URL, preserve a clear recovery surface, and offer fresh login or visitor continuation. A network exception or 5xx
preserves the nonce and permits a retry because delivery/consumption is unknown. Fresh login starts a new
state/nonce transaction; it is not a same-nonce retry.

## Guardrails

Do not remove the nonce before success, explicit visitor continuation, or confirmed terminal failure. Keep
credentials include. Do not put a token/code/state in a route, telemetry, share target, or persisted metadata.

## Completion

Complete locally on 2026-07-18. The client returns a typed success/terminal/retryable/absent outcome, the gate
offers fresh login only for a confirmed terminal nonce, and the direct callback page captures then removes
sensitive URL values before safe success/failure handling.
