# 4-3 External Callback And Topology Gaps

## Required Before Topology Change Or Legacy Retirement

1. WeChat console screenshot/export showing the current authorized domain and callback configuration.
2. Actual staging and production callback redirect chain, including the host/proto visible at the FC edge.
3. Confirmation of every direct callback producer/consumer, including any legacy frontend callback route.
4. Controlled-browser result for the real Web/API origin pair and credentialed handoff cookie behavior.
5. State-free post-rollout CORS/return-target header observation already tracked by 4-1.

## Known Name Disagreement

Historical documents and the public-origin report contain both api-app.partner-up.cn and app-api.partner-up.cn
forms, with corresponding test names. The authoritative deployed pair must be measured; source documentation is
not used to choose one by inference.

## What Continues Without These Facts

The local no-token terminal outcome, frontend recovery semantics, direct compatibility hygiene, focused tests,
and durable failure-rule promotion can continue. No callback authority, cookie topology, origin allowlist, or
legacy path removal is performed until the listed evidence arrives.
