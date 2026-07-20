# Route Guard Cancellation Rehearsal

1. Guard A assigns the current navigation epoch before awaiting bootstrap.
2. Guard B starts for a later route and advances the epoch while A is awaiting the shared bootstrap Promise.
3. Bootstrap resolves. A sees a stale epoch and returns without writing storage or invoking OAuth.
4. B completes under its own epoch; if it is non-opt-in it simply allows navigation.
5. A normal anonymous-WeChat `/bills` navigation with no later epoch retains the existing mark → single-flight OAuth
   → abort sequence.

The epoch check belongs after every await that precedes an effect. `router.currentRoute` alone is rejected because it
does not represent an uncommitted pending navigation.
