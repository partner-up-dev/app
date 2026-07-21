# 5-5 Verification Plan

- provider normalization and snapshot merge: focused RideHailing unit tests;
- callback/poll race, loss, duplicate, query failure, and terminal settlement: real-database backend scenarios with
  fake CaoCao; correction behavior is proven only if its separate product slice is authorised;
- browser: one Order Detail polling journey, plus cancellation-fee confirmation where UI behavior changes;
- runtime callback edge facts are deferred to `5-7` and are never inferred from fake-provider proof.
