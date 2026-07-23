# `6-3.1f-02` Rehearsal

- The caller supplies only semantic facts and a frozen roster. Notification
  owns filtering for active user/OpenID/preference/credit and all Job details.
- The resolver is injected with a transaction executor rather than silently
  falling back to global repositories; otherwise a “transactional” snapshot
  can observe a different committed world.
- A failed writer throws through the caller's transaction. It must not turn
  into a best-effort post-commit notification.
