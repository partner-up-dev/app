# 4-4.4 Execution Plan

Start anonymous at a known PR action, observe `AUTHENTICATED_REQUIRED`, follow the mock OAuth callback/handoff
sequence, and verify the restored PR continuation. Prefer join first because its gate is observable. If the scenario
runner cannot faithfully carry browser cookie handoff, use the Backend scenario plus browser process proof and
record the exact gap rather than fabricating a journey.
