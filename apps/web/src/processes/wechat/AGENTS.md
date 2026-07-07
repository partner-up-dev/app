# AGENTS.md for WeChat Processes

- Read `docs/30-unit-tdd/wechat-oauth-handoff.md` before changing OAuth login, handoff, route auto-login, or WeChat callback compatibility code.
- Keep the `wechatOAuthHandoff` query value as a nonce only. Do not place access tokens, OAuth codes, state payloads, or user credentials in route query or hash.
- The top-level handoff gate owns pending handoff resolution. Auth bootstrap and route auto-login must defer while a handoff nonce is present.
- Do not remove the nonce from the address bar before a successful handoff exchange unless the user explicitly continues as a visitor or the flow is intentionally abandoned.
- Handoff API calls must preserve `credentials: "include"`.
- When adding route/share behavior that reads `route.fullPath` or `window.location.href`, keep `wechatOAuthHandoff` and OAuth parameters out of telemetry, share targets, and persisted metadata.
