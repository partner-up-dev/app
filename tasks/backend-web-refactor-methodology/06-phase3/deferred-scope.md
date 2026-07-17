# Deferred Scope

The following areas are deliberately excluded until the two pilots prove the migration protocol:

- Commerce, Payment, Bill, Fulfillment and Ride Hailing provider orchestration;
- provider callback/idempotency/compensation and settlement boundaries;
- OAuth callback/handoff, global RPC/auth SCC and pending-action protocol redesign;
- WeChat/WeCom legacy service facade retirement;
- JobRunner/Notification bootstrap and runtime scheduling;
- destructive schema cleanup or additional Anchor Event removal migrations;
- security gate promotion, all-repo formatting baseline and unrelated dead-code cleanup;
- universal repository/DI/framework adoption;
- performance batching before canonical-read request/latency measurement.

Deferred does not mean ignored. Each item needs a separate packet with focused contract matrix, provider/security
or runtime evidence, and explicit start after the lower-risk slices complete.
