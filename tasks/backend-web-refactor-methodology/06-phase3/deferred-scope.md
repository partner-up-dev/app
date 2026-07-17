# Deferred Scope

The following areas are deliberately excluded from Phase 3 and will receive separately authorized phases after
CF-01/CF-02 close:

- Commerce, Payment, Bill, Fulfillment and Ride Hailing provider orchestration;
- provider callback/idempotency/compensation and settlement boundaries;
- User/Auth, including OAuth callback/handoff, global RPC/auth SCC and pending-action protocol redesign;
- WeChat/WeCom legacy service facade retirement;
- JobRunner/Notification bootstrap and runtime scheduling;
- destructive schema cleanup or additional Anchor Event removal migrations;
- security gate promotion, all-repo formatting baseline and unrelated dead-code cleanup;
- universal repository/DI/framework adoption;
- performance batching before canonical-read request/latency measurement.

Deferred does not mean ignored. The ordered phase boundaries are recorded in `../program-roadmap.md`. Each future
phase needs its own poly-file packet, focused contract matrix, provider/security or runtime evidence, and explicit
entry authorization; Phase 3 execution does not authorize those mutations.
