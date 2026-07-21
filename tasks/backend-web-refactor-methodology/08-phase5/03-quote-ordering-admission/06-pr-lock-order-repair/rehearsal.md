# Rehearsal — PR Lock-Order Repair

```text
different keys, same PR/Offer
  T1: create Trade/Ride -> lock PR -> append -> insert Attempt -> commit
  T2: create Trade/Ride -> wait PR -> see active order -> typed 409 -> rollback

same key, same command
  T1: same sequence -> Attempt committed -> provider I/O once
  T2: wait PR -> active-order conflict -> re-read Attempt -> same durable
      order, either `PROCESSING` while T1 is in flight or terminal replay
```

The potentially conflicting `CreateOrderAttempt.pr_id` FK is written only
after the PR lock. The retry read occurs after the conflict is observed, so it
can see T1's committed attempt without exposing repositories to another owner.

Stop if either branch requires a generic transaction facade, a database-error
mapping blanket, or provider I/O inside the transaction.
