# `8-6.2` Implementation Rehearsal

1. Move the query-owning `PRPreviewCard` wrapper and its focused test to
   composite depth; update all callers and local architecture guidance.
2. Do not push detail queries into list pages or PR Discovery callers.
3. Introduce one focused Share command adapter surface for description
   generation and remote poster/thumbnail cache writes.
4. Replace only the three direct calls; retain current best-effort fallbacks.

If the command surface becomes a generic Share barrel, split by semantic
operation instead. The goal is a deeper endpoint owner, not a convenience
index.
