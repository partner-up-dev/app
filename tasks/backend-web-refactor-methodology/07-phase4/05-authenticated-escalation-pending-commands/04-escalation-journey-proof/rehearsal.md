# 4-4.4 Rehearsal

The test must distinguish a post-auth injected pending value from a command-originated value. It must assert that the
pending intent exists before navigation and is consumed only after handoff/session application and PR handler
readiness. A terminal handoff failure must not run the continuation.
