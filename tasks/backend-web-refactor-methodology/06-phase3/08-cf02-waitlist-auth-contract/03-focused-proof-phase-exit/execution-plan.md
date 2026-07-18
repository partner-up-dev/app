# 08C Execution Plan

1. Convert 08A's body/header trace into one positive body-shape assertion and negative assertions for `auth`,
   `accessToken`, `role` and `userId`; preserve existing waitlist side-effect assertions.
2. Add/refresh the smallest shared-Web transport proof that a rotated `x-access-token` is consumed centrally. Do not
   create a waitlist-specific token parser.
3. Run focused Backend waitlist, Web transport and targeted System waitlist proof before broader gates.
4. Run Backend/Web type/build if tests touch their graphs, then full scenario, architecture fitness, diff/format checks
   and the final Phase-3 scope audit.
5. Update all 3-8/Phase-3 status only when every claim is recorded with current output; otherwise return to the owning
   slice with the failing evidence.
