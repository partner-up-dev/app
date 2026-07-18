# 4-1A Execution Plan

1. Add focused characterization tests for paired, untrusted, cross-environment and missing-origin CORS requests;
   add return-target cases for explicit, hostile, relative and absent inputs.
2. Introduce one narrow environment-derived origin predicate; use it for both CORS and OAuth `returnTo` rather than
   trusting `Origin` / `Referer` as configuration.
3. Preserve the current callback selection and handoff mechanics; run existing OAuth-focused units to guard this
   non-goal.
4. Run focused Backend tests, Web type/build checks and selected System scenarios.
5. Use post-deploy anonymous public preflights to confirm paired origins pass and an arbitrary origin fails.

Any discovery of an unnamed browser consumer or public alias stops the slice until it has an explicit owner.
