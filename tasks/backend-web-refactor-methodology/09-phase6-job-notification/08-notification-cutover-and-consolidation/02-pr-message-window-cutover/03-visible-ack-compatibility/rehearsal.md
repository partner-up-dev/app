# `6-3.2c` Rehearsal

- A TanStack query success is not render proof: the route workflow observes the
  response cursor only after a post-render watcher and `nextTick`; before
  mount, after unmount, or while the document is hidden it makes no request.
- `document.visibilityState !== "visible"` means no ACK, even if data is
  cached. A later `visibilitychange` to visible retries the current response
  cursor without refetching or fabricating a newer cursor.
- The first transient error makes exactly one same-cursor retry. Success, not
  request start, advances the local acknowledged cursor; a later response
  cursor may start a new attempt. A stale `200` is still success because the
  browser has not seen the newer coalesced cursor.
- PR validates an all-row cursor before Notification sees it, so a tombstoned
  high-water remains acknowledgeable. A visible-only lookup would make an
  already-rendered valid cursor impossible after administrative removal.
- Schedule and ACK serialize on Notification's private creation key. If ACK
  wins, a later source message opens a later generation; if source wins, the
  same rendered cursor is stale and cannot release unseen work.
- An old client can update legacy inbox state but cannot suppress a generic
  reservation; a bounded extra reminder is safer than a hidden fetch ACK.
