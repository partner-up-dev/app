# 5-3 Verification Plan

- codec/provider constraints: focused Payment service/unit proof;
- charge/poll/callback idempotency: backend scenario with fake WeChatPay;
- checkout UX: focused Web state-machine test plus one browser journey from Bill Detail through fake client return;
- consumer cutover: import inventory, typecheck, and the named system journey before compatibility deletion.

Completed evidence is recorded in [verification-log.md](./verification-log.md).
