# Historical Next-Slice Recommendation

`5-1` recommends retaining the planned value-flow order, but narrowing 5-2:

1. **5-2 Quote-to-order admission** should include a design-only first pass
   for reusable Quote semantics, create-command idempotency, and strict
   PR/Offer concurrent uniqueness. D1 is already ratified. Do not begin its
   runtime mutation until those three implementation choices have an explicit
   proposal and low-cost proof.
2. **5-3 Bill–Payment checkout** was the best alternative first mutation if
   5-2's idempotency choice requires a wider schema/provider design. Payment
   has the strongest existing atomic slot guard, and D2 plus the canonical
   tuple are already ratified.

This preserves the numbered map while avoiding a false claim that 5-2 is a
small file-only cleanup. Sir selected the branch; `5-3` is now complete. The
current next executable slice remains independently gated in the Phase 5 slice
map.
