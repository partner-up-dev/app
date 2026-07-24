# `8-3` Implementation Rehearsal

## Likely Branches

- **Manual Admin Commerce inputs are semantic editor values:** move them to a
  domain contract/model owner and type-check adapter mapping against the
  inferred endpoint input.
- **A type is purely transport-derived:** keep it in the adapter and introduce
  an explicit model value plus conversion; do not let the model import RPC
  inference indirectly through a renamed file.
- **The Admin PR editor is intentionally isomorphic to the request:** keep one
  model-owned draft and prove `satisfies`/mapping compatibility at the adapter.
- **Ordering only needs `items`:** define the smallest domain output and adapt
  it at the command boundary.
- **Breaking the PR cycle widens a barrel:** prefer one focused candidate/value
  module over a new aggregate index.

## Edit Batches

Each of the four owner families is one reviewable batch followed by focused
tests; run full Web gates only after all imports settle.
