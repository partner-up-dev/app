# 4-3.2 Verification And Durable Docs

## Focused Proof

- Handoff success still applies auth and removes the nonce.
- Received terminal 4xx/malformed response removes the nonce, does not apply auth, and offers fresh login rather
  than same-nonce retry.
- Thrown transport or received 5xx retains the nonce and offers retry.
- Login returnTo normalization removes OAuth-sensitive values and rejects a foreign browser origin before Backend
  applies its deployment-owned return-target validation.
- Visitor continuation removes the nonce and unblocks bootstrap.
- Legacy direct failure clears code/state and pending state and never writes a token.

## Promotion Input

With the 4-3.1 proof, this supplies the full durable rule for one-shot terminal failure and browser recovery. The
promotion remains in the root durable-doc plan and must name the transport-uncertainty exception precisely.

## Result

Focused tests cover successful handoff, received 4xx and malformed terminal bodies, 5xx and thrown transport
uncertainty, fresh-login recovery, return-target normalization, and direct callback success/failure cleanup. The
verified terminal-versus-uncertain distinction is now promoted with 4-3.1.
