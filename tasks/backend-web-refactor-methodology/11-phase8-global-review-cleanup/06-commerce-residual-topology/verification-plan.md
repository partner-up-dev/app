# `8-5` Verification Plan

- exact static and dynamic-inclusive import graph before/after;
- Bill checkout-target and Trade Rental flow unit tests;
- RideHailing listing/cancellation/settlement/fee-confirmation tests;
- Backend Commerce scenarios using real Postgres;
- selected ordering/payment/System scenarios;
- `dispatchBinding` write/read/reference audit and, if source changes, parity
  fixtures against persisted records;
- architecture fitness; and
- canonical static/Backend gates proportional to the actual mutation.

The test plan proves owner direction and behavior. It does not use lower SCC
count as a substitute for the classic use-case sequences.
