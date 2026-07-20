# 4-5.2 Route-Entry Proof

Own focused behavior proof for the `/bills` policy: after bootstrap, anonymous WeChat begins one OAuth login and
the current navigation stops before the bills component can mount; pending handoff, non-WeChat, authenticated, and
non-opt-in branches do not redirect.
