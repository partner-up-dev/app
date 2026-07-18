# 4-2.1 Exit Evidence

The User domain now exposes an explicit `queries.ts` public category that resolves current public identity without
exporting its repository or Drizzle row. Public middleware uses that query for subject-bound public bearers; the
separate admin middleware retains its pre-existing resolver. The User anonymous-registration command no longer
imports Auth or mints a JWT. `/auth/session`, PR response issuance, and OAuth callback issuance use the public
issuer boundary without changing OAuth transport topology.

All planned backend branches have focused proof. Cross-unit promotion remained gated until 4-2.3 completed.
