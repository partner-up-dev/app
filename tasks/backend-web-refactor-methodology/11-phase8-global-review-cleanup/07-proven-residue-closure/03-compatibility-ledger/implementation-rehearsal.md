# `8-6.3` Implementation Rehearsal

1. Delete the two proven-zero Web bridges.
2. Register official-account follow sync through a versioned
   `JobDefinition`, then remove `registerHandler`, `unregisterHandler`, the
   legacy adapter and their compatibility tests.
3. Remove the zero-consumer `deletePendingJobsByDedupe` alias.
4. Allocate the next migration prefix; drop only the two unused millisecond
   columns and remove their entity fields.
5. Remove `OPENAI_API_KEY` only because current source, CI, template and
   operator-stated FC configuration use `LLM_API_KEY`.
6. Retain the legacy CaoCao route with owner/reason/exit condition.

An unexpected reader of a candidate changes its disposition to retained; it
does not authorize adapting the reader merely to make deletion possible.
