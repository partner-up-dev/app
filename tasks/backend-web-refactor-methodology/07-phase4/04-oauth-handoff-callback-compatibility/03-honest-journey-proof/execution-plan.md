# 4-3.3 Execution Plan

1. Run the 4-3.1 Backend test and 4-3.2 Web test as the primary proof.
2. Inspect the scenario frontend server and Vite API configuration. Label the current proxy flow as non-topology
   proof.
3. If a distinct-origin build can be introduced narrowly, add a browser journey that verifies cookie-backed
   navigation handoff and status transition. Otherwise record the exact missing harness capability and stop.
4. Verify route/share sanitization still excludes the nonce and OAuth parameters after terminal cleanup.

## Exit

The outcome is either a faithful distinct-origin browser proof or an explicit bounded gap plus the completed
focused contract proof. Neither outcome authorizes claims about staging/production without external observation.
