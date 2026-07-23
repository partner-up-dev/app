# `6-3.2c-3` Plan

1. Extend the existing PR-message window fixture or add a focused scenario
   helper with one author, one subscribed recipient and a configured channel.
2. Assert raw thread GET and `POST /read-marker` leave a generic held
   reservation intact; assert semantic HTTP stale/covering behavior.
3. In Playwright, install the recipient session, wait for the dedicated visible
   thread marker and semantic route response, then query the persisted Job only
   for hidden side-effect proof.
4. Create a later source message and assert a new held generation rather than
   a replay of the released one.
5. Update `pr-messaging-contracts.md`, `notification-contracts.md`, parent
   task status and verification log only with observed evidence.
