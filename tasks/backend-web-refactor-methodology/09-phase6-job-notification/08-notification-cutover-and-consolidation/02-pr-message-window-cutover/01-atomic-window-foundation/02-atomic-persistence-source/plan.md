# `6-3.2a-2` Plan — Complete

1. Completed: introduce the named PR-message transaction adapter and
   transaction-aware repository construction.
2. Completed: keep the adapter unused by production; `6-3.2a-3`, rather than
   this child, moves the canonical helper and all three producer routes.
3. Completed: inject a failure after a real transaction-bound reservation
   write and prove the message and Job both roll back in PostgreSQL.
4. Completed: record the exact adapter/projection/legacy boundary and defer
   durable-doc promotion until source cutover is proven.
