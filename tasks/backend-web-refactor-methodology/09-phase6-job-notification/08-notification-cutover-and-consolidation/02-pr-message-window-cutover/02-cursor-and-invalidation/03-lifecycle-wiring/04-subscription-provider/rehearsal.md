# `6-3.2b-3.4` Rehearsal

- Do not move all subscription kinds into PR-message policy. Other kinds retain
  their current behavior until separately owned.
- A `CLEAR` result may be a release no-op; it must still persist preference /
  credit semantics and drain legacy concrete work if the legacy contract
  requires it.
- `ADD_ONE` changes only availability. It must not call a PR message query,
  schedule history, or create a new generic job absent a later message.
