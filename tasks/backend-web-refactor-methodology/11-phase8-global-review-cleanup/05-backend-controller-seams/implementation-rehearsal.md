# `8-4` Implementation Rehearsal

## Decision Procedure Per Edge

1. Name the user/protocol behavior the repository call supports.
2. Identify its semantic owner and existing public command/query.
3. Extend that owner only with the minimum semantic input/output.
4. Keep HTTP/cookie/header mapping in the controller.
5. Prove response and state parity before removing the direct import.

## Failure Branches

- **A use-case needs two owners atomically:** define a named transaction Port
  only when an invariant requires it; never pass repositories/executors.
- **The new use-case mirrors CRUD:** stop and redesign around the decision or
  query projection.
- **WeChat refactor changes callback/cookie order:** revert that batch and use
  existing OAuth sequence evidence before proceeding.
- **Moving identity lookup duplicates User authority:** consume User's public
  query rather than creating PR/Auth-local lookup.
- **A controller test passes but a browser journey fails:** treat the protocol
  behavior as authoritative and repair the seam before continuing.
