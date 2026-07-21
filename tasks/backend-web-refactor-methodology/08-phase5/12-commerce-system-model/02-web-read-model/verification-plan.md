# Web Read-Model Verification

## Low-Cost Characterization

1. Add focused query-client request-count tests for Checkout terminal reconciliation, cancel success, and cache key
   invalidation. Assert exact endpoint/query-key counts, not implementation calls.
2. Run the existing focused polling-predicate test as a baseline:
   `pnpm --filter @partner-up-dev/web exec vitest run src/domains/commerce/queries/useCommerce.test.ts`.
   Current result: 2 tests pass; they cover phase predicate only and do not establish request counts.
3. Use one browser/system scenario network trace for an active Ride order and a Checkout terminal return. Count
   `/orders/:id`, bill target, Bill Detail, and `PaymentTx` requests; include trigger/time labels before declaring a
   polling or mount behavior defective.
4. For the Bill list, assert the chosen summary/batch projection's request count rather than merely asserting that
   cards render.

## Exit

No read/cache source slice begins from a file-size goal. It needs one confirmed authority/request defect, a named
projection or cache-key contract, and a request-count regression test.
