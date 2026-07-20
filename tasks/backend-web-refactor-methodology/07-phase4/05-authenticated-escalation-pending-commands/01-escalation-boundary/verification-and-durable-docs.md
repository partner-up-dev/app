# 4-4.1 Verification And Promotion

Use fake timers and response identity in focused tests. Check the import graph by source search: `lib/rpc` may import
the pure classifier but not OAuth login/auth-error/process implementation. Promotion waits for 4-4.4.

## Result

Complete. RPC/classifier/coordinator/auth-error focused tests pass (10 tests); source search confirms `lib/rpc` has
no OAuth/process import. The cross-unit transport/process rule is promoted to the shared session/error contract.
