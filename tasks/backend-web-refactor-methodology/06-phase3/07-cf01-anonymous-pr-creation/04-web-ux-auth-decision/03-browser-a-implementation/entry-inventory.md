# Entry inventory

- Structured `PREditor` and `PRCreateFooterActions` own the form create command.
- `NLPRForm` and `InlineNLPRForm` own natural-language create commands.
- `PRDiscoveryPanel.createOrdinaryPR` owns discovery direct create.
- `pending-wechat-action.ts` contains one create replay variant plus unrelated Join/Waitlist/Exit/Confirm/Publish
  variants; only the create variant is removed.
- Auth readiness is `ensureAuthSessionBootstrapped`; authorization is `useUserSessionStore().isAuthenticated`.
