# OAuth `openid` Normalisation Rehearsal

1. Provider returns a valid padded `openid`; the service produces one trimmed identifier.
2. Callback login, bind, anonymous upgrade, existing-user lookup, and profile refresh all receive that same valid
   session identifier without additional branch-local policy.
3. Provider returns only whitespace; the service rejects it as an invalid provider response before any repository
   method executes.
4. A provider user-info response still has to agree with the normalised session identifier; a mismatch remains an
   error.

The repair restores the lost *invariant*, not the retired facade: one active integration boundary validates provider
identity before domain persistence.
