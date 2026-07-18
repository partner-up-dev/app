# 08A Execution Plan

1. Trace the waitlist controller from the command result through `issueResponseAuth`, separating the internal user ID
   used to mint/rotate a session from the JSON object sent by `c.json`.
2. Trace the typed client and shared Web response middleware from `x-access-token` reception to session persistence;
   establish whether any waitlist-specific auth parser exists.
3. Search the frozen durable scope for the stale “auth payload” wording and compare its claim to the source sequence.
4. Run only the narrowest existing Backend waitlist and Web transport tests identified by the trace. Do not mutate
   runtime simply to make the trace observable.
5. Record exact paths, body/header facts, proof gaps and the 08B/08C handoff. If source and behavior disagree, stop
   documentation correction and return the mismatch as a contract/security fork.

## Expected sequence

```text
Browser waitlist mutation
  -> Hono `/:id/waitlist`
  -> waitlist domain result { pr, userId }
  -> `issueResponseAuth(c, userId)` optionally sets x-access-token
  -> `c.json(result.pr)` public PR body
  -> shared Web RPC response hook consumes x-access-token
```

The trace must prove or disprove each arrow; the diagram is a hypothesis, not evidence.
