# 4-4.2 Rehearsal

An old waitlist record without a preference remains readable with the safe false default. A malformed record clears.
A handler that is not mounted cannot consume. A handler error cannot resurrect the action or trigger another replay
watch cycle. Another PR cannot claim it.
