# `6-3.3b` Mental Rehearsal

- A claimed Job finishes after the inventory snapshot: lease fencing and a
  second zero-count snapshot prevent handler removal based on stale data.
- A legacy payload fails validation: retain it for diagnosis or archive under
  policy; never coerce it into a generic Job on guesswork.
- A cancellation deletes a pending row but provider I/O has already begun:
  record the ordinary at-least-once limitation; do not claim recall.
