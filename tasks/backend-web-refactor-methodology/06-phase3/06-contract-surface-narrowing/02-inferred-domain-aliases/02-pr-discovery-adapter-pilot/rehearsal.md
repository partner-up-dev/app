# 06B.2 Rehearsal — PR Discovery Adapter Contract

1. Add a PR-owned contract module that uses `import type { client }` and derives aliases from existing routes.
2. Change only model type imports to that contract module; retain model's published type aliases as facades for its
   current consumers.
3. Make query adapters re-export moved aliases where UI already imports them, without moving runtime client calls.
4. Confirm no model emits a raw transport/query type edge; run focused PR unit, then Web type/build checks.

Expected result: inference has one PR adapter owner, model files only depend on a PR contract, and runtime endpoint
calls remain inside query adapters.
