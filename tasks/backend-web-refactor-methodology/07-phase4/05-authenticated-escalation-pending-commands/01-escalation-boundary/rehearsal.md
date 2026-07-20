# 4-4.1 Rehearsal

No registered handler means no navigation decision in transport. With the app handler registered, a recognised
response gets one delayed fallback. A command claim cancels that fallback and invokes the same login single-flight.
Unrecognised 401/403 responses are not intercepted. The port must not leak a token or mutate the response body.
