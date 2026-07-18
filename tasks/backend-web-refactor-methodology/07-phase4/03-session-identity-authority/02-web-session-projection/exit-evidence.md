# 4-2.2 Exit Evidence

Public session role parsing is restricted to `anonymous | authenticated`. The public Pinia store no longer carries a
duplicate token; browser storage is the single token projection, while the store projects public role/user ID.
Legacy service/analytics input clears the public projection rather than being treated as authenticated. The admin
store has a local input role type and remains on its own storage/client path.

The auth bootstrap composable delegates only its register-or-restore decision to the tested coordinator and retains
the established OAuth callback/handoff deferral.
