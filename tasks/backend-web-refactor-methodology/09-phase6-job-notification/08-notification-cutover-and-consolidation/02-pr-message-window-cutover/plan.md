# `6-3.2` Execution Plan

1. `01-atomic-window-foundation` owns transactional message + reservation
   write, generic dispatch and backend Job-window proof.
2. `02-cursor-and-invalidation` owns tombstone/cursor and the non-read-state
   release behavior for deletion, opt-out, exit and termination.
3. `03-visible-ack-compatibility` owns the semantic API, mounted-visible Web
   trigger, old `/read-marker` bridge and the cross-unit scenario.
4. Only after all three children are green may `03-legacy-state-retirement`
   propose inbox/wave/API removal.

Stop if message visibility can precede high-water commit. The fallback requires
an acknowledged-through watermark and key lock and is a design revisit, not an
implicit best-effort implementation.
